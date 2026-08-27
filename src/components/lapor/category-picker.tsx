import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { CATEGORY_KEYS, type CategoryKey } from '@/constants/categories';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCategory } from '@/hooks/use-category';

type Props = {
  value: CategoryKey | null;
  onChange: (key: CategoryKey) => void;
};

/**
 * Pemilih jenis kejadian — langkah 1 formulir laporan.
 *
 * Perubahan dari petak 2 kolom sebelumnya:
 *
 *   - JADI DAFTAR SATU KOLOM. Petak 2 kolom memaksa label dan ikon berdesakan
 *     di kolom selebar 48%, dan di HP 320dp label seperti "Bencana Alam"
 *     terpotong. Satu kolom memberi ruang untuk contoh nyata di bawah tiap
 *     nama, yang justru bagian terpentingnya: warga sering tidak yakin
 *     kejadiannya masuk kategori mana, dan "Banjir, angin kencang, tanah
 *     bergerak" menjawab itu tanpa perlu bertanya.
 *
 *   - Target sentuh jadi ~80px per baris, jauh di atas 48dp.
 *
 *   - Pilihan ditandai tanda centang DAN garis batas tebal, bukan warna saja.
 */
export function CategoryPicker({ value, onChange }: Props) {
  const { colors } = useAppTheme();
  const resolveCategory = useCategory();

  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {CATEGORY_KEYS.map((key) => {
        const cat = resolveCategory(key);
        const selected = value === key;

        return (
          <Pressable
            key={key}
            onPress={() => {
              if (Platform.OS !== 'web') {
                try {
                  Haptics.selectionAsync();
                } catch {}
              }
              onChange(key);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={cat.label}
            accessibilityHint={cat.hint}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: selected ? cat.soft : colors.card,
                borderColor: selected ? cat.color : colors.border,
                borderWidth: selected ? 3 : 1.5,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
              selected ? (Shadows.sm as object) : null,
            ]}>
            <View style={[styles.iconBox, { backgroundColor: selected ? cat.color : cat.soft }]}>
              <Ionicons name={cat.icon} size={30} color={selected ? cat.onColor : cat.color} />
            </View>

            <View style={styles.textWrap}>
              <AppText variant="bodyStrong" color="text">
                {cat.label}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {cat.hint}
              </AppText>
            </View>

            <View
              style={[
                styles.check,
                {
                  backgroundColor: selected ? cat.color : 'transparent',
                  borderColor: selected ? cat.color : colors.borderStrong,
                },
              ]}>
              {selected ? <Ionicons name="checkmark" size={22} color={cat.onColor} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  check: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
