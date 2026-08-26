import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';

type Props = {
  label: string;
  color: string;
  soft: string;
  icon?: React.ReactNode;
  large?: boolean;
};

export function CategoryBadge({ label, color, soft, icon, large = false }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: soft, paddingVertical: large ? 6 : 4 }]}>
      {icon}
      <Text style={[styles.label, { color, fontSize: large ? 14 : 12 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: Radius.full,
  },
  label: {
    fontWeight: '700',
  },
});