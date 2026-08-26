import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Announcement, AnnouncementCard } from '@/components/announcement-card';
import { Report, ReportCard } from '@/components/report-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function AdminIndexScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);
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

  async function doDeleteReport(item: Report) {
    setDeletingReportId(item.id);
    try {
      const { error } = await supabase.from('reports').delete().eq('id', item.id);
      if (error) throw error;
      setReports((prev) => prev.filter((x) => x.id !== item.id));
    } catch (e: any) {
      Alert.alert('Gagal menghapus', e?.message ?? 'Terjadi kesalahan saat menghapus laporan.');
    } finally {
      if (mounted.current) setDeletingReportId(null);
    }
  }

  async function doDeleteAnnouncement(item: Announcement) {
    setDeletingAnnouncementId(item.id);
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', item.id);
      if (error) throw error;
      setAnnouncements((prev) => prev.filter((x) => x.id !== item.id));
    } catch (e: any) {
      Alert.alert('Gagal menghapus', e?.message ?? 'Terjadi kesalahan saat menghapus pengumuman.');
    } finally {
      if (mounted.current) setDeletingAnnouncementId(null);
    }
  }

  function confirmDeleteReport(item: Report) {
    const message = `"${item.title}" akan dihapus permanen. Lanjutkan?`;
    if (Platform.OS === 'web') {
      // Alert.alert di web tidak reliably menjalankan onPress, pakai window.confirm
      const ok = typeof window !== 'undefined' ? window.confirm(`Hapus laporan\n${message}`) : false;
      if (ok) doDeleteReport(item);
      return;
    }
    Alert.alert('Hapus laporan', message, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => doDeleteReport(item) },
    ]);
  }

  function confirmDeleteAnnouncement(item: Announcement) {
    const message = `"${item.title}" akan dihapus permanen. Lanjutkan?`;
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm(`Hapus pengumuman\n${message}`) : false;
      if (ok) doDeleteAnnouncement(item);
      return;
    }
    Alert.alert('Hapus pengumuman', message, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => doDeleteAnnouncement(item) },
    ]);
  }

  if (loading) {
    return (
      <Screen scroll={false}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>Memuat…</Text>
      </Screen>
    );
  }

  if (!session || !profile || profile.role !== 'admin') {
    return (
      <Screen scroll={false}>
        <View style={styles.guard}>
          <View style={[styles.guardIcon, { backgroundColor: theme.dangerSoft }]}>
            <Ionicons name="lock-closed" size={32} color={theme.danger} />
          </View>
          <Text style={[styles.guardTitle, { color: theme.danger }]}>Akses Ditolak</Text>
          <Text style={[styles.guardDesc, { color: theme.textSecondary }]}>
            Halaman ini khusus perangkat desa. Hubungi admin desa bila Anda merasa seharusnya
            memiliki akses.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profil'))}
        style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={8}
        accessibilityLabel="Kembali"
        accessibilityRole="button">
        <Ionicons name="arrow-back" size={20} color={theme.primary} />
        <Text style={[styles.backText, { color: theme.primary }]}>Kembali</Text>
      </Pressable>

      <Text style={[styles.pageTitle, { color: theme.text }]}>Menu Admin</Text>
      <Text style={[styles.pageSub, { color: theme.textSecondary }]}>
        Kelola laporan dan pengumuman desa.
      </Text>

      <Button
        title="Tulis Pengumuman Desa"
        onPress={() => router.push('/admin/pengumuman-baru')}
        icon={<Ionicons name="create-outline" size={18} color={theme.onPrimary} />}
      />
      <Button
        title="Pengaturan Akun Admin"
        variant="outline"
        onPress={() => router.push('/admin/pengaturan')}
        icon={<Ionicons name="settings-outline" size={18} color={theme.primary} />}
      />

      <View style={styles.section}>
        <SectionHeader
          icon={<Ionicons name="warning" size={18} color={theme.danger} />}
          title={`Laporan (${reports.length})`}
          accent={theme.danger}
        />

        {loadingData ? (
          <View style={styles.skeletonList}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : reports.length === 0 ? (
          <EmptyState icon="shield-outline" title="Belum ada laporan" />
        ) : (
          reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              onDelete={() => confirmDeleteReport(r)}
              deleting={deletingReportId === r.id}
            />
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          icon={<Ionicons name="megaphone" size={18} color={theme.primary} />}
          title={`Pengumuman (${announcements.length})`}
        />

        {loadingData ? (
          <View style={styles.skeletonList}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : announcements.length === 0 ? (
          <EmptyState icon="megaphone-outline" title="Belum ada pengumuman" />
        ) : (
          announcements.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              onDelete={() => confirmDeleteAnnouncement(a)}
              deleting={deletingAnnouncementId === a.id}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    marginTop: Spacing.one,
    borderRadius: Radius.full,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: Spacing.two,
  },
  pageSub: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: Spacing.two + 2,
    marginTop: Spacing.three,
  },
  skeletonList: {
    gap: Spacing.two + 2,
  },
  guard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  guardIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  guardDesc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingTop: Spacing.six,
  },
});