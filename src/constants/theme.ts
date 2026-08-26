import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#12241B',
    textSecondary: '#556B5F',
    textMuted: '#93A89D',
    background: '#F4F8F5',
    card: '#FFFFFF',
    border: '#E1ECE5',
    primary: '#059669',
    primaryDark: '#047857',
    primarySoft: '#E7F5EE',
    onPrimary: '#FFFFFF',
    danger: '#EF4444',
    dangerSoft: '#FDEBEB',
    success: '#10B981',
    successSoft: '#D1FAE5',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    overlay: 'rgba(18,36,27,0.55)',
  },
  dark: {
    text: '#EAF5EF',
    textSecondary: '#A8C4B6',
    textMuted: '#6E8B7C',
    background: '#0B1511',
    card: '#13241B',
    border: '#1F3B2C',
    primary: '#34D399',
    primaryDark: '#6EE7B7',
    primarySoft: '#163527',
    onPrimary: '#06281A',
    danger: '#F87171',
    dangerSoft: '#3A1717',
    success: '#34D399',
    successSoft: '#0F2E24',
    warning: '#FBBF24',
    warningSoft: '#33290E',
    overlay: 'rgba(2,10,7,0.6)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 } as const;

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#12241B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#12241B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
    },
    android: { elevation: 3 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#12241B',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

export const BottomTabInset = Platform.select({ ios: 112, android: 112, default: 96 }) ?? 96;
export const MaxContentWidth = 800;