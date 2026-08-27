import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { CATEGORY_KEYS, type CategoryKey } from '@/constants/categories';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCategory } from '@/hooks/use-category';

export type CategoryFilterValue = CategoryKey | 'semua';

type Props = {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
  /** Jumlah laporan per kategori, ditampilkan di chip. */
  counts?: Partial<Record<CategoryFilterValue, number>>;
};

/**
 * Baris penyaring kategori.
 *
 * Perubahan dari versi sebelumnya:
 *   - tinggi chip 36 -> 52px, teks 12.5px -> 15px, ikon 13 -> 20px
 *   - chip terpilih tidak lagi ditandai warna saja: ada tanda centang, jadi
 *     tetap terbaca oleh yang buta warna
 *   - warna chip terpilih memakai `onCategory` dari palet, sehingga teks di
 *     atasnya dipastikan lolos WCAG AA di mode terang maupun gelap (dulu
 *     dipaksa `'#FFFFFF'`, yang di mode gelap rasionya cuma 1.7)
 *   - jumlah laporan ditampilkan, supaya warga tahu chip mana yang berisi
 *     sebelum menekannya
 */
export function CategoryFilterRow({ value, onChange, counts }: Props) {
  const { colors } = useAppTheme();
  const resolveCategory = useCategory();

  function select(next: CategoryFilterValue) {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
    onChange(next);
  }

  const allActive = value === 'semua';
  const allCount = counts?.semua;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist">
      <Pressable
        onPress={() => select('semua')}
        accessibilityRole="tab"
        accessibilityState={{ selected: allActive }}
        accessibilityLabel={
          allCount !== undefined ? `Semua kategori, ${allCount} laporan` : 'Semua kategori'
        }
        style={[
          styles.chip,
          {
            backgroundColor: allActive ? colors.primary : colors.card,
            borderColor: allActive ? colors.primary : colors.borderStrong,
          },
        ]}>
        {allActive ? <Ionicons name="checkmark" size={20} color={colors.onPrimary} /> : null}
        <AppText variant="label" rawColor={allActive ? colors.onPrimary : colors.textSecondary}>
          Semua
        </AppText>
        {allCount !== undefined ? (
          <View
            style={[
              styles.count,
              { backgroundColor: allActive ? 'rgba(255,255,255,0.22)' : colors.background },
            ]}>
            <AppText
              variant="caption"
              rawColor={allActive ? colors.onPrimary : colors.textSecondary}>
              {allCount}
            </AppText>
          </View>
        ) : null}
      </Pressable>

      {CATEGORY_KEYS.map((key) => {
        const cat = resolveCategory(key);
        const active = value === key;
        const count = counts?.[key];

        return (
          <Pressable
            key={key}
            onPress={() => select(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              count !== undefined ? `${cat.label}, ${count} laporan` : cat.label
            }
            style={[
              styles.chip,
              {
                backgroundColor: active ? cat.color : colors.card,
                borderColor: active ? cat.color : colors.borderStrong,
              },
            ]}>
            <Ionicons
              name={active ? 'checkmark' : cat.icon}
              size={20}
              color={active ? cat.onColor : cat.color}
            />
            <AppText variant="label" rawColor={active ? cat.onColor : colors.textSecondary}>
              {cat.label}
            </AppText>
            {count !== undefined ? (
              <View
                style={[
                  styles.count,
                  { backgroundColor: active ? 'rgba(255,255,255,0.22)' : colors.background },
                ]}>
                <AppText variant="caption" rawColor={active ? cat.onColor : colors.textSecondary}>
                  {count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.lg,
  },
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
