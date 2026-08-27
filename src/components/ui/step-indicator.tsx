import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  /** Langkah sekarang, mulai dari 1. */
  current: number;
  total: number;
  /** Nama tiap langkah, untuk diucapkan pembaca layar. */
  labels: string[];
};

/**
 * Penunjuk langkah untuk formulir bertahap.
 *
 * Ditulis sebagai kalimat lengkap ("Langkah 2 dari 3 — Ceritakan kejadiannya"),
 * bukan hanya deretan titik. Deretan titik tanpa tulisan tidak memberi tahu
 * warga sudah sampai mana dan masih berapa lagi — dan itu justru kegelisahan
 * utama orang yang tidak biasa mengisi formulir di HP.
 */
export function StepIndicator({ current, total, labels }: Props) {
  const { colors } = useAppTheme();
  const label = labels[current - 1] ?? '';

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current }}
      accessibilityLabel={`Langkah ${current} dari ${total}: ${label}`}>
      <View style={styles.bars}>
        {Array.from({ length: total }, (_, i) => {
          const stepNumber = i + 1;
          const done = stepNumber < current;
          const active = stepNumber === current;
          return (
            <View
              key={stepNumber}
              style={[
                styles.bar,
                {
                  backgroundColor: done || active ? colors.primary : colors.border,
                  // Langkah sekarang dibuat lebih tinggi, jadi posisinya terlihat
                  // tanpa harus membedakan warna.
                  height: active ? 10 : 6,
                },
              ]}
            />
          );
        })}
      </View>

      <AppText variant="label" color="primary">
        {`Langkah ${current} dari ${total}`}
        {label ? <AppText variant="label" color="textSecondary">{` — ${label}`}</AppText> : null}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  bar: {
    flex: 1,
    borderRadius: Radius.pill,
  },
});
