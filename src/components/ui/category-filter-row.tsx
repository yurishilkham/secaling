import { ScrollView, StyleSheet } from 'react-native';

import { FilterChip } from '@/components/ui/filter-chip';
import { CATEGORY_KEYS, type CategoryKey } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
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
  const resolveCategory = useCategory();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist">
      <FilterChip
        label="Semua"
        count={counts?.semua}
        active={value === 'semua'}
        onPress={() => onChange('semua')}
        accessibilityLabel={
          counts?.semua !== undefined ? `Semua kategori, ${counts.semua} laporan` : 'Semua kategori'
        }
      />

      {CATEGORY_KEYS.map((key) => {
        const cat = resolveCategory(key);
        return (
          <FilterChip
            key={key}
            label={cat.label}
            count={counts?.[key]}
            active={value === key}
            icon={cat.icon}
            activeColor={cat.color}
            activeOnColor={cat.onColor}
            onPress={() => onChange(key)}
            accessibilityLabel={
              counts?.[key] !== undefined ? `${cat.label}, ${counts[key]} laporan` : cat.label
            }
          />
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
});
