import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { useColorScheme as useRNColorScheme, useWindowDimensions } from 'react-native';

import { Breakpoints, CategoryColors, Colors, type CategoryPalette, type ThemeColors } from '@/constants/theme';
import {
  buildTypography,
  FONT_SCALES,
  type FontScaleKey,
  type Typography,
} from '@/constants/typography';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type { FontScaleKey };

const THEME_KEY = '@secaling/theme-preference';
const FONT_SCALE_KEY = '@secaling/font-scale';

/** compact = HP murah/lama (<360dp), regular = mayoritas, wide = HP besar */
export type SizeClass = 'compact' | 'regular' | 'wide';

export type { CategoryPalette };

type AppThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  isDark: boolean;
  colors: ThemeColors;
  categoryColors: CategoryPalette;
  setPreference: (p: ThemePreference) => void;

  /** Ukuran huruf pilihan warga — tidak bergantung setelan HP. */
  fontScale: FontScaleKey;
  setFontScale: (s: FontScaleKey) => void;
  /** Pengali angka dari `fontScale`, untuk menskalakan ikon agar seimbang. */
  scaleFactor: number;
  type: Typography;

  /** Lebar layar sekarang, untuk memutuskan tata letak. */
  sizeClass: SizeClass;
  width: number;

  /** Setelan sudah selesai dibaca dari penyimpanan. */
  ready: boolean;
};

const AppThemeContext = React.createContext<AppThemeContextValue | null>(null);

function isThemePreference(v: unknown): v is ThemePreference {
  return v === 'light' || v === 'dark' || v === 'system';
}

function isFontScale(v: unknown): v is FontScaleKey {
  return v === 'normal' || v === 'besar' || v === 'sangat-besar';
}

function resolveSizeClass(width: number): SizeClass {
  if (width < Breakpoints.compact) return 'compact';
  if (width <= Breakpoints.regular) return 'regular';
  return 'wide';
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const { width } = useWindowDimensions();

  const [preference, setPreferenceState] = React.useState<ThemePreference>('light');
  const [fontScale, setFontScaleState] = React.useState<FontScaleKey>('normal');
  const [ready, setReady] = React.useState(false);

  // Dua setelan dibaca sekaligus supaya app hanya menunggu satu kali.
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [theme, scale] = await AsyncStorage.multiGet([THEME_KEY, FONT_SCALE_KEY]);
        if (!active) return;
        if (isThemePreference(theme[1])) setPreferenceState(theme[1]);
        if (isFontScale(scale[1])) setFontScaleState(scale[1]);
      } catch {
        // Penyimpanan gagal dibaca — pakai nilai bawaan. Bukan alasan untuk
        // menahan app supaya tidak terbuka.
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const resolved: ResolvedTheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const setPreference = React.useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(THEME_KEY, p).catch(() => {});
  }, []);

  const setFontScale = React.useCallback((s: FontScaleKey) => {
    setFontScaleState(s);
    AsyncStorage.setItem(FONT_SCALE_KEY, s).catch(() => {});
  }, []);

  // Membangun seluruh gaya teks itu tidak gratis, jadi hanya dihitung ulang
  // saat warga benar-benar mengubah ukuran huruf.
  const type = React.useMemo(() => buildTypography(fontScale), [fontScale]);

  const colors = Colors[resolved];
  const categoryColors = CategoryColors[resolved];
  const sizeClass = resolveSizeClass(width);
  const scaleFactor = FONT_SCALES[fontScale] ?? 1;

  const value = React.useMemo<AppThemeContextValue>(
    () => ({
      preference,
      resolved,
      isDark: resolved === 'dark',
      colors,
      categoryColors,
      setPreference,
      fontScale,
      setFontScale,
      scaleFactor,
      type,
      sizeClass,
      width,
      ready,
    }),
    [
      preference,
      resolved,
      colors,
      categoryColors,
      setPreference,
      fontScale,
      setFontScale,
      scaleFactor,
      type,
      sizeClass,
      width,
      ready,
    ],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = React.useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme harus dipakai di dalam <AppThemeProvider>');
  }
  return ctx;
}

/** Jalan pintas: cuma butuh warna. */
export function useColors(): ThemeColors {
  return useAppTheme().colors;
}

/** Jalan pintas: cuma butuh gaya teks. */
export function useType(): Typography {
  return useAppTheme().type;
}
