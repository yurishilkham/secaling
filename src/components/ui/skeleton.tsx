import { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Skeleton({
  width = '100%',
  height = 80,
  radius = Radius.md,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
}) {
  const theme = useTheme();
  const pulse = useMemo(() => new Animated.Value(0.4), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.border, opacity: pulse },
      ]}
    />
  );
}

export function SkeletonCard() {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Skeleton width={42} height={42} radius={Radius.md} />
        <View style={styles.headerLines}>
          <Skeleton width="45%" height={10} />
          <Skeleton width="28%" height={8} />
        </View>
      </View>
      <Skeleton height={14} />
      <Skeleton height={12} width="86%" />
      <Skeleton height={12} width="58%" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two + 2,
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerLines: {
    flex: 1,
    gap: Spacing.two,
  },
});