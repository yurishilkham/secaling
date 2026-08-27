import { useCallback } from 'react';

import { CATEGORIES, type Category, type CategoryKey, categoryColors } from '@/constants/categories';
import { useAppTheme } from '@/hooks/use-app-theme';

export type ResolvedCategory = Category & {
  /** Warna utuh: teks/ikon di atas kartu, atau isian chip terpilih. */
  color: string;
  /** Latar lembut untuk kotak ikon dan chip tidak terpilih. */
  soft: string;
  /** Warna teks yang wajib dipakai DI ATAS `color`. */
  onColor: string;
};

/**
 * Menggabungkan data kategori (label, contoh, ikon) dengan warnanya yang sudah
 * disesuaikan mode terang/gelap.
 *
 * Dipakai begini supaya tidak ada layar yang mengambil warna kategori langsung
 * dari konstanta — dulu itu penyebab warna kategori tidak pernah berubah di
 * mode gelap.
 */
export function useCategory() {
  const { isDark } = useAppTheme();

  return useCallback(
    (key: CategoryKey): ResolvedCategory => {
      const base = CATEGORIES[key] ?? CATEGORIES.lainnya;
      return { ...base, ...categoryColors(base.key, isDark) };
    },
    [isDark],
  );
}
