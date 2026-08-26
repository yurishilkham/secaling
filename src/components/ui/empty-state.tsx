import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  accent?: string;
};

export function EmptyState({ icon, title, description, accent }: Props) {
  const theme = useTheme();
  const color = accent ?? theme.primary;

  return (
    <View style={[styles.box, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={30} color={color} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: theme.textSecondary }]}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  desc: {
    fontSize: 13,
    textAlign: 'center',
  },
});