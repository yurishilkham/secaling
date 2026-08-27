import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import { Platform, Pressable, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Springs } from '@/constants/theme';

type HapticType = 'light' | 'medium' | 'selection' | false;

type Props = Omit<PressableProps, 'style'> & {
  children?: ReactNode | ((pressed: boolean) => ReactNode);
  scaleTo?: number;
  haptic?: HapticType;
  style?: PressableProps['style'];
};

function triggerHaptic(type: HapticType) {
  if (type === false) return;
  if (Platform.OS === 'web') return;
  try {
    if (type === 'selection') Haptics.selectionAsync();
    else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export function PressableScale({
  children,
  scaleTo = 0.96,
  haptic = 'light',
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  style,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const pressedShared = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={(e) => {
        if (haptic !== false) triggerHaptic(haptic);
        onPress?.(e as any);
      }}
      onPressIn={(e) => {
        pressedShared.value = true;
        scale.value = withSpring(scaleTo, Springs.snappy);
        onPressIn?.(e as any);
      }}
      onPressOut={(e) => {
        pressedShared.value = false;
        scale.value = withSpring(1, Springs.gentle);
        onPressOut?.(e as any);
      }}
      style={(state) => {
        const base = typeof style === 'function' ? (style as any)(state) : style;
        // biar web tetap dapat opacity feedback kalau animasi lambat
        return base;
      }}
      {...rest}>
      {(state) => {
        const content = typeof children === 'function' ? (children as any)(state.pressed) : children;
        return <Animated.View style={[{ opacity: disabled ? 0.5 : 1 }, animatedStyle]}>{content}</Animated.View>;
      }}
    </Pressable>
  );
}
