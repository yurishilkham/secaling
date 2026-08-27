/**
 * Membuat ulang seluruh aset ikon Secaling dari satu berkas induk.
 *
 * Jalankan: node scripts/build-icons.mjs
 * Lalu:     node scripts/icon-audit.mjs   (untuk memastikan hasilnya benar)
 *
 * Induk yang dipakai: assets/images/android-icon-foreground.png
 * Itu satu-satunya berkas 1024px yang berisi logo perisai dengan latar
 * transparan, jadi paling cocok jadi sumber.
 *
 * Yang diperbaiki:
 *   - Logo melewati zona aman ikon adaptif Android (jangkauan 350px, batas
 *     341px). Di peluncur berbentuk bulat, ujung perisai bisa terpotong.
 *   - Warna latar ikon disamakan tepat dengan `primarySoft` di palet.
 *   - Ditambah `logo.png` dan `logo-white.png` untuk dipakai DI DALAM app,
 *     karena sebelumnya app memakai ikon `shield-checkmark` bawaan Ionicons
 *     sebagai pengganti logo, bukan logo Secaling yang sebenarnya.
 */
import {
  canvas,
  composite,
  crop,
  decodePng,
  encodePng,
  maxOpaqueRadius,
  opaqueBounds,
  parseHex,
  resize,
  tint,
} from './lib/png.mjs';

const MASTER = 'assets/images/android-icon-foreground.png';

// Harus sama dengan `primarySoft` di src/constants/theme.ts
const BRAND_SOFT = '#E7F5EE';

// Kanvas 108dp dengan zona aman 72dp. Pada 1024px, radius amannya 341px.
const SAFE_RADIUS_1024 = (1024 * (72 / 108)) / 2;

/**
 * Menempatkan logo di tengah kanvas, diskalakan sehingga titik terjauhnya dari
 * pusat tepat `targetReach` piksel.
 *
 * Memakai jangkauan radial, bukan lebar kotak pembatas: logo perisai tidak
 * mengisi sudut kotaknya, jadi mengukur pakai kotak akan membuat logo
 * diperkecil lebih dari yang perlu.
 */
function place(master, size, targetReach, color = null) {
  const bounds = opaqueBounds(master);
  if (!bounds) throw new Error('berkas induk kosong');

  const logo = crop(master, bounds);
  const currentReach = maxOpaqueRadius(master);

  // Skala di kanvas induk, lalu dipetakan ke kanvas keluaran
  const scale = (targetReach / currentReach) * (size / master.width);
  const w = Math.max(1, Math.round(logo.width * scale));
  const h = Math.max(1, Math.round(logo.height * scale));

  let scaled = resize(logo, w, h);
  if (color) scaled = tint(scaled, color);

  const out = canvas(size, size);
  composite(out, scaled, Math.round((size - w) / 2), Math.round((size - h) / 2));
  return out;
}

function placeOnBackground(master, size, targetReach, bgHex) {
  const fg = place(master, size, targetReach);
  const out = canvas(size, size, bgHex);
  return composite(out, fg, 0, 0);
}

/** Rasio kontras WCAG, untuk memeriksa logo terhadap latar ikon. */
function contrast(hexA, hexB) {
  const lum = (hex) => {
    const { r, g, b } = parseHex(hex);
    const lin = (v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const l1 = lum(hexA);
  const l2 = lum(hexB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Warna rata-rata bagian terlihat — untuk mengukur kontras logo vs latar. */
function averageVisibleColor(img) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < img.width * img.height; i++) {
    const p = i * 4;
    if (img.data[p + 3] < 128) continue;
    r += img.data[p];
    g += img.data[p + 1];
    b += img.data[p + 2];
    n++;
  }
  if (!n) return '#000000';
  return `#${[r / n, g / n, b / n]
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`;
}

const master = decodePng(MASTER);
console.log(`Induk: ${MASTER} (${master.width}x${master.height})`);
console.log(`Jangkauan logo di induk: ${maxOpaqueRadius(master).toFixed(0)}px dari pusat\n`);

const logoAvg = averageVisibleColor(master);
const ratio = contrast(logoAvg, BRAND_SOFT);
console.log(`Warna rata-rata logo   : ${logoAvg}`);
console.log(`Latar ikon             : ${BRAND_SOFT}`);
console.log(
  `Kontras logo vs latar  : ${ratio.toFixed(2)} ${ratio >= 3 ? '(cukup untuk grafis besar)' : '(TERLALU RENDAH)'}\n`,
);

const tasks = [
  {
    file: 'assets/images/android-icon-foreground.png',
    desc: 'lapisan depan ikon adaptif',
    // 300px memberi jarak 12% dari batas 341px, jadi aman di semua bentuk
    // peluncur (bulat, kotak membulat, kotak, dan bentuk khas pabrikan).
    build: () => place(master, 1024, 300),
  },
  {
    file: 'assets/images/android-icon-monochrome.png',
    desc: 'ikon monokrom Android 13+',
    // Bentuk sama, satu warna. Sistem yang mewarnai, tapi berkasnya harus
    // punya piksel berwarna agar alpha-nya terbaca.
    build: () => place(master, 1024, 300, '#FFFFFF'),
  },
  {
    file: 'assets/images/android-icon-background.png',
    desc: 'lapisan latar ikon adaptif',
    build: () => canvas(1024, 1024, BRAND_SOFT),
    opaque: true,
  },
  {
    file: 'assets/images/icon.png',
    desc: 'ikon utama iOS',
    // iOS tidak memotong ikon jadi bulat, cuma membulatkan sudutnya, jadi logo
    // boleh lebih besar. Wajib tanpa alpha — App Store menolak ikon transparan.
    build: () => placeOnBackground(master, 1024, 340, BRAND_SOFT),
    opaque: true,
  },
  {
    file: 'assets/images/splash-icon.png',
    desc: 'logo splash (putih di atas hijau)',
    build: () => place(master, 1024, 360, '#FFFFFF'),
  },
  {
    file: 'assets/images/favicon.png',
    desc: 'favicon web',
    build: () => place(master, 256, 108),
  },
  {
    file: 'assets/images/logo.png',
    desc: 'logo dalam app (latar terang)',
    // 512px cukup: pemakaian terbesar di app 96dp, di layar 3x jadi 288px.
    build: () => place(master, 512, 240),
  },
  {
    file: 'assets/images/logo-white.png',
    desc: 'logo dalam app (di atas hijau)',
    build: () => place(master, 512, 240, '#FFFFFF'),
  },
];

console.log('Membuat aset:');
for (const t of tasks) {
  const img = t.build();
  const bytes = encodePng(img, t.file, { opaque: !!t.opaque });
  const reach = maxOpaqueRadius(img);
  const safe = t.file.includes('android-icon-foreground') || t.file.includes('monochrome');
  const note = safe
    ? reach <= SAFE_RADIUS_1024
      ? ` zona aman OK (${reach.toFixed(0)}/${SAFE_RADIUS_1024.toFixed(0)}px)`
      : ` MELEWATI ZONA AMAN (${reach.toFixed(0)}/${SAFE_RADIUS_1024.toFixed(0)}px)`
    : '';
  console.log(
    `  ${t.file.replace('assets/images/', '').padEnd(32)} ${String(Math.round(bytes / 1024)).padStart(4)} KB  ${t.desc}${note}`,
  );
}

console.log('\nSelesai. Jalankan `node scripts/icon-audit.mjs` untuk memverifikasi.');
