import type { Ionicons } from '@expo/vector-icons';

import { CategoryColors, type CategoryColorKey, type CategoryPalette } from '@/constants/theme';

export type CategoryKey = CategoryColorKey;

export type Category = {
  key: CategoryKey;
  /** Nama pendek untuk lencana dan chip. */
  label: string;
  /**
   * Pertanyaan bantu yang muncul di halaman Lapor. Warga tidak selalu tahu
   * kejadiannya masuk kategori mana, jadi kategorinya dijelaskan pakai contoh
   * nyata, bukan cuma satu kata.
   */
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const CATEGORIES: Record<CategoryKey, Category> = {
  maling: {
    key: 'maling',
    label: 'Maling',
    hint: 'Pencurian, orang mencurigakan, perusakan',
    icon: 'warning',
  },
  kebakaran: {
    key: 'kebakaran',
    label: 'Kebakaran',
    hint: 'Rumah, kebun, atau sampah terbakar',
    icon: 'flame',
  },
  kecelakaan: {
    key: 'kecelakaan',
    label: 'Kecelakaan',
    hint: 'Tabrakan di jalan, orang terluka',
    icon: 'car-sport',
  },
  bencana: {
    key: 'bencana',
    label: 'Bencana Alam',
    hint: 'Banjir, angin kencang, tanah bergerak',
    icon: 'rainy',
  },
  kehilangan: {
    key: 'kehilangan',
    label: 'Kehilangan',
    hint: 'Barang, hewan ternak, atau orang hilang',
    icon: 'help-circle',
  },
  lainnya: {
    key: 'lainnya',
    label: 'Lainnya',
    hint: 'Kejadian lain yang perlu diketahui warga',
    icon: 'notifications',
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

/**
 * Warna kategori sekarang tinggal di `theme.ts` supaya ikut mode terang/gelap
 * dan bisa diverifikasi kontrasnya bersama palet lain.
 *
 * Dulu warnanya ditulis mati di file ini dan tidak pernah berubah di mode
 * gelap — "Bencana Alam" #0EA5E9 hanya punya kontras 2.77 terhadap kartu
 * putih, gagal WCAG AA cukup jauh.
 */
export function categoryColors(key: CategoryKey, isDark: boolean) {
  const palette: CategoryPalette = isDark ? CategoryColors.dark : CategoryColors.light;
  return {
    color: palette[key].color,
    soft: palette[key].soft,
    /** Warna teks yang harus dipakai DI ATAS `color` (mis. chip terpilih). */
    onColor: palette.onCategory,
  };
}

/** Nama lama — masih dipakai layar yang belum dirombak. */
export function categorySoft(key: CategoryKey, isDark: boolean): string {
  return categoryColors(key, isDark).soft;
}
