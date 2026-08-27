import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AccessGuard } from '@/components/ui/access-guard';
import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
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

export default function AdminAnnouncementScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<FriendlyError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [askPublish, setAskPublish] = useState(false);

  async function publish() {
    if (!session || profile?.role !== 'admin') return;

    setAskPublish(false);
    setSubmitting(true);
    setFailure(null);

    const { error } = await supabase.from('announcements').insert({
      title: title.trim(),
      body: body.trim(),
      is_important: important,
      author_id: session.user.id,
    });

    setSubmitting(false);

    if (error) {
      setFailure(friendlyError(error, 'publishAnnouncement'));
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    router.back();
  }

  function requestPublish() {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = 'Tulis judul pengumuman.';
    if (!body.trim()) next.body = 'Tulis isi pengumuman.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Pengumuman mengirim pemberitahuan ke seluruh warga desa dan tidak bisa
    // ditarik kembali, jadi minta kepastian dulu.
    setAskPublish(true);
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
        message="Hanya perangkat desa yang bisa menulis pengumuman resmi. Kalau menurut Anda seharusnya bisa, hubungi kepala desa."
      >
        <BackButton label="Kembali" />
      </AccessGuard>
    );
  }

  return (
    <Screen noTabBar>
      {/* Jalan kembali di atas. Tombol "Batal" di bawah tetap ada karena itu
          bagian dari alur formulir — dua-duanya punya maksud berbeda. */}
      <BackButton label="Menu Admin" />

      <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
        <AppText variant="title" color="text" heading>
          Tulis Pengumuman
        </AppText>
        <AppText variant="body" color="textSecondary">
          Pengumuman akan tampil di Beranda semua warga, dan HP mereka akan
          berbunyi.
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
            hint="Singkat dan jelas, supaya terbaca sekali lihat"
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
            hint="Tulis lengkap: apa, kapan, di mana"
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

          {/* Penanda penting.
              Dulu ini `Pressable` tanpa `accessibilityRole`, tanpa
              `accessibilityState`, dan tanpa label — pembaca layar tidak bisa
              tahu ini sebuah saklar, apalagi keadaannya. */}
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
            accessibilityHint="Pengumuman penting diberi tanda merah dan tampil paling atas"
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

      <Animated.View entering={FadeInDown.delay(100).duration(320)} style={styles.actions}>
        <Button
          title="Terbitkan Pengumuman"
          size="large"
          onPress={requestPublish}
          loading={submitting}
          icon={<Ionicons name="megaphone" size={24} color={colors.onPrimary} />}
        />
        <BackButton label="Batal" />
      </Animated.View>

      <ConfirmSheet
        visible={askPublish}
        title={important ? 'Terbitkan sebagai penting?' : 'Terbitkan pengumuman?'}
        message={
          important
            ? 'Pengumuman ini akan tampil paling atas dengan tanda merah, dan HP semua warga akan berbunyi.'
            : 'Pengumuman ini akan tampil di Beranda semua warga, dan HP mereka akan berbunyi.'
        }
        confirmLabel="Ya, Terbitkan"
        cancelLabel="Periksa Lagi"
        loading={submitting}
        onConfirm={publish}
        onCancel={() => setAskPublish(false)}
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
  actions: {
    gap: Spacing.sm,
  },
});
