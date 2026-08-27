import { useAppTheme } from '@/hooks/use-app-theme';
import type { ThemeColors } from '@/constants/theme';

/**
 * Nama lama yang masih dipakai di banyak layar. Sekarang cuma penerus ke
 * `useAppTheme().colors`. Layar baru sebaiknya langsung memakai `useAppTheme`
 * karena di sana ada juga `type` (gaya teks) dan `sizeClass` (lebar layar).
 */
export function useTheme(): ThemeColors {
  return useAppTheme().colors;
}

export type { ThemeColors };
