import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function BrandHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <LinearGradient
        colors={[theme.primary, theme.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logo}>
        <Ionicons name="shield-checkmark" size={34} color={theme.onPrimary} />
      </LinearGradient>
      <Text style={[styles.appName, { color: theme.text }]}>Secaling</Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  appName: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: Spacing.one,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});