import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

/**
 * Pemisah "atau" antara masuk dengan email dan masuk dengan Google.
 *
 * Dijadikan komponen karena sebelumnya disalin persis di `login.tsx` dan
 * `register.tsx`, termasuk seluruh gaya `dividerRow`, `dividerLine`, dan
 * `dividerText`.
 */
export function OrDivider({ label = 'atau' }: { label?: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  line: {
    flex: 1,
    height: 1.5,
  },
});
