import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Announcement, AnnouncementCard } from '@/components/announcement-card';
import { Report, ReportCard } from '@/components/report-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { CATEGORIES, CATEGORY_KEYS, CategoryKey } from '@/constants/categories';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const HOME_CHANNEL = 'home-realtime';
type CategoryFilter = CategoryKey | 'semua';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CategoryFilter>('semua');
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
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('announcements')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (mounted.current) {
      if (!reportRes.error) setReports((reportRes.data ?? []) as Report[]);
      if (!annRes.error) setAnnouncements((annRes.data ?? []) as Announcement[]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(HOME_CHANNEL)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        (payload) => {
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
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          if (!mounted.current) return;
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filteredReports =
    filter === 'semua' ? reports : reports.filter((r) => r.category === filter);

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }>
      <LinearGradient
        colors={[theme.primary, theme.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={26} color={theme.onPrimary} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: theme.onPrimary }]}>Secaling</Text>
            <Text style={[styles.heroSub, { color: theme.onPrimary }]}>Keamanan Desa Segoropuro</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveText, { color: theme.onPrimary }]}>LIVE</Text>
          </View>
        </View>

        <Text style={[styles.heroDesc, { color: theme.onPrimary }]}>
          Pantau keamanan desa secara real-time dan lapor kejadian mencurigakan.
        </Text>

        <Pressable
          onPress={() => router.push('/lapor')}
          style={({ pressed }) => [
            styles.cta,
            { transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}>
          <Ionicons name="add-circle" size={20} color={theme.primary} />
          <Text style={styles.ctaText}>Lapor Kejadian</Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="warning" size={18} color={theme.danger} />
          <Text style={[styles.statValue, { color: theme.text }]}>{reports.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Peringatan</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="megaphone" size={18} color={theme.primary} />
          <Text style={[styles.statValue, { color: theme.text }]}>{announcements.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pengumuman</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="people" size={18} color={theme.success} />
          <Text style={[styles.statValue, { color: theme.text }]}>24/7</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Siaga</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          icon={<Ionicons name="warning" size={18} color={theme.danger} />}
          title="Peringatan Terbaru"
          accent={theme.danger}
          action={{ label: 'Lihat semua', onPress: () => router.push('/pengumuman') }}
        />

        {!loading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            <Pressable
              onPress={() => setFilter('semua')}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === 'semua' ? theme.primary : theme.card,
                  borderColor: filter === 'semua' ? theme.primary : theme.border,
                },
              ]}>
              <Text
                style={[
                  styles.filterChipText,
                  { color: filter === 'semua' ? theme.onPrimary : theme.textSecondary },
                ]}>
                Semua
              </Text>
            </Pressable>
            {CATEGORY_KEYS.map((key) => {
              const cat = CATEGORIES[key];
              const active = filter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? cat.color : theme.card,
                      borderColor: active ? cat.color : theme.border,
                    },
                  ]}>
                  <Ionicons
                    name={cat.icon}
                    size={13}
                    color={active ? '#FFFFFF' : cat.color}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? '#FFFFFF' : theme.textSecondary },
                    ]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {loading ? (
          <View style={styles.skeletonList}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : filteredReports.length === 0 ? (
          <EmptyState
            icon="shield-outline"
            title={filter === 'semua' ? 'Desa dalam keadaan aman' : 'Tidak ada laporan'}
            description={
              filter === 'semua'
                ? 'Belum ada laporan. Jaga keamanan bersama!'
                : 'Belum ada laporan untuk kategori ini.'
            }
          />
        ) : (
          filteredReports.map((r) => <ReportCard key={r.id} report={r} />)
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          icon={<Ionicons name="megaphone" size={18} color={theme.primary} />}
          title="Pengumuman Desa"
          action={{ label: 'Lihat semua', onPress: () => router.push('/pengumuman') }}
        />

        {loading ? (
          <View style={styles.skeletonList}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : announcements.length === 0 ? (
          <EmptyState
            icon="megaphone-outline"
            title="Belum ada pengumuman"
            description="Pengumuman resmi desa akan tampil di sini."
          />
        ) : (
          announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} />)
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
    ...Shadows.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.92,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
  ctaText: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: 3,
    ...Shadows.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    gap: Spacing.two + 2,
    marginTop: Spacing.four,
  },
  filterRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  skeletonList: {
    gap: Spacing.two + 2,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});