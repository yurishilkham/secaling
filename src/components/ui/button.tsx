import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { Radius, Shadows, Spacing, Springs, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'emergency' | 'ghost';
export type ButtonSize = 'normal' | 'large';

type Props = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  /** Ikon di sisi kanan — untuk tombol "Lanjut" di wizard. */
  iconRight?: ReactNode;
  style?: ViewStyle;
  /** Diucapkan pembaca layar. Isi kalau judulnya sendiri kurang jelas. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/**
 * Perubahan dari versi sebelumnya:
 *   - tinggi minimum 54 -> 56 (varian `large` 64), teks 16 -> 17
 *   - gradien dibuang, diganti warna rata. Gradien lama memakai `primary`
 *     yang kontras teks putihnya cuma 3.77 (gagal WCAG AA) di tombol paling
 *     penting di app. Warna rata membuat kontrasnya bisa dipastikan.
 *   - tambah varian `emergency` (merah penuh) untuk tombol darurat
 *   - varian `danger` sekarang latar merah lembut + teks merah gelap, bukan
 *     hanya garis batas — supaya niat menghapus terbaca sebelum ditekan
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'normal',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  iconRight,
  style,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isBlocked = disabled || loading;

  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.primarySoft, fg: colors.primaryText, border: colors.primarySoft },
    outline: { bg: colors.card, fg: colors.primaryText, border: colors.borderStrong },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger },
    // Tombol darurat memakai teks putih di kedua mode, karena isiannya merah
    // pekat baik di mode terang maupun gelap. Sudah diverifikasi: 5.74 di mode
    // terang, 4.51 di mode gelap.
    emergency: { bg: colors.emergency, fg: colors.onOverlay, border: colors.emergency },
    ghost: { bg: 'transparent', fg: colors.primaryText, border: 'transparent' },
  };

  const { bg, fg, border } = palette[variant];
  const minHeight = size === 'large' ? Touch.large : Touch.comfortable;

  // Bayangan hanya untuk aksi utama, supaya urutan kepentingan terlihat.
  const shadow =
    variant === 'primary' || variant === 'emergency'
      ? Shadows.md
      : variant === 'outline'
        ? Shadows.sm
        : null;

  function handlePress() {
    if (Platform.OS !== 'web') {
      try {
        if (variant === 'emergency') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else if (variant === 'primary') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {}
    }
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.97, Springs.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, Springs.gentle);
      }}
      disabled={isBlocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      hitSlop={8}
      style={[
        styles.base,
        {
          minHeight,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'outline' || variant === 'danger' ? 2 : 0,
          opacity: isBlocked ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        shadow as ViewStyle,
        style,
      ]}>
      <Animated.View style={[styles.inner, animatedStyle]}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <View style={styles.row}>
            {icon}
            <AppText
              variant={size === 'large' ? 'heading' : 'button'}
              rawColor={fg}
              numberOfLines={1}
              style={styles.label}>
              {title}
            </AppText>
            {iconRight}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
