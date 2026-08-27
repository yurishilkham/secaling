import { Platform, TextStyle } from 'react-native';

/**
 * TIPOGRAFI SECALING
 *
 * Kenapa file ini ada:
 * sebelumnya ada 22 ukuran font berbeda yang ditulis langsung di 45 file
 * (10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, ...).
 * Sekarang tinggal 9 varian, dan ukuran badan teks naik dari 13.5 -> 17
 * karena pemakai utama app ini adalah warga desa, banyak yang berusia 50+.
 *
 * CATATAN PENTING SOAL ANDROID:
 * di Android, `fontWeight` TIDAK bisa diandalkan untuk font kustom — sistem
 * akan mencoba menebalkan sendiri (fake bold) dan hasilnya jelek. Jadi setiap
 * varian membawa `fontFamily` eksplisit per berat, dan `fontWeight` sengaja
 * TIDAK dipakai sama sekali.
 */

// Nama ini = nama file font tanpa ekstensi, dan sekaligus PostScript name-nya.
// Android memakai nama file, iOS memakai nama internal font. Karena keduanya
// sama, satu nilai ini berlaku di dua platform. Diverifikasi dengan
// `node scripts/font-names.mjs`.
export const FontFamily = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semibold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extrabold: 'PlusJakartaSans-ExtraBold',
} as const;

export type FontFamilyKey = keyof typeof FontFamily;

/** Semua nama font yang dipakai — untuk dicek sudah termuat atau belum. */
export const ALL_FONT_FAMILIES = Object.values(FontFamily);

// ---------------------------------------------------------------------------
// Ukuran huruf pilihan warga (bukan setelan HP)
// ---------------------------------------------------------------------------

/**
 * Banyak warga lansia tidak tahu setelan ukuran huruf HP ada di mana, jadi
 * kita sediakan sendiri di dalam app. Nilai ini mengalikan ukuran font DAN
 * tinggi baris, sehingga teks tetap enak dibaca (bukan cuma jadi besar lalu
 * bertumpuk).
 */
export type FontScaleKey = 'normal' | 'besar' | 'sangat-besar';

export const FONT_SCALES: Record<FontScaleKey, number> = {
  normal: 1,
  besar: 1.15,
  'sangat-besar': 1.3,
};

export const FONT_SCALE_OPTIONS: {
  key: FontScaleKey;
  label: string;
  desc: string;
}[] = [
  { key: 'normal', label: 'Normal', desc: 'Ukuran biasa' },
  { key: 'besar', label: 'Besar', desc: 'Lebih mudah dibaca' },
  { key: 'sangat-besar', label: 'Sangat Besar', desc: 'Untuk mata lelah' },
];

// ---------------------------------------------------------------------------
// Varian teks
// ---------------------------------------------------------------------------

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'secondary'
  | 'label'
  | 'caption'
  | 'badge'
  | 'button';

type VariantSpec = {
  size: number;
  lineHeight: number;
  family: FontFamilyKey;
  letterSpacing?: number;
  /**
   * Batas pembesaran dari setelan HP. Ini BUKAN untuk menghalangi warga
   * memperbesar teks — untuk itu ada `FONT_SCALES` di atas yang tanpa batas
   * praktis. Batas ini mencegah skala HP (Android bisa sampai 2x) BERTUMPUK
   * dengan skala in-app kita sampai 2.6x dan merusak tata letak.
   */
  maxMultiplier: number;
  uppercase?: boolean;
};

const SPECS: Record<TextVariant, VariantSpec> = {
  // Judul besar di hero Beranda.
  display: { size: 30, lineHeight: 37, family: 'extrabold', letterSpacing: -0.6, maxMultiplier: 1.3 },

  // Judul halaman. Menggantikan campuran 26/'800', 26/'900', dan 23/'900'.
  title: { size: 24, lineHeight: 31, family: 'bold', letterSpacing: -0.4, maxMultiplier: 1.35 },

  // Judul bagian, judul kartu besar.
  heading: { size: 19, lineHeight: 26, family: 'bold', letterSpacing: -0.2, maxMultiplier: 1.4 },

  // TEKS UTAMA. Naik dari 13.5 -> 17. Ini perubahan tunggal yang paling
  // terasa bagi pembaca berusia 50+.
  body: { size: 17, lineHeight: 25, family: 'regular', maxMultiplier: 1.6 },

  // Judul di dalam kartu laporan/pengumuman.
  bodyStrong: { size: 17, lineHeight: 24, family: 'semibold', letterSpacing: -0.1, maxMultiplier: 1.6 },

  // Keterangan pendukung di bawah judul.
  secondary: { size: 15, lineHeight: 22, family: 'regular', maxMultiplier: 1.6 },

  // Label di atas kolom isian.
  label: { size: 15, lineHeight: 20, family: 'semibold', letterSpacing: 0.1, maxMultiplier: 1.5 },

  // Waktu, nama pelapor, teks pendukung terkecil. Ini BATAS TERKECIL —
  // tidak boleh ada teks di app ini yang lebih kecil dari 13.
  caption: { size: 13, lineHeight: 18, family: 'medium', maxMultiplier: 1.7 },

  // Lencana: "PENTING", nama kategori, status laporan.
  badge: { size: 13, lineHeight: 16, family: 'bold', letterSpacing: 0.3, maxMultiplier: 1.4 },

  // Teks di dalam tombol.
  button: { size: 17, lineHeight: 22, family: 'bold', letterSpacing: 0.1, maxMultiplier: 1.4 },
};

export type ResolvedTextStyle = TextStyle & {
  /** Diteruskan ke prop `maxFontSizeMultiplier` milik <Text>, bukan ke style. */
  maxFontSizeMultiplier: number;
};

/**
 * Dibulatkan supaya tidak ada nilai pecahan aneh seperti 19.549999.
 * Android merender tinggi baris pecahan dengan tidak konsisten antar HP.
 */
function round(n: number): number {
  return Math.round(n * 2) / 2;
}

/**
 * Membangun seluruh gaya teks untuk satu tingkat ukuran huruf.
 * Dipanggil sekali per perubahan setelan (di-memo di `use-app-theme`),
 * bukan setiap kali render.
 */
export function buildTypography(scaleKey: FontScaleKey): Record<TextVariant, ResolvedTextStyle> {
  const scale = FONT_SCALES[scaleKey] ?? 1;
  const out = {} as Record<TextVariant, ResolvedTextStyle>;

  for (const key of Object.keys(SPECS) as TextVariant[]) {
    const spec = SPECS[key];
    out[key] = {
      fontFamily: FontFamily[spec.family],
      fontSize: round(spec.size * scale),
      lineHeight: round(spec.lineHeight * scale),
      ...(spec.letterSpacing !== undefined ? { letterSpacing: spec.letterSpacing } : null),
      ...(spec.uppercase ? { textTransform: 'uppercase' as const } : null),
      // Android memberi jarak ekstra di atas/bawah teks yang membuat teks
      // tidak center di dalam tombol. Ini mematikannya.
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
      maxFontSizeMultiplier: spec.maxMultiplier,
    };
  }

  return out;
}

export type Typography = ReturnType<typeof buildTypography>;

/** Tipografi ukuran normal — untuk StyleSheet statis yang tidak butuh skala. */
export const BaseTypography = buildTypography('normal');
