import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { type Announcement, AnnouncementCard } from '@/components/announcement-card';
import { type Report, ReportCard } from '@/components/report-card';
import { AccessGuard } from '@/components/ui/access-guard';
import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineBanner } from '@/components/ui/inline-banner';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { StatusControl } from '@/components/ui/status-control';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { type ReportStatus } from '@/constants/report-status';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReportStatus } from '@/hooks/use-report-status';
import { useAuth } from '@/lib/auth';
import { friendlyError, type FriendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

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
  const { profile, loading } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const [pending, setPending] = useState<PendingDelete>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [failure, setFailure] = useState<FriendlyError | null>(null);

  /**
   * Penyaring status. Bawaannya menampilkan yang BELUM SELESAI.
   *
   * Ini keputusan penting untuk perangkat desa: yang mereka butuhkan tiap hari
   * adalah daftar pekerjaan yang belum tuntas, bukan seluruh riwayat laporan
   * sejak app dipasang. Kalau bawaannya "semua", laporan baru akan tertimbun
   * di bawah laporan lama yang sudah selesai.
   */
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('belum-selesai');

  const { changeStatus, savingId, statusFailure, clearStatusFailure } = useReportStatus();

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
        .select('*, profiles(full_name)')
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

  // Laporan yang belum tuntas — inilah daftar pekerjaan perangkat desa.
  const belumSelesai = reports.filter((r) => r.status !== 'selesai');

  const laporanTampil =
    statusFilter === 'semua'
      ? reports
      : statusFilter === 'belum-selesai'
        ? belumSelesai
        : reports.filter((r) => r.status === statusFilter);

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
        <BackButton label="Profil" />
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

      <Animated.View entering={FadeInDown.delay(80).duration(320)}>
        <Button
          title="Tulis Pengumuman"
          size="large"
          onPress={() => router.push('/admin/pengumuman-baru')}
          icon={<Ionicons name="create-outline" size={24} color={colors.onPrimary} />}
        />
      </Animated.View>

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
                  const active = statusFilter === f.key;
                  const jumlah =
                    f.key === 'semua'
                      ? reports.length
                      : f.key === 'belum-selesai'
                        ? belumSelesai.length
                        : reports.filter((r) => r.status === f.key).length;

                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          try {
                            Haptics.selectionAsync();
                          } catch {}
                        }
                        setStatusFilter(f.key);
                      }}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${f.label}, ${jumlah} laporan`}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active ? colors.primary : colors.card,
                          borderColor: active ? colors.primary : colors.borderStrong,
                        },
                      ]}>
                      {active ? (
                        <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
                      ) : null}
                      <AppText
                        variant="label"
                        rawColor={active ? colors.onPrimary : colors.textSecondary}>
                        {f.label}
                      </AppText>
                      <View
                        style={[
                          styles.filterCount,
                          {
                            backgroundColor: active
                              ? 'rgba(255,255,255,0.22)'
                              : colors.background,
                          },
                        ]}>
                        <AppText
                          variant="caption"
                          rawColor={active ? colors.onPrimary : colors.textSecondary}>
                          {jumlah}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
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
                {laporanTampil.map((r) => (
                  <View key={r.id} style={styles.adminReport}>
                    <ReportCard
                      report={r}
                      onDelete={() => setPending({ kind: 'report', item: r })}
                      deleting={deletingId === r.id}
                    />
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
                  </View>
                ))}
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
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 2,
    minHeight: Touch.comfortable - 4,
  },
  filterCount: {
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminReport: {
    gap: Spacing.sm,
  },
});
