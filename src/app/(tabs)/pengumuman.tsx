import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { type Announcement, AnnouncementCard } from '@/components/announcement-card';
import { AppText } from '@/components/ui/app-text';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineBanner } from '@/components/ui/inline-banner';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuth } from '@/lib/auth';
import { friendlyError, type FriendlyError } from '@/lib/errors';
import { buangSaluran, namaSaluranUnik } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';

export default function PengumumanScreen() {
  const { colors } = useAppTheme();
  const { profile } = useAuth();

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [deleteFailure, setDeleteFailure] = useState<FriendlyError | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('announcements')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!mounted.current) return;

    // Kode lama memakai `if (!error) setItems(...)` lalu `setLoading(false)`
    // tanpa syarat, jadi gangguan jaringan tampil sebagai "Belum ada
    // pengumuman" — warga tidak tahu bahwa datanya gagal dimuat.
    if (loadError) {
      setError(loadError);
      setLoading(false);
      return;
    }

    setError(null);
    setItems((data ?? []) as Announcement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      // Nama unik per pemasangan. Nama tetap membuat `.on()` melempar error
      // kalau layar ini dipasang ulang sebelum saluran lama selesai dibuang.
      .channel(namaSaluranUnik('pengumuman-realtime'))
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
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'announcements' },
        (payload) => {
          const old = payload.old as Announcement;
          if (!mounted.current || !old?.id) return;
          setItems((prev) => prev.filter((a) => a.id !== old.id));
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

  async function confirmDelete() {
    const item = pendingDelete;
    if (!item) return;

    setPendingDelete(null);
    setDeletingId(item.id);
    setDeleteFailure(null);

    const { error: deleteError } = await supabase
      .from('announcements')
      .delete()
      .eq('id', item.id);

    if (!mounted.current) return;
    setDeletingId(null);

    if (deleteError) {
      setDeleteFailure(friendlyError(deleteError, 'deleteAnnouncement'));
      return;
    }
    setItems((prev) => prev.filter((a) => a.id !== item.id));
  }

  // Yang penting selalu di atas — itu urutan yang benar untuk pengumuman desa.
  const sorted = [...items].sort(
    (a, b) => Number(b.is_important) - Number(a.is_important),
  );
  const isAdmin = profile?.role === 'admin';
  const importantCount = items.filter((a) => a.is_important).length;

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
      <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
        <AppText variant="title" color="text" heading>
          Pengumuman Desa
        </AppText>
        <AppText variant="body" color="textSecondary">
          Informasi resmi dari perangkat Desa Segoropuro.
          {importantCount > 0
            ? ` Ada ${importantCount} pengumuman penting.`
            : ''}
        </AppText>
      </Animated.View>

      {deleteFailure ? (
        <InlineBanner
          tone="error"
          message={deleteFailure.message}
          onDismiss={() => setDeleteFailure(null)}
        />
      ) : null}

      {error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : loading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : sorted.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(320)}>
          <EmptyState
            icon="megaphone-outline"
            title="Belum ada pengumuman"
            description="Kalau perangkat desa mengirim informasi resmi, Anda akan melihatnya di sini."
          />
        </Animated.View>
      ) : (
        <View style={styles.list}>
          {sorted.map((a, i) => (
            <Animated.View
              key={a.id}
              entering={i < 5 ? FadeInDown.delay(60 + i * 45).duration(340) : undefined}>
              <AnnouncementCard
                announcement={a}
                onDelete={isAdmin ? () => setPendingDelete(a) : undefined}
                deleting={deletingId === a.id}
              />
            </Animated.View>
          ))}
        </View>
      )}

      <ConfirmSheet
        visible={!!pendingDelete}
        title="Hapus pengumuman ini?"
        message={
          pendingDelete
            ? `"${pendingDelete.title}" akan hilang dari daftar dan tidak bisa dikembalikan.`
            : ''
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Jangan Hapus"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  list: {
    gap: Spacing.md,
  },
});
