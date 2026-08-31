import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { type Announcement, AnnouncementCard } from '@/components/announcement-card';
import { HomeHero } from '@/components/home-hero';
import { type Report, ReportCard } from '@/components/report-card';
import { AppText } from '@/components/ui/app-text';
import {
  CategoryFilterRow,
  type CategoryFilterValue,
} from '@/components/ui/category-filter-row';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineBanner } from '@/components/ui/inline-banner';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { CATEGORY_KEYS } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useConfirmations } from '@/hooks/use-confirmations';
import { useAuth } from '@/lib/auth';
import { buangSaluran, namaSaluranUnik } from '@/lib/realtime';
import { PILIH_LAPORAN_DENGAN_PELAPOR, supabase } from '@/lib/supabase';

/**
 * Dasar nama saluran realtime — nomor urut ditambahkan saat dipakai.
 *
 * Nama TIDAK boleh tetap. `supabase.channel()` mengembalikan saluran yang sudah
 * ada kalau namanya sama, dan `.on()` pada saluran yang sudah `subscribe()`
 * melempar error yang menggagalkan seluruh layar. Itu terjadi tiap kali layar
 * ini dipasang ulang, misalnya setelah warga masuk.
 */
const DASAR_SALURAN_BERANDA = 'home-realtime';

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { session } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /**
   * Keadaan gagal yang sebelumnya tidak ada.
   *
   * Kode lama menulis `if (!error) setReports(...)` lalu `setLoading(false)`
   * tanpa syarat, jadi kegagalan jaringan tampil sebagai "Desa dalam keadaan
   * aman" — pesan yang justru menenangkan padahal datanya gagal dimuat.
   */
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<CategoryFilterValue>('semua');

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const [reportRes, annRes] = await Promise.all([
      supabase
        .from('reports')
        .select(PILIH_LAPORAN_DENGAN_PELAPOR)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('announcements')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (!mounted.current) return;

    // Kalau keduanya gagal, itu masalah jaringan — tampilkan keadaan gagal.
    // Kalau cuma satu yang gagal, tampilkan yang berhasil saja daripada
    // menutup seluruh layar.
    if (reportRes.error && annRes.error) {
      setError(reportRes.error);
      setLoading(false);
      return;
    }

    setError(null);
    if (!reportRes.error) setReports((reportRes.data ?? []) as Report[]);
    if (!annRes.error) setAnnouncements((annRes.data ?? []) as Announcement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(namaSaluranUnik(DASAR_SALURAN_BERANDA))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        const row = payload.new as Report;
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', row.reporter_id)
          .maybeSingle()
          .then(({ data }) => {
            if (!mounted.current) return;
            setReports((prev) => [
              { ...row, profiles: data ?? null },
              ...prev.filter((r) => r.id !== row.id),
            ]);
          });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reports' }, (payload) => {
        const old = payload.old as Report;
        if (!mounted.current || !old?.id) return;
        setReports((prev) => prev.filter((r) => r.id !== old.id));
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          const row = payload.new as Announcement;
          supabase
            .from('profiles')
            .select('full_name')
            .eq('id', row.author_id)
            .maybeSingle()
            .then(({ data }) => {
              if (!mounted.current) return;
              setAnnouncements((prev) => [
                { ...row, profiles: data ?? null },
                ...prev.filter((a) => a.id !== row.id),
              ]);
            });
        },
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, (payload) => {
        const row = payload.new as Report;
        if (!mounted.current) return;
        setReports((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...row } : r)));
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'announcements' },
        (payload) => {
          const row = payload.new as Announcement;
          if (!mounted.current) return;
          setAnnouncements((prev) => prev.map((a) => (a.id === row.id ? { ...a, ...row } : a)));
        },
      )
      .subscribe();

    return () => {
      buangSaluran(channel);
    };
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function retry() {
    setLoading(true);
    setError(null);
    load();
  }

  const filteredReports =
    filter === 'semua' ? reports : reports.filter((r) => r.category === filter);

  // Jumlah pembenaran diambil untuk SELURUH laporan yang dimuat, bukan hanya
  // yang sedang tampil setelah disaring. Kalau hanya yang tersaring, mengganti
  // penyaring akan memicu permintaan jaringan baru setiap kali.
  const {
    counts,
    mine,
    toggle,
    pendingId,
    confirmationFailure,
    clearConfirmationFailure,
  } = useConfirmations(
    reports.map((r) => r.id),
    session?.user.id ?? null,
  );

  // Jumlah per kategori supaya warga tahu chip mana yang berisi sebelum ditekan.
  const categoryCounts: Partial<Record<CategoryFilterValue, number>> = {
    semua: reports.length,
  };
  for (const key of CATEGORY_KEYS) {
    categoryCounts[key] = reports.filter((r) => r.category === key).length;
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primaryText}
          colors={[colors.primaryText]}
        />
      }>
      <Animated.View entering={FadeIn.duration(360)}>
        <HomeHero />
      </Animated.View>

      {confirmationFailure ? (
        <InlineBanner
          tone="error"
          message={confirmationFailure.message}
          onDismiss={clearConfirmationFailure}
        />
      ) : null}

      {error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : (
        <>
          <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.section}>
            <SectionHeader
              icon={<Ionicons name="warning" size={22} color={colors.danger} />}
              title="Kejadian Terbaru"
              accent={colors.danger}
            />

            {loading ? (
              <View style={styles.list}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : (
              <>
                <CategoryFilterRow value={filter} onChange={setFilter} counts={categoryCounts} />

                {filteredReports.length === 0 ? (
                  <EmptyState
                    icon="shield-checkmark-outline"
                    title={filter === 'semua' ? 'Desa sedang aman' : 'Belum ada laporan'}
                    description={
                      filter === 'semua'
                        ? 'Belum ada kejadian yang dilaporkan. Kalau Anda melihat sesuatu, jangan ragu melapor.'
                        : 'Belum ada laporan untuk jenis kejadian ini. Coba pilih jenis lain di atas.'
                    }
                    action={
                      filter === 'semua'
                        ? { label: 'Lapor Kejadian', onPress: () => router.push('/lapor') }
                        : { label: 'Lihat Semua', onPress: () => setFilter('semua') }
                    }
                  />
                ) : (
                  <View style={styles.list}>
                    {filteredReports.map((r, i) => (
                      <Animated.View
                        key={r.id}
                        entering={i < 4 ? FadeInDown.delay(120 + i * 50).duration(340) : undefined}>
                        <ReportCard
                          report={r}
                          confirmCount={counts[r.id] ?? 0}
                          confirmedByMe={mine.has(r.id)}
                          onConfirm={() => toggle(r.id)}
                          confirmLoading={pendingId === r.id}
                          confirmDisabled={!session}
                        />
                      </Animated.View>
                    ))}
                  </View>
                )}
              </>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(360)} style={styles.section}>
            <SectionHeader
              icon={<Ionicons name="megaphone" size={22} color={colors.primaryText} />}
              title="Pengumuman Desa"
              action={
                announcements.length > 0
                  ? { label: 'Semua', onPress: () => router.push('/pengumuman') }
                  : undefined
              }
            />

            {loading ? (
              <View style={styles.list}>
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : announcements.length === 0 ? (
              <EmptyState
                icon="megaphone-outline"
                title="Belum ada pengumuman"
                description="Informasi resmi dari perangkat desa akan muncul di sini."
              />
            ) : (
              <View style={styles.list}>
                {announcements.slice(0, 3).map((a, i) => (
                  <Animated.View
                    key={a.id}
                    entering={i < 3 ? FadeInDown.delay(180 + i * 50).duration(340) : undefined}>
                    <AnnouncementCard announcement={a} />
                  </Animated.View>
                ))}

                {announcements.length > 3 ? (
                  <AppText variant="caption" color="textMuted" align="center" style={styles.more}>
                    {`Masih ada ${announcements.length - 3} pengumuman lain`}
                  </AppText>
                ) : null}
              </View>
            )}
          </Animated.View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  list: {
    gap: Spacing.md,
  },
  more: {
    paddingTop: Spacing.xs,
  },
});
