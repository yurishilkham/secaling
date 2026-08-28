import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

/**
 * Chip penyaring kecil — dipakai di dua tempat yang sebelumnya duplikat:
 *   - Beranda (filter kategori)  `category-filter-row.tsx`
 *   - Menu Admin (filter status)  `admin/index.tsx`
 *
 * Disatukan supaya tinggi 52px, border 2, radius pill, haptics, dan
 * `accessibilityRole="tab"` tidak melenceng kalau salah satu diubah.
 */
type Props = {
  label: string;
  count?: number;
  active: boolean;
  /** Ikon saat tidak aktif. Saat aktif selalu `checkmark`. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Warna isian & border saat aktif (kategori/status). Kalau kosong pakai `primary`. */
  activeColor?: string;
  /** Warna teks/ikon di atas `activeColor`. Kalau kosong pakai `onPrimary`. */
  activeOnColor?: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

export function FilterChip({
  label,
  count,
  active,
  icon,
  activeColor,
  activeOnColor,
  onPress,
  accessibilityLabel,
}: Props) {
  const { colors } = useAppTheme();

  const bg = active ? (activeColor ?? colors.primary) : colors.card;
  const border = active ? (activeColor ?? colors.primary) : colors.borderStrong;
  const fg = active ? (activeOnColor ?? colors.onPrimary) : colors.textSecondary;
  const countBg = active ? 'rgba(255,255,255,0.22)' : colors.background;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') {
          try {
            Haptics.selectionAsync();
          } catch {}
        }
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? (count !== undefined ? `${label}, ${count}` : label)}
      style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      {active ? (
        <Ionicons name="checkmark" size={20} color={fg} />
      ) : icon ? (
        <Ionicons name={icon} size={20} color={activeColor ?? colors.primaryText} />
      ) : null}
      <AppText variant="label" rawColor={fg}>
        {label}
      </AppText>
      {count !== undefined ? (
        <View style={[styles.count, { backgroundColor: countBg }]}>
          <AppText variant="caption" rawColor={fg}>
            {count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 2,
    minHeight: Touch.comfortable - 4,
  },
  count: {
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
