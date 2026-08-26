import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type RouteName = 'index' | 'lapor' | 'pengumuman' | 'profil';

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: { navigate: (name: string) => void };
};

function iconFor(
  name: RouteName,
  focused: boolean
): { icon: keyof typeof Ionicons.glyphMap; size: number } {
  switch (name) {
    case 'index':
      return { icon: focused ? 'home' : 'home-outline', size: 21 };
    case 'pengumuman':
      return { icon: focused ? 'megaphone' : 'megaphone-outline', size: 21 };
    case 'profil':
      return { icon: focused ? 'person' : 'person-outline', size: 21 };
    default:
      return { icon: 'add', size: 30 };
  }
}

export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Fallback solid colors agar tidak tembus saat theme belum ready (web SSR / colorScheme null)
  const card = theme?.card ?? '#FFFFFF';
  const border = theme?.border ?? '#E1ECE5';
  const background = theme?.background ?? '#F4F8F5';
  const primary = theme?.primary ?? '#059669';
  const primaryDark = theme?.primaryDark ?? '#047857';
  const primarySoft = theme?.primarySoft ?? '#E7F5EE';
  const onPrimary = theme?.onPrimary ?? '#FFFFFF';
  const textMuted = theme?.textMuted ?? '#93A89D';
  const textSecondary = theme?.textSecondary ?? '#556B5F';

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: background }]}>
      <View style={[styles.bar, { backgroundColor: card, borderColor: border, opacity: 1 }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const name = route.name as RouteName;
          const options = descriptors[route.key].options;
          const label = (options.title ?? name) as string;

          const onPress = () => {
            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };

          if (name === 'lapor') {
            return (
              <View key={route.key} style={styles.fabSlot}>
                <Pressable
                  onPress={onPress}
                  style={({ pressed }) => [styles.fabPress, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
                  <LinearGradient
                    colors={[primary, primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fab}>
                    <Ionicons name="add" size={32} color={onPrimary} />
                  </LinearGradient>
                  <Text style={[styles.fabLabel, { color: textSecondary }]}>Lapor</Text>
                </Pressable>
              </View>
            );
          }

          const { icon, size } = iconFor(name, isFocused);

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [styles.item, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
              <View
                style={[
                  styles.itemIcon,
                  isFocused ? { backgroundColor: primarySoft } : null,
                ]}>
                <Ionicons
                  name={icon}
                  size={size}
                  color={isFocused ? primary : textMuted}
                />
              </View>
              <Text
                style={[styles.label, { color: isFocused ? primary : textMuted }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    ...Shadows.lg,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.two,
  },
  itemIcon: {
    width: 38,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  fabSlot: {
    flex: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPress: {
    alignItems: 'center',
    gap: 2,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    borderWidth: 4,
    borderColor: 'transparent',
    ...Shadows.lg,
  },
  fabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});