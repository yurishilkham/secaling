import '@/global.css';

import { Platform } from 'react-native';

/**
 * PALET SECALING
 *
 * Semua pasangan warna di file ini sudah dihitung rasio kontrasnya dan
 * diverifikasi dengan `node scripts/check-contrast.mjs`. Angka di komentar
 * adalah rasio sebenarnya, bukan perkiraan.
 *
 * Target:
 *   - teks biasa          >= 4.5  (WCAG AA)
 *   - teks besar / ikon   >= 3.0
 *   - batas kolom isian   >= 3.0  (WCAG 1.4.11 non-text contrast)
 *
 * Yang berubah dari versi sebelumnya dan alasannya:
 *   - Efek kaca (blur) dibuang dari kartu. Teks di atas latar tembus pandang
 *     kontrasnya tidak bisa dijamin karena tergantung apa yang ada di
 *     belakangnya. Sekarang kartu putih solid. Blur tinggal dipakai di tab bar.
 *   - primary #059669 -> #047857. Teks putih di atas hijau lama hanya 3.77
 *     (gagal AA) padahal itu tombol paling penting di app. Sekarang 5.48.
 *   - textMuted #6B8A7D -> #4C6A5A. Dari 3.53 (gagal) jadi 5.97.
 *   - Semua warna kategori diperdalam. "Bencana Alam" #0EA5E9 hanya 2.77 —
 *     gagal total, padahal itu label kategori yang harus terbaca cepat.
 *
 */

const lightPalette = {
  // --- Teks ---
  text: '#0F1F17', //          17.09 di kartu putih, 15.67 di latar
  textSecondary: '#3D564A', //  7.99 di kartu putih
  textMuted: '#4C6A5A', //      5.97 di kartu putih (dulu 3.53 — gagal)
  textOnColor: '#FFFFFF',

  // --- Permukaan ---
  // 1.14 vs kartu putih. Sengaja lebih gelap dari abu-abu biasa supaya batas
  // kartu tetap terlihat di layar HP murah tanpa mengandalkan bayangan.
  background: '#ECF2EE',
  backgroundTilt: '#E3EBE6',
  card: '#FFFFFF',
  cardRaised: '#FFFFFF',

  // --- Garis ---
  border: '#D5E3DB', //         batas kartu, dekoratif
  borderStrong: '#6E9080', //   3.52 — batas kolom isian & tombol outline
  divider: '#E4EDE8',

  // --- Warna utama (hijau) ---
  primary: '#047857', //        isian tombol; putih di atasnya 5.48
  primaryDark: '#036049', //    ujung gradien; putih di atasnya 7.57
  primaryText: '#036049', //    7.57 — untuk teks & ikon hijau di kartu putih
  primarySoft: '#E7F5EE', //    primaryText di atasnya 6.74
  onPrimary: '#FFFFFF',

  // --- Status ---
  danger: '#B91C1C', //         6.47 di kartu putih
  dangerSoft: '#FCE8E8', //     danger di atasnya 5.50
  emergency: '#C81E1E', //      tombol darurat; putih di atasnya 5.74
  success: '#036049', //        7.57
  successSoft: '#DCF2E6', //    success di atasnya 6.45
  warning: '#B45309', //        5.02
  warningSoft: '#FDF4E3', //    warning di atasnya 4.60
  info: '#0369A1', //           5.93
  infoSoft: '#E2F1FA', //       info di atasnya 5.14

  overlay: 'rgba(15,31,23,0.62)',
  // Teks di atas `overlay` dan di atas foto. Selalu putih di kedua mode,
  // karena lapisan gelapnya sama di mode terang maupun gelap.
  onOverlay: '#FFFFFF',
  // Latar penampil foto layar penuh. Hitam pekat di kedua mode: foto bukti
  // harus dinilai tanpa warna lain di sekitarnya yang mengganggu.
  photoBackdrop: '#000000',
  skeleton: '#E4EDE8',

  // --- Bilah tab (satu-satunya tempat blur masih dipakai) ---
  // 0.94 supaya label tab tetap terbaca di atas isi apa pun yang lewat.
  tabBarBg: 'rgba(255,255,255,0.94)',
  tabBarBorder: '#D5E3DB',
} as const;

/**
 * Tipe warna diambil dari palet terang, lalu palet gelap dipaksa memenuhi
 * tipe yang sama. Tanpa ini TypeScript menyimpulkan tipe literal (`'#0F1F17'`
 * dan bukan `string`), sehingga palet gelap dianggap tidak cocok dan setiap
 * pemakaian warna jadi error.
 *
 * Efek sampingnya bagus: kalau ada nama warna yang lupa ditulis di palet
 * gelap, TypeScript langsung menolaknya di sini.
 */
export type ThemeColors = { readonly [K in keyof typeof lightPalette]: string };

const light: ThemeColors = lightPalette;

const dark: ThemeColors = {
  text: '#EAF5EF', //          14.22 di kartu gelap
  textSecondary: '#B4CCBE', //  9.32
  textMuted: '#9DB9AA', //      7.53
  textOnColor: '#0B1511',

  background: '#101A15',
  backgroundTilt: '#16221B',
  card: '#18251E', //           1.12 vs latar — kartu tetap terbaca terpisah
  cardRaised: '#1F2E26',

  border: '#2A3B31',
  borderStrong: '#628070', //   3.66 vs kartu
  divider: '#243329',

  // Di mode gelap tombol memakai hijau terang dengan teks GELAP di atasnya,
  // karena hijau gelap + teks putih akan tenggelam di latar gelap.
  primary: '#4ADE9E', //        teks gelap di atasnya 9.22
  primaryDark: '#34D399',
  primaryText: '#4ADE9E', //    9.25 di kartu gelap
  primarySoft: '#16352A', //    primaryText di atasnya 7.76
  onPrimary: '#06281A',

  danger: '#FCA5A5', //         8.37 di kartu gelap
  dangerSoft: '#3B1A1A', //     danger di atasnya 8.20
  emergency: '#E03131', //      putih di atasnya 4.51
  success: '#4ADE9E',
  successSoft: '#0F2E22', //    success di atasnya 8.53
  warning: '#FBBF24', //        9.51
  warningSoft: '#3A2E10', //    warning di atasnya 7.97
  info: '#38BDF8', //           7.41
  infoSoft: '#0E2A3C', //       info di atasnya 6.93

  overlay: 'rgba(2,8,5,0.68)',
  onOverlay: '#FFFFFF',
  photoBackdrop: '#000000',
  skeleton: '#243329',

  tabBarBg: 'rgba(24,37,30,0.94)',
  tabBarBorder: '#2A3B31',
};

export const Colors = { light, dark } as const;

export type ThemeColor = keyof ThemeColors;

// ---------------------------------------------------------------------------
// Warna kategori — ikut mode terang/gelap
// ---------------------------------------------------------------------------

/**
 * Dulu warna kategori ditulis mati di `categories.ts` dan tidak ikut mode
 * gelap. Sekarang ada di sini supaya bisa diverifikasi bareng palet lain.
 *
 * `color` dipakai dua arah dan dua-duanya sudah lolos AA:
 *   - sebagai teks/ikon di atas kartu
 *   - sebagai isian chip aktif, dengan `onCategory` sebagai teksnya
 */
export type CategoryColorKey =
  | 'maling'
  | 'kebakaran'
  | 'kecelakaan'
  | 'bencana'
  | 'kehilangan'
  | 'lainnya';

export type CategoryPalette = {
  readonly [K in CategoryColorKey]: { readonly color: string; readonly soft: string };
} & { readonly onCategory: string };

const categoryLight: CategoryPalette = {
  maling: { color: '#B91C1C', soft: '#FCE8E8' }, //     6.47 / teks 5.50
  kebakaran: { color: '#C2410C', soft: '#FEF0E7' }, //  5.18 / teks 4.64
  kecelakaan: { color: '#B45309', soft: '#FDF4E3' }, // 5.02 / teks 4.60
  bencana: { color: '#0369A1', soft: '#E2F1FA' }, //    5.93 / teks 5.14
  kehilangan: { color: '#6D28D9', soft: '#EDE7FC' }, // 7.10 / teks 5.90
  lainnya: { color: '#4B5563', soft: '#EEF0F2' }, //    7.56 / teks 6.62
  onCategory: '#FFFFFF',
};

const categoryDark: CategoryPalette = {
  maling: { color: '#F87171', soft: '#3B1A1A' }, //     5.74 / teks 5.63
  kebakaran: { color: '#FB923C', soft: '#3B2413' }, //  7.02 / teks 6.41
  kecelakaan: { color: '#FBBF24', soft: '#3A2E10' }, // 9.51 / teks 7.97
  bencana: { color: '#38BDF8', soft: '#0E2A3C' }, //    7.41 / teks 6.93
  kehilangan: { color: '#A78BFA', soft: '#251C40' }, // 5.84 / teks 5.85
  lainnya: { color: '#9CA3AF', soft: '#22272B' }, //    6.26 / teks 5.94
  onCategory: '#0B1511', //                            6.72–11.14
};

export const CategoryColors = { light: categoryLight, dark: categoryDark } as const;

// ---------------------------------------------------------------------------
// Jarak
// ---------------------------------------------------------------------------

/**
 * Nama lama (`one`, `two`, `three`) sudah dibuang — `three` ternyata 16px, dan
 * nama seperti itu tidak menjelaskan apa pun saat dibaca di tengah kode.
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export const Radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

// ---------------------------------------------------------------------------
// Ukuran target sentuh
// ---------------------------------------------------------------------------

/**
 * Sebelumnya ada tombol dengan tinggi 30px (tombol Kembali admin) dan link
 * 18px (ganti ke halaman daftar). Angka di bawah ini adalah lantai, bukan
 * saran — dinaikkan di atas minimum Android 48dp karena banyak pemakai lansia
 * dan jari yang kurang presisi.
 */
export const Touch = {
  /** Lantai mutlak. Tidak boleh ada elemen bisa-ditekan di bawah ini. */
  min: 48,
  /** Ukuran normal tombol & kolom isian. */
  comfortable: 56,
  /** Aksi utama: Kirim Laporan, Masuk, tombol darurat. */
  large: 64,
  /** Tombol ikon bulat (hapus, kembali, tutup). */
  icon: 48,
} as const;

// ---------------------------------------------------------------------------
// Bayangan
// ---------------------------------------------------------------------------

/**
 * Dinaikkan sedikit dari versi kaca. Tanpa blur, kartu butuh bayangan yang
 * cukup terlihat untuk memisahkan diri dari latar — terutama di layar HP murah
 * yang kontrasnya rendah dan sering dipakai di luar ruangan.
 */
export const Shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#0F1F17', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3 },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: '#0F1F17', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 8 },
    android: { elevation: 3 },
    default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: '#0F1F17', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16 },
    android: { elevation: 6 },
    default: {},
  }),
} as const;

// ---------------------------------------------------------------------------
// Gerak
// ---------------------------------------------------------------------------

export const Springs = {
  gentle: { damping: 20, stiffness: 220, mass: 0.9 },
  snappy: { damping: 18, stiffness: 320, mass: 0.8 },
  bouncy: { damping: 12, stiffness: 260, mass: 1 },
} as const;

export const Durations = { fast: 120, normal: 200, slow: 320 } as const;

// ---------------------------------------------------------------------------
// Tata letak
// ---------------------------------------------------------------------------

export const TabBarHeight = 78;
export const MaxContentWidth = 560;

/**
 * Titik-titik lebar layar. Diambil dari HP yang benar-benar dipakai di
 * Indonesia, bukan angka bulat:
 *   compact  <360  — Android murah/lama, mis. 320dp
 *   regular  360–412 — mayoritas HP
 *   wide     >412  — HP besar
 */
export const Breakpoints = { compact: 360, regular: 412 } as const;

