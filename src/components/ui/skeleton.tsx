import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

/**
 * Memakai `react-native-reanimated`, bukan `Animated` bawaan.
 *
 * Alasannya: `useRef(new Animated.Value(...)).current` membaca nilai ref saat
 * render, yang dilarang aturan React Compiler yang aktif di proyek ini
 * (`reactCompiler: true` di app.json). Reanimated juga menjalankan animasinya
 * di thread UI, jadi denyutnya tidak tersendat saat daftar sedang di-scroll —
 * yang penting karena kartu ini justru muncul saat data sedang dimuat.
 */
export function Skeleton({
  width = '100%',
  height = 20,
  radius = Radius.sm,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
}) {
  const { colors } = useAppTheme();
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.skeleton },
        animatedStyle,
      ]}
    />
  );
}

/**
 * Bentuk kartu saat memuat.
 *
 * Ukurannya sengaja dibuat mirip `ReportCard` yang sudah memakai tipografi
 * baru, supaya tidak ada lompatan tata letak begitu data selesai dimuat.
 */
export function SkeletonCard() {
  const { colors } = useAppTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      // Bagi pembaca layar ini cuma hiasan; keadaan memuat sudah diumumkan
      // oleh layarnya masing-masing.
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <View style={styles.header}>
        <Skeleton width={52} height={52} radius={Radius.md} />
        <View style={styles.headerLines}>
          <Skeleton width="52%" height={14} />
          <Skeleton width="34%" height={12} />
        </View>
      </View>
      <Skeleton height={18} />
      <Skeleton height={15} width="90%" />
      <Skeleton height={15} width="65%" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 2,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerLines: {
    flex: 1,
    gap: Spacing.sm,
  },
});
