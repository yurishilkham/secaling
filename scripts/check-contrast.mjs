/**
 * Verifikasi rasio kontras seluruh palet Secaling terhadap WCAG 2.1.
 *
 * Jalankan: node scripts/check-contrast.mjs
 * Keluar dengan kode 1 kalau ada yang gagal, jadi bisa dipakai di CI.
 *
 * Ambang yang dipakai:
 *   4.5  teks biasa (AA)
 *   3.0  teks besar >=24px atau >=19px tebal, ikon, dan batas kolom isian (1.4.11)
 *   1.1  pembeda permukaan — bukan aturan WCAG, tapi kalau kartu putih di atas
 *        latar putih maka batas kartu hilang di layar HP murah
 */

// --- perhitungan ---

function srgbToLinear(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) throw new Error(`Warna harus 6 digit hex, dapat: ${hex}`);
  const r = srgbToLinear(parseInt(h.slice(0, 2), 16));
  const g = srgbToLinear(parseInt(h.slice(2, 4), 16));
  const b = srgbToLinear(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// --- palet (disalin dari src/constants/theme.ts) ---
// Disalin dengan sengaja, bukan diimpor: theme.ts memuat react-native yang
// tidak bisa dijalankan di node biasa. Kalau nilainya beda, tes di bawah gagal.

const light = {
  text: '#0F1F17',
  textSecondary: '#3D564A',
  textMuted: '#4C6A5A',
  background: '#ECF2EE',
  card: '#FFFFFF',
  border: '#D5E3DB',
  borderStrong: '#6E9080',
  primary: '#047857',
  primaryDark: '#036049',
  primaryText: '#036049',
  primarySoft: '#E7F5EE',
  onPrimary: '#FFFFFF',
  danger: '#B91C1C',
  dangerSoft: '#FCE8E8',
  emergency: '#C81E1E',
  success: '#036049',
  successSoft: '#DCF2E6',
  warning: '#B45309',
  warningSoft: '#FDF4E3',
  info: '#0369A1',
  infoSoft: '#E2F1FA',
  textOnColor: '#FFFFFF',
};

const dark = {
  text: '#EAF5EF',
  textSecondary: '#B4CCBE',
  textMuted: '#9DB9AA',
  background: '#101A15',
  card: '#18251E',
  border: '#2A3B31',
  borderStrong: '#628070',
  primary: '#4ADE9E',
  primaryDark: '#34D399',
  primaryText: '#4ADE9E',
  primarySoft: '#16352A',
  onPrimary: '#06281A',
  danger: '#FCA5A5',
  dangerSoft: '#3B1A1A',
  emergency: '#E03131',
  success: '#4ADE9E',
  successSoft: '#0F2E22',
  warning: '#FBBF24',
  warningSoft: '#3A2E10',
  info: '#38BDF8',
  infoSoft: '#0E2A3C',
  textOnColor: '#0B1511',
};

const categories = {
  light: {
    maling: { color: '#B91C1C', soft: '#FCE8E8' },
    kebakaran: { color: '#C2410C', soft: '#FEF0E7' },
    kecelakaan: { color: '#B45309', soft: '#FDF4E3' },
    bencana: { color: '#0369A1', soft: '#E2F1FA' },
    kehilangan: { color: '#6D28D9', soft: '#EDE7FC' },
    lainnya: { color: '#4B5563', soft: '#EEF0F2' },
    onCategory: '#FFFFFF',
  },
  dark: {
    maling: { color: '#F87171', soft: '#3B1A1A' },
    kebakaran: { color: '#FB923C', soft: '#3B2413' },
    kecelakaan: { color: '#FBBF24', soft: '#3A2E10' },
    bencana: { color: '#38BDF8', soft: '#0E2A3C' },
    kehilangan: { color: '#A78BFA', soft: '#251C40' },
    lainnya: { color: '#9CA3AF', soft: '#22272B' },
    onCategory: '#0B1511',
  },
};

// --- daftar yang diperiksa ---

const AA = 4.5;
const LARGE = 3.0;
const SURFACE = 1.1;

function buildChecks(t, cat, mode) {
  const checks = [];
  const add = (label, fg, bg, min) => checks.push({ label, fg, bg, min, mode });

  // Teks di atas kartu — jalur baca paling sering
  add('text di kartu', t.text, t.card, AA);
  add('textSecondary di kartu', t.textSecondary, t.card, AA);
  add('textMuted di kartu', t.textMuted, t.card, AA);

  // Teks di atas latar layar
  add('text di latar', t.text, t.background, AA);
  add('textSecondary di latar', t.textSecondary, t.background, AA);
  add('textMuted di latar', t.textMuted, t.background, AA);

  // Tombol utama — teks di atas kedua ujung gradien
  add('onPrimary di primary', t.onPrimary, t.primary, AA);
  add('onPrimary di primaryDark', t.onPrimary, t.primaryDark, AA);

  // Teks & ikon hijau
  add('primaryText di kartu', t.primaryText, t.card, AA);
  add('primaryText di latar', t.primaryText, t.background, AA);
  add('primaryText di primarySoft', t.primaryText, t.primarySoft, AA);
  add('text di primarySoft', t.text, t.primarySoft, AA);

  // Status
  add('danger di kartu', t.danger, t.card, AA);
  add('danger di dangerSoft', t.danger, t.dangerSoft, AA);
  add('putih di emergency', '#FFFFFF', t.emergency, AA);
  add('success di kartu', t.success, t.card, AA);
  add('success di successSoft', t.success, t.successSoft, AA);
  add('warning di kartu', t.warning, t.card, AA);
  add('warning di warningSoft', t.warning, t.warningSoft, AA);
  add('info di kartu', t.info, t.card, AA);
  add('info di infoSoft', t.info, t.infoSoft, AA);

  // Batas kolom isian & tombol outline — WCAG 1.4.11
  add('borderStrong vs kartu', t.borderStrong, t.card, LARGE);
  add('borderStrong vs latar', t.borderStrong, t.background, LARGE);

  // Pembeda permukaan
  add('kartu vs latar', t.card, t.background, SURFACE);

  // Lencana status laporan (Tahap 4).
  // Status "baru" memakai textSecondary supaya tidak mencuri perhatian dari
  // warna kategori; "ditangani" kuning; "selesai" hijau.
  add('status baru: teks di latar', t.textSecondary, t.background, AA);
  add('status ditangani: teks di soft', t.warning, t.warningSoft, AA);
  add('status selesai: teks di soft', t.success, t.successSoft, AA);
  // Saat terpilih di StatusControl, isian jadi warna penuh dengan teks onColor.
  add('status baru terpilih', t.textOnColor, t.textSecondary, AA);
  add('status ditangani terpilih', t.textOnColor, t.warning, AA);
  add('status selesai terpilih', t.textOnColor, t.success, AA);

  // Kategori: dua arah pemakaian
  for (const [key, c] of Object.entries(cat)) {
    if (key === 'onCategory') continue;
    add(`kategori ${key}: teks di kartu`, c.color, t.card, AA);
    add(`kategori ${key}: teks di soft`, c.color, c.soft, AA);
    add(`kategori ${key}: chip aktif`, cat.onCategory, c.color, AA);
  }

  return checks;
}

// --- jalankan ---

const all = [
  ...buildChecks(light, categories.light, 'terang'),
  ...buildChecks(dark, categories.dark, 'gelap'),
];

let failed = 0;
let currentMode = null;

for (const c of all) {
  if (c.mode !== currentMode) {
    currentMode = c.mode;
    console.log(`\n${'='.repeat(72)}\nMODE ${currentMode.toUpperCase()}\n${'='.repeat(72)}`);
  }
  const r = contrast(c.fg, c.bg);
  const ok = r >= c.min;
  if (!ok) failed++;
  const mark = ok ? 'OK  ' : 'GAGAL';
  console.log(
    `${mark} ${c.label.padEnd(34)} ${c.fg} / ${c.bg}  ${r.toFixed(2).padStart(6)}  (min ${c.min})`
  );
}

console.log(`\n${'='.repeat(72)}`);
console.log(`Total ${all.length} pasangan diperiksa, ${failed} gagal.`);

if (failed > 0) {
  console.log('\nAda pasangan warna yang gagal. Perbaiki src/constants/theme.ts.');
  process.exit(1);
}
console.log('Semua pasangan warna lolos ambang WCAG.\n');
