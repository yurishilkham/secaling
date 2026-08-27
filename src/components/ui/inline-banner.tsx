import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type BannerTone = 'success' | 'error' | 'info' | 'warning';

type Props = {
  tone: BannerTone;
  message: string;
  /** Tampilkan tombol tutup. */
  onDismiss?: () => void;
  /** Tutup sendiri setelah beberapa milidetik. Jangan dipakai untuk pesan gagal. */
  autoDismissMs?: number;
};

/**
 * Pesan sebaris di dalam layar, pengganti `Alert.alert` untuk kabar berhasil
 * dan gagal.
 *
 * Kenapa lebih baik daripada Alert: warga tidak perlu menekan OK untuk
 * melanjutkan, pesannya muncul di dekat hal yang bersangkutan, dan ukuran
 * hurufnya ikut setelan huruf besar pilihan warga.
 *
 * Keadaannya tidak ditandai warna saja — tiap nada punya ikon sendiri, jadi
 * tetap bisa dibedakan oleh yang buta warna.
 */
export function InlineBanner({ tone, message, onDismiss, autoDismissMs }: Props) {
  const { colors } = useAppTheme();

  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [autoDismissMs, onDismiss]);

  const config: Record<BannerTone, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> =
    {
      success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' },
      error: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' },
      info: { bg: colors.infoSoft, fg: colors.info, icon: 'information-circle' },
      warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'warning' },
    };

  const { bg, fg, icon } = config[tone];

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOut.duration(160)}
      style={[styles.wrap, { backgroundColor: bg, borderColor: fg }]}
      // Pembaca layar langsung mengucapkan pesan ini begitu muncul.
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
      <Ionicons name={icon} size={24} color={fg} />
      <View style={styles.textWrap}>
        <AppText variant="secondary" rawColor={fg}>
          {message}
        </AppText>
      </View>
      {onDismiss ? (
        <IconButton icon="close" label="Tutup pesan" onPress={onDismiss} size={40} filled={false} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 2,
  },
  textWrap: {
    flex: 1,
  },
});
