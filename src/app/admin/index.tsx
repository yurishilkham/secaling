import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { type Announcement, AnnouncementCard } from '@/components/announcement-card';
import { type Report, ReportCard } from '@/components/report-card';
import { AccessGuard } from '@/components/ui/access-guard';
import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { CategoryFilterRow, type CategoryFilterValue } from '@/components/ui/category-filter-row';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterChip } from '@/components/ui/filter-chip';
import { InlineBanner } from '@/components/ui/inline-banner';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { StatusControl } from '@/components/ui/status-control';
import { Surface } from '@/components/ui/surface';
import { CATEGORY_KEYS } from '@/constants/categories';
import { Radius, Spacing } from '@/constants/theme';
import { type ReportStatus } from '@/constants/report-status';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReportStatus } from '@/hooks/use-report-status';
import { useAuth } from '@/lib/auth';
import { friendlyError, type FriendlyError } from '@/lib/errors';
import { buangSaluran, namaSaluranUnik } from '@/lib/realtime';
import { PILIH_LAPORAN_DENGAN_PELAPOR, supabase } from '@/lib/supabase';

/** Apa yang sedang menunggu konfirmasi hapus. */
type PendingDelete =
  | { kind: 'report'; item: Report }
  | { kind: 'announcement'; item: Announcement }
  | null;

type StatusFilterKey = 'belum-selesai' | 'semua' | ReportStatus;

const STATUS_FILTERS: { key: StatusFilterKey; label: string }[] = [
  { key: 'belum-selesai', label: 'Perlu Ditangani' },
  { key: 'baru', label: 'Baru' },
  { key: 'ditangani', label: 'Sedang Ditangani' },
  { key: 'selesai', label: 'Selesai' },
  { key: 'semua', label: 'Semua' },
];

export default function AdminIndexScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { profile, loading, session } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const [pending, setPending] = useState<PendingDelete>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [failure, setFailure] = useState<FriendlyError | null>(null);

  // Bulk pilih laporan
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkAsk, setBulkAsk] = useState<ReportStatus | null>(null);

  /**
   * Penyaring status. Bawaannya menampilkan yang BELUM SELESAI.
   *
   * Ini keputusan penting untuk perangkat desa: yang mereka butuhkan tiap hari
   * adalah daftar pekerjaan yang belum tuntas, bukan seluruh riwayat laporan
   * sejak app dipasang. Kalau bawaannya "semua", laporan baru akan tertimbun
   * di bawah laporan lama yang sudah selesai.
   */
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('belum-selesai');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<CategoryFilterValue>('semua');
  const [sortKey, setSortKey] = useState<'terbaru' | 'terlama' | 'judul'>('terbaru');
  const [hideArsip, setHideArsip] = useState(false);

  const { changeStatus, savingId, statusFailure, clearStatusFailure } = useReportStatus();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function doBulkStatus() {
    if (!bulkAsk || selected.size === 0 || !session) return;
    const ids = Array.from(selected);
    setBulkAsk(null);
    setBulkSaving(true);
    setFailure(null);
    const now = new Date().toISOString();
    const { error, data } = await supabase
      .from('reports')
      .update({
        status: bulkAsk,
        status_changed_at: now,
        status_changed_by: session.user.id,
      })
      .in('id', ids)
      .select('id');
    setBulkSaving(false);
    if (error) {
      setFailure(friendlyError(error, 'bulk-status'));
      return;
    }
    // Cek yang benar-benar terupdate (RLS bisa diam-diam skip)
    const updatedIds = new Set((data ?? []).map((r: { id: string }) => r.id));
    if (updatedIds.size === 0) {
      setFailure({
        title: 'Tidak diizinkan',
        message: 'Perubahan status dibatasi untuk perangkat desa. Coba masuk ulang.',
        retryable: false,
      });
      return;
    }
    if (updatedIds.size < ids.length) {
      setFailure({
        title: 'Sebagian gagal',
        message: `Hanya ${updatedIds.size} dari ${ids.length} laporan yang berubah. Coba lagi untuk sisanya.`,
        retryable: true,
      });
    }
    setReports((prev) =>
      prev.map((x) =>
        updatedIds.has(x.id) ? { ...x, status: bulkAsk as ReportStatus, status_changed_at: now } : x,
      ),
    );
    // Hapus yang sudah selesai dari pilihan
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of updatedIds) next.delete(id);
      return next;
    });
    if (updatedIds.size === ids.length) setSelectMode(false);
  }

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const [r, a] = await Promise.all([
      supabase
        .from('reports')
        .select(PILIH_LAPORAN_DENGAN_PELAPOR)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('announcements')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (!mounted.current) return;

    /**
     * Ini kegagalan paling berbahaya di seluruh app versi lama.
     *
     * Kode sebelumnya menulis `if (!r.error) setReports(...)` lalu
     * `setLoadingData(false)` tanpa syarat, sehingga gangguan jaringan tampil
     * sebagai "Belum ada laporan" — perangkat desa akan yakin tidak ada
     * laporan masuk padahal sebenarnya ada dan belum ditangani.
     */
    if (r.error && a.error) {
      setError(r.error);
      setLoadingData(false);
      return;
    }

    setError(null);
    if (!r.error) setReports((r.data ?? []) as Report[]);
    if (!a.error) setAnnouncements((a.data ?? []) as Announcement[]);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin') load();
  }, [load, profile?.role]);

  // Realtime untuk edit pengumuman & status laporan (bulk) — tanpa refresh
  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const channel = supabase
      .channel(namaSaluranUnik('admin-realtime'))
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reports' },
        (payload) => {
          const row = payload.new as Report;
          if (!mounted.current) return;
          setReports((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, ...row } : r)),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'announcements' },
        (payload) => {
          const row = payload.new as Announcement;
          if (!mounted.current) return;
          setAnnouncements((prev) =>
            prev.map((a) => (a.id === row.id ? { ...a, ...row } : a)),
          );
        },
      )
      .subscribe();
    return () => {
      buangSaluran(channel);
    };
  }, [profile?.role]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function retry() {
    setLoadingData(true);
    setError(null);
    load();
  }

  async function confirmDelete() {
    if (!pending) return;

    const { kind, item } = pending;
    setPending(null);
    setDeletingId(item.id);
    setFailure(null);

    const table = kind === 'report' ? 'reports' : 'announcements';
    const { error: deleteError } = await supabase.from(table).delete().eq('id', item.id);

    if (!mounted.current) return;
    setDeletingId(null);

    if (deleteError) {
      setFailure(friendlyError(deleteError, `delete-${kind}`));
      return;
    }

    if (kind === 'report') setReports((prev) => prev.filter((x) => x.id !== item.id));
    else setAnnouncements((prev) => prev.filter((x) => x.id !== item.id));
  }

  // Laporan yang belum tuntas — hitung dulu sebelum gate (hook harus di atas early return)
  const belumSelesai = reports.filter((r) => r.status !== 'selesai');

  const laporanStatusFiltered =
    statusFilter === 'semua'
      ? reports
      : statusFilter === 'belum-selesai'
        ? belumSelesai
        : reports.filter((r) => r.status === statusFilter);

  const catCounts: Partial<Record<CategoryFilterValue, number>> = {
    semua: laporanStatusFiltered.length,
  };
  for (const k of CATEGORY_KEYS) {
    catCounts[k] = laporanStatusFiltered.filter((r) => r.category === k).length;
  }

  const q = search.trim().toLowerCase();
  const laporanTampil = useMemo(() => {
    let out = laporanStatusFiltered;
    if (hideArsip) {
      // eslint-disable-next-line react-hooks/purity
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      out = out.filter((r) => !(r.status === 'selesai' && new Date(r.created_at).getTime() < cutoff));
    }
    if (catFilter !== 'semua') out = out.filter((r) => r.category === catFilter);
    if (q) {
      out = out.filter((r) => {
        const hay = `${r.title} ${r.description} ${r.location_name ?? ''} ${r.profiles?.full_name ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (sortKey === 'terlama') {
      return [...out].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    if (sortKey === 'judul') return [...out].sort((a, b) => a.title.localeCompare(b.title));
    return [...out].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [laporanStatusFiltered, hideArsip, catFilter, q, sortKey]);

  const weeklyText = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const seven = reports.filter((r) => now - new Date(r.created_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;
    const prev = reports.filter((r) => {
      const t = now - new Date(r.created_at).getTime();
      return t >= 7 * 24 * 60 * 60 * 1000 && t < 14 * 24 * 60 * 60 * 1000;
    }).length;
    const diff = seven - prev;
    const trend = diff === 0 ? 'tetap' : diff > 0 ? `naik ${diff}` : `turun ${Math.abs(diff)}`;
    return `7 hari: ${seven} laporan (${trend} vs minggu lalu)`;
  }, [reports]);

  // --- Sedang memuat identitas ---
  if (loading) {
    return (
      <Screen noTabBar>
        <View style={styles.loadingWrap}>
          <Skeleton width="45%" height={32} />
          <Skeleton height={56} radius={Radius.md} />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  // --- Bukan perangkat desa ---
  if (profile?.role !== 'admin') {
    return (
      <AccessGuard
        icon="lock-closed"
        tone="danger"
        title="Halaman Khusus Perangkat Desa"
        message="Halaman ini hanya bisa dibuka oleh perangkat desa. Kalau menurut Anda seharusnya bisa, hubungi kepala desa."
      >
        <BackButton label="Kembali" />
      </AccessGuard>
    );
  }

  return (
    <Screen
      noTabBar
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primaryText}
          colors={[colors.primaryText]}
        />
      }>
      <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
        <BackButton label="Keluar Mode Admin" />
        {/* Banner tipis — penanda mode perangkat desa, bukan hiasan. Warga yang
            jarang buka admin tidak perlu, tapi 3 perades yang cek sewaktu-waktu
            perlu tahu bahwa aksi hapus/ubah status di bawah ini langsung terlihat
            warga. Sengaja tipis (caption + icon 16) supaya tidak memakan ruang. */}
        <View
          style={[
            styles.modeBanner,
            { backgroundColor: colors.primarySoft, borderColor: colors.primaryText },
          ]}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primaryText} />
          <AppText variant="caption" color="primary">
            Mode Perangkat Desa — perubahan di sini terlihat warga
          </AppText>
        </View>
        <AppText variant="title" color="text" heading>
          Menu Admin
        </AppText>
        <AppText variant="body" color="textSecondary">
          Kelola laporan warga dan pengumuman desa.
        </AppText>
      </Animated.View>

      {failure ? (
        <InlineBanner
          tone="error"
          message={failure.message}
          onDismiss={() => setFailure(null)}
        />
      ) : null}

      {statusFailure ? (
        <InlineBanner
          tone="error"
          message={statusFailure.message}
          onDismiss={clearStatusFailure}
        />
      ) : null}

      <Animated.View entering={FadeInDown.delay(50).duration(320)}>
        <Surface tone="card" radius={Radius.lg} style={styles.summary}>
          <View style={styles.summaryItem}>
            <AppText variant="display" color="text">
              {belumSelesai.length}
            </AppText>
            <AppText variant="caption" color="textMuted" align="center">
              Perlu Ditangani
            </AppText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.summaryItem}>
            <AppText variant="display" color="text">
              {reports.length}
            </AppText>
            <AppText variant="caption" color="textMuted" align="center">
              Total Laporan
            </AppText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.summaryItem}>
            <AppText variant="display" color="text">
              {announcements.length}
            </AppText>
            <AppText variant="caption" color="textMuted" align="center">
              Pengumuman
            </AppText>
          </View>
        </Surface>
      </Animated.View>

      {/* Dashboard mini — kategori & 7 hari */}
      {!loadingData && reports.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(65).duration(320)}>
          <Surface tone="card" radius={Radius.lg} style={styles.dashboard}>
            <SectionHeader
              icon={<Ionicons name="stats-chart" size={20} color={colors.primaryText} />}
              title="Ringkasan"
            />
            {/* Kategori */}
            <View style={styles.dashboardCats}>
              {CATEGORY_KEYS.map((k) => {
                const count = reports.filter((r) => r.category === k).length;
                if (count === 0) return null;
                return (
                  <View key={k} style={styles.dashboardCatRow}>
                    <AppText variant="caption" color="text" style={styles.dashboardCatLabel}>
                      {k}
                    </AppText>
                    <View style={[styles.dashboardBarTrack, { backgroundColor: colors.divider }]}>
                      <View
                        style={[
                          styles.dashboardBarFill,
                          {
                            width: `${Math.max(8, (count / Math.max(1, reports.length)) * 100)}%`,
                            backgroundColor: colors.primaryText,
                          },
                        ]}
                      />
                    </View>
                    <AppText variant="caption" color="textMuted" style={styles.dashboardCatCount}>
                      {count}
                    </AppText>
                  </View>
                );
              })}
            </View>
            {/* 7 hari */}
            <View style={styles.dashboard7}>
              <AppText variant="caption" color="textMuted">
                {weeklyText}
              </AppText>
            </View>
          </Surface>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(80).duration(320)}>
        <Button
          title="Tulis Pengumuman"
          size="large"
          onPress={() => router.push('/admin/pengumuman-baru')}
          icon={<Ionicons name="create-outline" size={24} color={colors.onPrimary} />}
        />
      </Animated.View>

      {/* Toggle mode pilih massal — mengurangi 20 tap jadi 1 */}
      {!loadingData && reports.length > 0 ? (
        <View style={styles.bulkToggleRow}>
          <Button
            title={selectMode ? 'Selesai Pilih' : `Pilih Laporan (${reports.length})`}
            variant={selectMode ? 'secondary' : 'outline'}
            onPress={() => {
              if (selectMode) {
                setSelected(new Set());
                setSelectMode(false);
              } else setSelectMode(true);
            }}
            icon={
              <Ionicons
                name={selectMode ? 'close-circle-outline' : 'checkbox-outline'}
                size={22}
                color={selectMode ? colors.primaryText : colors.primaryText}
              />
            }
          />
          {selectMode ? (
            <View style={styles.bulkToggleActions}>
              <Button
                title="Pilih Semua Tampil"
                variant="ghost"
                onPress={() => {
                  const ids = laporanTampil.map((r) => r.id);
                  setSelected(new Set(ids));
                }}
              />
              <Button
                title="Bersihkan"
                variant="ghost"
                onPress={() => setSelected(new Set())}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {selectMode && selected.size > 0 ? (
        <Surface tone="card" radius={Radius.lg} style={styles.bulkBar}>
          <AppText variant="bodyStrong" color="text">
            {selected.size} terpilih
          </AppText>
          <AppText variant="caption" color="textMuted">
            Ubah status sekaligus — tanpa harus buka satu-satu
          </AppText>
          <View style={styles.bulkBtns}>
            <Button
              title="Baru"
              variant="outline"
              onPress={() => setBulkAsk('baru')}
              loading={bulkSaving}
              style={styles.bulkBtn}
            />
            <Button
              title="Ditangani"
              variant="outline"
              onPress={() => setBulkAsk('ditangani')}
              loading={bulkSaving}
              style={styles.bulkBtn}
            />
            <Button
              title="Selesai"
              onPress={() => setBulkAsk('selesai')}
              loading={bulkSaving}
              style={styles.bulkBtn}
            />
          </View>
        </Surface>
      ) : null}

      {error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : (
        <>
          <Animated.View entering={FadeInDown.delay(110).duration(320)} style={styles.section}>
            <SectionHeader
              icon={<Ionicons name="warning" size={22} color={colors.danger} />}
              title={`Laporan Warga (${laporanTampil.length})`}
              accent={colors.danger}
            />

            {/* Penyaring status. Bawaannya "Perlu Ditangani" — daftar pekerjaan
                hari ini, bukan seluruh riwayat. */}
            {!loadingData && reports.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                accessibilityRole="tablist">
                {STATUS_FILTERS.map((f) => {
                  const jumlah =
                    f.key === 'semua'
                      ? reports.length
                      : f.key === 'belum-selesai'
                        ? belumSelesai.length
                        : reports.filter((r) => r.status === f.key).length;
                  return (
                    <FilterChip
                      key={f.key}
                      label={f.label}
                      count={jumlah}
                      active={statusFilter === f.key}
                      onPress={() => setStatusFilter(f.key)}
                      accessibilityLabel={`${f.label}, ${jumlah} laporan`}
                    />
                  );
                })}
              </ScrollView>
            ) : null}

            {/* P1: cari + kategori + urut */}
            {!loadingData && reports.length > 0 ? (
              <View style={styles.adminFilters}>
                <Input
                  placeholder="Cari judul, isi, lokasi, pelapor…"
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                />
                <CategoryFilterRow value={catFilter} onChange={setCatFilter} counts={catCounts} />
                <View style={styles.sortRow}>
                  <AppText variant="caption" color="textMuted">
                    Urut:
                  </AppText>
                  <FilterChip
                    label="Terbaru"
                    active={sortKey === 'terbaru'}
                    onPress={() => setSortKey('terbaru')}
                  />
                  <FilterChip
                    label="Terlama"
                    active={sortKey === 'terlama'}
                    onPress={() => setSortKey('terlama')}
                  />
                  <FilterChip
                    label="Judul A-Z"
                    active={sortKey === 'judul'}
                    onPress={() => setSortKey('judul')}
                  />
                  <FilterChip
                    label="Arsip >30h"
                    active={hideArsip}
                    onPress={() => setHideArsip((v) => !v)}
                  />
                </View>
                {q || catFilter !== 'semua' || hideArsip ? (
                  <AppText variant="caption" color="textMuted">
                    {`Menampilkan ${laporanTampil.length} dari ${laporanStatusFiltered.length} laporan`}
                    {q ? ` untuk "${search.trim()}"` : ''}
                    {hideArsip ? ' · arsip >30 hari disembunyikan' : ''}
                  </AppText>
                ) : null}
              </View>
            ) : null}

            {loadingData ? (
              <View style={styles.list}>
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : laporanTampil.length === 0 ? (
              <EmptyState
                icon="shield-checkmark-outline"
                title={
                  reports.length === 0
                    ? 'Belum ada laporan'
                    : statusFilter === 'belum-selesai'
                      ? 'Semua laporan sudah selesai'
                      : 'Tidak ada laporan di kelompok ini'
                }
                description={
                  reports.length === 0
                    ? 'Kalau warga mengirim laporan, Anda akan melihatnya di sini.'
                    : statusFilter === 'belum-selesai'
                      ? 'Tidak ada yang perlu ditangani sekarang. Kerja bagus.'
                      : 'Coba pilih kelompok lain di atas.'
                }
                action={
                  reports.length > 0 && statusFilter !== 'semua'
                    ? { label: 'Lihat Semua', onPress: () => setStatusFilter('semua') }
                    : undefined
                }
              />
            ) : (
              <View style={styles.list}>
                {laporanTampil.map((r) => {
                  const checked = selected.has(r.id);
                  return (
                    <View key={r.id} style={styles.adminReport}>
                      {selectMode ? (
                        <Pressable
                          onPress={() => toggleSelect(r.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          style={({ pressed }) => [
                            styles.checkRow,
                            {
                              backgroundColor: checked ? colors.primarySoft : colors.card,
                              borderColor: checked ? colors.primaryText : colors.border,
                              opacity: pressed ? 0.85 : 1,
                            },
                          ]}>
                          <View
                            style={[
                              styles.checkBox,
                              {
                                backgroundColor: checked ? colors.primaryText : 'transparent',
                                borderColor: checked ? colors.primaryText : colors.borderStrong,
                              },
                            ]}>
                            {checked ? (
                              <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
                            ) : null}
                          </View>
                          <AppText variant="caption" color={checked ? 'primary' : 'textMuted'}>
                            {checked ? 'Terpilih' : 'Pilih'}
                          </AppText>
                          <AppText variant="caption" color="textMuted" style={styles.checkTitle} numberOfLines={1}>
                            {r.title}
                          </AppText>
                        </Pressable>
                      ) : null}
                      <ReportCard
                        report={r}
                        onDelete={() => setPending({ kind: 'report', item: r })}
                        deleting={deletingId === r.id}
                      />
                      {!selectMode ? (
                        <StatusControl
                          current={r.status}
                          saving={savingId === r.id}
                          onChange={async (next) => {
                            const ok = await changeStatus(r.id, next);
                            if (ok) {
                              setReports((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? {
                                        ...x,
                                        status: next,
                                        status_changed_at: new Date().toISOString(),
                                      }
                                    : x,
                                ),
                              );
                            }
                          }}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(320)} style={styles.section}>
            <SectionHeader
              icon={<Ionicons name="megaphone" size={22} color={colors.primaryText} />}
              title={`Pengumuman (${announcements.length})`}
            />

            {loadingData ? (
              <View style={styles.list}>
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : announcements.length === 0 ? (
              <EmptyState
                icon="megaphone-outline"
                title="Belum ada pengumuman"
                description="Tulis pengumuman pertama supaya warga mendapat informasi resmi desa."
                action={{
                  label: 'Tulis Pengumuman',
                  onPress: () => router.push('/admin/pengumuman-baru'),
                }}
              />
            ) : (
              <View style={styles.list}>
                {announcements.map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    announcement={a}
                    onEdit={() => router.push(`/admin/pengumuman/${a.id}` as never)}
                    onDelete={() => setPending({ kind: 'announcement', item: a })}
                    deleting={deletingId === a.id}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        </>
      )}

      <ConfirmSheet
        visible={!!pending}
        title={pending?.kind === 'report' ? 'Hapus laporan ini?' : 'Hapus pengumuman ini?'}
        message={
          pending
            ? `"${pending.item.title}" akan hilang dari daftar dan tidak bisa dikembalikan.`
            : ''
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Jangan Hapus"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />

      <ConfirmSheet
        visible={!!bulkAsk}
        title={
          bulkAsk === 'selesai'
            ? `Tandai ${selected.size} laporan selesai?`
            : bulkAsk === 'ditangani'
              ? `Tandai ${selected.size} laporan sedang ditangani?`
              : `Tandai ${selected.size} laporan baru?`
        }
        message="Perubahan akan langsung terlihat warga di Beranda."
        confirmLabel="Ya, Ubah"
        cancelLabel="Batal"
        loading={bulkSaving}
        onConfirm={doBulkStatus}
        onCancel={() => setBulkAsk(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  header: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryDivider: {
    width: 1.5,
    alignSelf: 'stretch',
  },
  section: {
    gap: Spacing.md,
  },
  list: {
    gap: Spacing.md,
  },
  filterRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  adminReport: {
    gap: Spacing.sm,
  },
  bulkToggleRow: {
    gap: Spacing.sm,
  },
  bulkToggleActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bulkBar: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  bulkBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bulkBtn: {
    flex: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTitle: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  adminFilters: {
    gap: Spacing.md,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  dashboard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  dashboardCats: {
    gap: Spacing.sm,
  },
  dashboardCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dashboardCatLabel: {
    width: 90,
  },
  dashboardBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  dashboardBarFill: {
    height: 10,
    borderRadius: 999,
  },
  dashboardCatCount: {
    width: 28,
    textAlign: 'right',
  },
  dashboard7: {
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderColor: 'transparent',
  },
});
