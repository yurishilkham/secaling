import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  /** Tulisan di samping tanda panah. */
  label?: string;
  /** Ganti perilaku bawaan (kembali satu langkah). */
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * Tombol Kembali.
 *
 * Menggantikan tombol kembali buatan sendiri di layar admin yang tinggi
 * terlihatnya hanya sekitar 30px (`paddingVertical: 6` mengelilingi teks 13px)
 * dan tidak punya `accessibilityRole` maupun label — padahal itu kontrol
 * navigasi yang paling sering dipakai di layar tersebut.
 *
 * Sekarang tinggi 48px, punya latar dan garis batas supaya jelas terlihat
 * sebagai tombol, dan diucapkan benar oleh pembaca layar.
 */
export function BackButton({ label = 'Kembali', onPress, style }: Props) {
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
        }
        if (onPress) onPress();
        else router.back();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}>
      <Ionicons name="chevron-back" size={22} color={colors.primaryText} />
      <AppText variant="label" color="primary" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    minHeight: Touch.min,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
});
