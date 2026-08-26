/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme() as string | null | undefined;
  const normalized = (!scheme || scheme === 'unspecified' ? 'light' : scheme) as keyof typeof Colors;
  return Colors[normalized] ?? Colors.light;
}
