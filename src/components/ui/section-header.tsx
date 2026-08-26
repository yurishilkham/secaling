import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: ReactNode;
  title: string;
  accent?: string;
  action?: { label: string; onPress: () => void };
};

export function SectionHeader({ icon, title, accent, action }: Props) {
  const theme = useTheme();
  const color = accent ?? theme.primary;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon}
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={[styles.action, { color }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  action: {
    fontSize: 13,
    fontWeight: '700',
  },
});