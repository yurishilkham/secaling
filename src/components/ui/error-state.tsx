import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { friendlyError } from '@/lib/errors';

type Props = {
  /** Error mentah. Akan diterjemahkan sendiri jadi bahasa yang dimengerti warga. */
  error?: unknown;
  /** Timpa judul hasil terjemahan. */
  title?: string;
  /** Timpa pesan hasil terjemahan. */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * Keadaan gagal, dengan tombol coba lagi.
 *
 * Ini yang memperbaiki bug paling berbahaya dari audit: `pengumuman.tsx` dan
 * `admin/index.tsx` sama-sama menulis `if (!error) setItems(...)` lalu
 * `setLoading(false)` tanpa syarat. Kalau internet mati, warga membaca
 * "Belum ada pengumuman", dan admin membaca "Belum ada laporan" — padahal
 * laporannya ada. Di app keamanan desa, memberi tahu admin bahwa tidak ada
 * laporan masuk padahal sebenarnya ada itu kegagalan yang serius.
 *
 * Judul dan pesannya lewat `friendlyError`, jadi tidak akan ada teks Inggris
 * mentah dari Supabase yang sampai ke layar.
 */
export function ErrorState({ error, title, message, onRetry, retryLabel = 'Coba Lagi' }: Props) {
  const { colors } = useAppTheme();
  const friendly = friendlyError(error, 'ErrorState');

  return (
    <Surface tone="card" radius={Radius.lg} style={styles.box} accessibilityLiveRegion="polite">
      <View style={[styles.iconBox, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={34} color={colors.danger} />
      </View>

      <AppText variant="heading" color="text" align="center" heading>
        {title ?? friendly.title}
      </AppText>

      <AppText variant="secondary" color="textSecondary" align="center" style={styles.message}>
        {message ?? friendly.message}
      </AppText>

      {onRetry ? (
        <Button
          title={retryLabel}
          onPress={onRetry}
          variant="outline"
          icon={<Ionicons name="refresh" size={22} color={colors.primaryText} />}
          style={styles.button}
        />
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    maxWidth: 320,
  },
  button: {
    marginTop: Spacing.md,
    minWidth: 200,
  },
});
