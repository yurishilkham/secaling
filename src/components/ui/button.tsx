import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  fullWidth = true,
  icon,
}: Props) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isOutline = variant === 'outline';

  const borderColor = isOutline ? theme.border : isDanger ? theme.danger : 'transparent';
  const textColor = isPrimary ? theme.onPrimary : isDanger ? theme.danger : theme.primary;

  const body = loading ? (
    <ActivityIndicator
      color={isPrimary ? theme.onPrimary : isDanger ? '#FFFFFF' : theme.primary}
    />
  ) : (
    <View style={styles.row}>
      {icon}
      <Text style={[styles.label, { color: textColor }]}>{title}</Text>
    </View>
  );

  const wrapStyle: ViewStyle = {
    borderColor,
    borderWidth: isOutline || isDanger ? 1.5 : 0,
    opacity: disabled ? 0.5 : 1,
    alignSelf: fullWidth ? 'stretch' : 'auto',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        wrapStyle,
        pressed ? styles.pressed : null,
        style,
      ]}>
      {isPrimary && !loading ? (
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}>
          {body}
        </LinearGradient>
      ) : (
        body
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
});