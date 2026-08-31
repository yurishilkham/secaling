import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AnnouncementCard, type Announcement } from '@/components/announcement-card';
import { AccessGuard } from '@/components/ui/access-guard';
import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineBanner } from '@/components/ui/inline-banner';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuth } from '@/lib/auth';
import { friendlyError, type FriendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

type FieldErrors = { title?: string; body?: string };

export default function AdminEditAnnouncementScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile, loading } = useAuth();

  const [original, setOriginal] = useState<Announcement | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [loadError, setLoadError] = useState<unknown>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<FriendlyError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [askSave, setAskSave] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoadState('notfound');
      return;
    }
    setLoadState('loading');
    setLoadError(null);
    const { data, error } = await supabase
      .from('announcements')
      .select('*, profiles(full_name)')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      setLoadError(error);
      setLoadState('error');
      return;
    }
    if (!data) {
      setLoadState('notfound');
      return;
    }
    const row = data as Announcement;
    setOriginal(row);
    setTitle(row.title);
    setBody(row.body);
    setImportant(row.is_important);
    setLoadState('ready');
  }, [id]);

  useEffect(() => {
    if (profile?.role === 'admin') load();
  }, [load, profile?.role]);

  async function save() {
    if (!session || profile?.role !== 'admin' || !id) return;
    setAskSave(false);
    setSubmitting(true);
    setFailure(null);

    // Update tanpa mengubah author_id — biar riwayat penulis tetap.
    // Push tidak dikirim ulang saat edit (trigger hanya INSERT di DB).
    const { error } = await supabase
      .from('announcements')
      .update({
        title: title.trim(),
        body: body.trim(),
        is_important: important,
      })
      .eq('id', id);

    setSubmitting(false);
    if (error) {
      setFailure(friendlyError(error, 'updateAnnouncement'));
      return;
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    router.back();
  }

  function requestSave() {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = 'Tulis judul pengumuman.';
    if (!body.trim()) next.body = 'Tulis isi pengumuman.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    // Kalau tidak ada perubahan, jangan simpan.
    if (
      original &&
      title.trim() === original.title &&
      body.trim() === original.body &&
      important === original.is_important
    ) {
      setFailure({
        title: 'Belum ada perubahan',
        message: 'Ubah dulu judul, isi, atau tanda penting sebelum menyimpan.',
        retryable: false,
      });
      return;
    }
    setAskSave(true);
  }

  if (loading) {
    return (
      <Screen noTabBar>
        <View style={styles.loadingWrap}>
          <Skeleton width="55%" height={32} />
          <Skeleton height={320} radius={Radius.lg} />
        </View>
      </Screen>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <AccessGuard
        icon="lock-closed"
        tone="danger"
        title="Halaman Khusus Perangkat Desa"
        message="Hanya perangkat desa yang bisa mengubah pengumuman.">
        <BackButton label="Kembali" />
      </AccessGuard>
    );
  }

  if (loadState === 'loading') {
    return (
      <Screen noTabBar>
        <View style={styles.loadingWrap}>
          <Skeleton width="55%" height={32} />
          <Skeleton height={180} radius={Radius.lg} />
          <Skeleton height={160} radius={Radius.lg} />
        </View>
      </Screen>
    );
  }

  if (loadState === 'error') {
    return (
      <Screen noTabBar center>
        <ErrorState error={loadError} onRetry={load} />
      </Screen>
    );
  }

  if (loadState === 'notfound' || !original) {
    return (
      <Screen noTabBar center>
        <EmptyState
          icon="document-outline"
          title="Pengumuman tidak ditemukan"
          description="Pengumuman ini sudah dihapus atau tautannya tidak berlaku."
          action={{ label: 'Kembali', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  const hasChange =
    title.trim() !== original.title ||
    body.trim() !== original.body ||
    important !== original.is_important;

  // Preview: pakai data live dari form (bukan original)
  const preview: Announcement = {
    ...original,
    title: title.trim() || '(judul kosong)',
    body: body.trim() || '(isi kosong)',
    is_important: important,
  };

  return (
    <Screen noTabBar>
      <BackButton label="Menu Admin" />

      <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
        <AppText variant="title" color="text" heading>
          Ubah Pengumuman
        </AppText>
        <AppText variant="body" color="textSecondary">
          Perbaiki tulisan tanpa harus hapus dan buat baru. Pengumuman yang sudah diperbaiki tidak mengirim notifikasi ulang.
        </AppText>
      </Animated.View>

      {failure ? (
        <InlineBanner
          tone="error"
          message={failure.message}
          onDismiss={() => setFailure(null)}
        />
      ) : null}

      <Animated.View entering={FadeInDown.delay(60).duration(320)}>
        <Surface tone="card" radius={Radius.lg} style={styles.form}>
          <Input
            label="Judul pengumuman"
            required
            placeholder="Contoh: Kerja bakti hari Minggu"
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              setErrors((p) => ({ ...p, title: undefined }));
            }}
            error={errors.title}
            maxLength={120}
            showCounter
          />

          <Input
            label="Isi pengumuman"
            required
            placeholder="Tulis isi pengumuman di sini"
            value={body}
            onChangeText={(v) => {
              setBody(v);
              setErrors((p) => ({ ...p, body: undefined }));
            }}
            error={errors.body}
            multiline
            maxLength={1000}
            showCounter
          />

          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') {
                try {
                  Haptics.selectionAsync();
                } catch {}
              }
              setImportant((v) => !v);
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: important }}
            accessibilityLabel="Tandai sebagai pengumuman penting"
            style={({ pressed }) => [
              styles.toggle,
              {
                backgroundColor: important ? colors.dangerSoft : colors.background,
                borderColor: important ? colors.danger : colors.border,
                borderWidth: important ? 2.5 : 1.5,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <View
              style={[
                styles.toggleIcon,
                { backgroundColor: important ? colors.danger : colors.card },
              ]}>
              <Ionicons
                name={important ? 'alert-circle' : 'alert-circle-outline'}
                size={24}
                color={important ? colors.textOnColor : colors.textMuted}
              />
            </View>

            <View style={styles.toggleText}>
              <AppText variant="bodyStrong" color="text">
                Tandai Penting
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Diberi tanda merah dan tampil paling atas
              </AppText>
            </View>

            <View
              style={[
                styles.toggleCheck,
                {
                  backgroundColor: important ? colors.danger : 'transparent',
                  borderColor: important ? colors.danger : colors.borderStrong,
                },
              ]}>
              {important ? (
                <Ionicons name="checkmark" size={22} color={colors.textOnColor} />
              ) : null}
            </View>
          </Pressable>
        </Surface>
      </Animated.View>

      {/* Pratinjau langsung — warna dan tanda penting terlihat sebelum disimpan */}
      <Animated.View entering={FadeInDown.delay(90).duration(320)} style={styles.previewWrap}>
        <AppText variant="label" color="textMuted">
          Pratinjau
        </AppText>
        <AnnouncementCard announcement={preview} />
        <AppText variant="caption" color="textMuted">
          Ini yang akan dilihat warga di Beranda setelah disimpan.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(110).duration(320)} style={styles.actions}>
        <Button
          title="Simpan Perubahan"
          size="large"
          onPress={requestSave}
          loading={submitting}
          disabled={!hasChange}
          icon={<Ionicons name="checkmark-circle-outline" size={24} color={colors.onPrimary} />}
        />
        <BackButton label="Batal" />
      </Animated.View>

      <ConfirmSheet
        visible={askSave}
        title="Simpan perubahan?"
        message={
          important && !original.is_important
            ? 'Pengumuman ini akan naik ke paling atas dengan tanda merah.'
            : 'Perubahan akan langsung terlihat di Beranda warga.'
        }
        confirmLabel="Ya, Simpan"
        cancelLabel="Periksa Lagi"
        loading={submitting}
        onConfirm={save}
        onCancel={() => setAskSave(false)}
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
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  form: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Touch.large,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  toggleIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleCheck: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWrap: {
    gap: Spacing.sm,
  },
  actions: {
    gap: Spacing.sm,
  },
});
