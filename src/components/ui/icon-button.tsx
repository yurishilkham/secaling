import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Radius, Springs, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type IconButtonTone = 'neutral' | 'primary' | 'danger';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** WAJIB. Tombol yang hanya berisi ikon tidak berarti apa pun bagi pembaca layar tanpa ini. */
  label: string;
  tone?: IconButtonTone;
  size?: number;
  disabled?: boolean;
  /** Beri latar dan garis batas. Matikan untuk tombol yang menempel di atas gambar. */
  filled?: boolean;
  style?: ViewStyle;
};

/**
 * Tombol ikon dengan ukuran sentuh yang benar.
 *
 * Kenapa perlu komponen sendiri: audit menemukan tombol ikon berukuran 26px,
 * 32px, dan 38px berserakan di seluruh app — semuanya di bawah minimum 48dp
 * Android. Beberapa ditambal `hitSlop` sehingga area tekannya cukup, tapi
 * ukuran yang TERLIHAT tetap kecil, jadi warga lansia sulit membidiknya.
 *
 * `label` sengaja dibuat wajib, bukan opsional.
 */
export function IconButton({
  icon,
  onPress,
  label,
  tone = 'neutral',
  size = Touch.icon,
  disabled = false,
  filled = true,
  style,
}: Props) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const palette: Record<IconButtonTone, { bg: string; fg: string; border: string }> = {
    neutral: { bg: colors.background, fg: colors.textSecondary, border: colors.border },
    primary: { bg: colors.primarySoft, fg: colors.primaryText, border: colors.primaryText },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger },
  };

  const { bg, fg, border } = palette[tone];

  // Ikon dibuat proporsional terhadap tombol, dengan batas atas supaya tidak
  // menyentuh tepi saat tombolnya kecil.
  const iconSize = Math.min(26, Math.round(size * 0.5));

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
        }
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.9, Springs.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, Springs.gentle);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: Radius.pill,
          backgroundColor: filled ? bg : 'transparent',
          borderWidth: filled ? 2 : 0,
          borderColor: border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}>
      <Animated.View style={animatedStyle}>
        <Ionicons name={icon} size={iconSize} color={fg} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
