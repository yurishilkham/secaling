import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Announcement, AnnouncementCard } from '@/components/announcement-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function PengumumanScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!mounted.current) return;
    if (!error) setItems((data ?? []) as Announcement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('pengumuman-realtime')
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
              setItems((prev) => [
                { ...row, profiles: data ?? null },
                ...prev.filter((a) => a.id !== row.id),
              ]);
            });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'announcements' },
        (payload) => {
          const old = payload.old as Announcement;
          if (!mounted.current) return;
          if (old?.id) setItems((prev) => prev.filter((a) => a.id !== old.id));
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

  async function doDelete(item: Announcement) {
    setDeletingId(item.id);
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', item.id);
      if (error) throw error;
      setItems((prev) => prev.filter((a) => a.id !== item.id));
    } catch (e: any) {
      Alert.alert('Gagal menghapus', e?.message ?? 'Terjadi kesalahan saat menghapus pengumuman.');
    } finally {
      if (mounted.current) setDeletingId(null);
    }
  }

  function onDelete(item: Announcement) {
    const message = `"${item.title}" akan dihapus permanen. Lanjutkan?`;
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm(`Hapus pengumuman\n${message}`) : false;
      if (ok) doDelete(item);
      return;
    }
    Alert.alert('Hapus pengumuman', message, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => doDelete(item) },
    ]);
  }

  const sorted = [...items].sort((a, b) => Number(b.is_important) - Number(a.is_important));
  const isAdmin = profile?.role === 'admin';

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }>
      <Text style={[styles.pageTitle, { color: theme.text }]}>Pengumuman Desa</Text>
      <Text style={[styles.pageSub, { color: theme.textSecondary }]}>
        Informasi resmi dari perangkat Desa Segoropuro.
      </Text>

      {loading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="megaphone-outline"
          title="Belum ada pengumuman"
          description="Pengumuman resmi desa akan tampil di sini."
        />
      ) : (
        <View style={styles.list}>
          {sorted.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              onDelete={isAdmin ? () => onDelete(a) : undefined}
              deleting={deletingId === a.id}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: Spacing.two,
  },
  pageSub: {
    fontSize: 14,
  },
  list: {
    gap: Spacing.two + 2,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});