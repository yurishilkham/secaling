import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { Radius, Shadows, Spacing, Springs, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type RouteName = 'index' | 'pengumuman' | 'profil';

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: { navigate: (name: string) => void };
};

function iconFor(name: RouteName, focused: boolean): keyof typeof Ionicons.glyphMap {
  switch (name) {
    case 'pengumuman':
      return focused ? 'megaphone' : 'megaphone-outline';
    case 'profil':
      return focused ? 'person' : 'person-outline';
    default:
      return focused ? 'home' : 'home-outline';
  }
}

function TabItem({
  focused,
  label,
  icon,
  onPress,
}: {
  focused: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') {
          try {
            Haptics.selectionAsync();
          } catch {}
        }
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.92, Springs.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, Springs.gentle);
      }}
      style={styles.item}
      hitSlop={6}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}>
      <Animated.View style={[animatedStyle, styles.itemInner]}>
        <View
          style={[
            styles.itemIcon,
            focused
              ? { backgroundColor: colors.primarySoft, borderColor: colors.primaryText }
              : { backgroundColor: 'transparent', borderColor: 'transparent' },
          ]}>
          <Ionicons name={icon} size={26} color={focused ? colors.primaryText : colors.textMuted} />
        </View>
        <AppText
          variant="caption"
          color={focused ? 'primary' : 'textMuted'}
          numberOfLines={1}
          style={styles.label}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Bilah tab bawah.
 *
 * Tiga tab ditambah satu tombol Lapor di tengah.
 *
 * Tombol Lapor BUKAN tab lagi — ia menavigasi ke `app/lapor.tsx`, halaman penuh
 * di luar kelompok tab. Sebelumnya Lapor adalah tab keempat, sehingga bilah tab
 * ikut tampil saat warga sedang menulis laporan: memakan ruang tepat ketika
 * papan tombol sudah menutupi separuh layar.
 *
 * Blur juga sudah dibuang dari sini sejak Tahap 1 — di Android
 * `blurMethod="dimezisBlurView"` tidak pernah aktif tanpa `blurTarget`, jadi
 * biaya render dibayar tanpa hasil.
 */
export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  // Beranda selalu di kiri, sisanya di kanan, dengan tombol Lapor di tengah.
  const kiri = state.routes.filter((r) => r.name === 'index');
  const kanan = state.routes.filter((r) => r.name !== 'index');

  function renderTab(route: { key: string; name: string }) {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const isFocused = state.index === index;
    const label = (descriptors[route.key].options.title ?? route.name) as string;

    return (
      <TabItem
        key={route.key}
        focused={isFocused}
        label={label}
        icon={iconFor(route.name as RouteName, isFocused)}
        onPress={() => {
          if (!isFocused) navigation.navigate(route.name);
        }}
      />
    );
  }

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}
      pointerEvents="box-none">
      <View
        style={[
          styles.barContainer,
          { backgroundColor: colors.card, borderColor: colors.border },
          Shadows.lg as object,
        ]}>
        <View style={styles.bar} accessibilityRole="tablist">
          {kiri.map(renderTab)}

          {/* Tombol Lapor — menavigasi ke halaman penuh, bukan berpindah tab. */}
          <View style={styles.fabSlot}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch {}
                }
                router.push('/lapor');
              }}
              onPressIn={() => {
                fabScale.value = withSpring(0.92, Springs.snappy);
              }}
              onPressOut={() => {
                fabScale.value = withSpring(1, Springs.bouncy);
              }}
              style={styles.fabPress}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Lapor kejadian"
              accessibilityHint="Membuka formulir laporan tiga langkah">
              <Animated.View style={fabStyle}>
                <View
                  style={[
                    styles.fab,
                    { backgroundColor: colors.primary, borderColor: colors.card },
                    Shadows.md as object,
                  ]}>
                  <Ionicons name="add" size={34} color={colors.onPrimary} />
                </View>
              </Animated.View>
              <AppText variant="caption" color="primary" numberOfLines={1}>
                Lapor
              </AppText>
            </Pressable>
          </View>

          {kanan.map(renderTab)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: 0,
    alignItems: 'center',
  },
  barContainer: {
    width: '100%',
    maxWidth: 480,
    borderRadius: Radius.xl,
    borderWidth: 2,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  item: {
    flex: 1,
    minHeight: Touch.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInner: {
    alignItems: 'center',
    gap: 2,
  },
  itemIcon: {
    width: 48,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  fabSlot: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fabPress: {
    alignItems: 'center',
    gap: 2,
    minHeight: Touch.comfortable,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // Naik ke atas bilah supaya jadi aksi paling menonjol.
    marginTop: -26,
    borderWidth: 3,
  },
});
