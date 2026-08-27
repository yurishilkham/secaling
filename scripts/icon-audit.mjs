/**
 * Memeriksa aset ikon Secaling terhadap syarat Android & iOS.
 *
 * Jalankan: node scripts/icon-audit.mjs
 *
 * Yang diperiksa dan alasannya:
 *
 * 1. IKON ADAPTIF ANDROID. Peluncur memotong ikon jadi bentuk pilihannya
 *    (bulat, kotak membulat, kotak). Google menetapkan kanvas 108dp dengan
 *    hanya 72dp bagian tengah yang dijamin terlihat. Pada kanvas 1024px itu
 *    berarti lingkaran aman berdiameter 666px (radius 333px). Apa pun di luar
 *    itu bisa terpotong di sebagian HP.
 *
 * 2. IKON iOS TIDAK BOLEH TRANSPARAN. App Store menolak ikon dengan saluran
 *    alpha. Kalau transparan, area itu jadi hitam di HP.
 *
 * 3. IKON MONOKROM (Android 13+ "themed icon") harus satu warna dengan bentuk
 *    dibawa oleh alpha, karena sistem yang mewarnainya.
 */
import { existsSync } from 'node:fs';
import { statSync } from 'node:fs';

import { decodePng, maxOpaqueRadius, opaqueBounds, opaqueOutsideCircle } from './lib/png.mjs';

// Kanvas 108dp, zona aman 72dp -> 66.67%
const SAFE_RATIO = 72 / 108;

let problems = 0;
let checks = 0;

function ok(msg) {
  checks++;
  console.log(`  OK     ${msg}`);
}

function bad(msg) {
  checks++;
  problems++;
  console.log(`  MASALAH ${msg}`);
}

function info(msg) {
  console.log(`         ${msg}`);
}

function header(title, file) {
  console.log(`\n${'='.repeat(76)}`);
  console.log(title);
  console.log(`${file}${existsSync(file) ? ` (${Math.round(statSync(file).size / 1024)} KB)` : ''}`);
  console.log('='.repeat(76));
}

function hasAnyTransparency(img, threshold = 250) {
  for (let i = 3; i < img.data.length; i += 4) {
    if (img.data[i] < threshold) return true;
  }
  return false;
}

function countColors(img) {
  const set = new Set();
  for (let i = 0; i < img.width * img.height; i++) {
    const p = i * 4;
    if (img.data[p + 3] < 8) continue;
    set.add((img.data[p] << 16) | (img.data[p + 1] << 8) | img.data[p + 2]);
    if (set.size > 64) break;
  }
  return set.size;
}

// --- 1. Ikon utama / iOS ---
function auditMainIcon(file) {
  header('IKON UTAMA (iOS, dan cadangan bila ikon adaptif tak dipakai)', file);
  if (!existsSync(file)) return bad('berkas tidak ada');

  const img = decodePng(file);
  info(`kanvas ${img.width}x${img.height}`);

  if (img.width !== img.height) bad(`harus persegi, sekarang ${img.width}x${img.height}`);
  else if (img.width < 1024) bad(`minimal 1024x1024, sekarang ${img.width}`);
  else ok(`persegi ${img.width}x${img.height}`);

  if (hasAnyTransparency(img)) {
    bad('punya bagian transparan — App Store menolak ini, dan di HP jadi hitam');
  } else {
    ok('tidak ada bagian transparan');
  }

  const b = opaqueBounds(img);
  if (b) info(`isi mengisi ${((b.width / img.width) * 100).toFixed(0)}% lebar kanvas`);
}

// --- 2. Lapisan depan ikon adaptif Android ---
function auditForeground(file) {
  header('IKON ADAPTIF ANDROID — lapisan depan (logo)', file);
  if (!existsSync(file)) return bad('berkas tidak ada');

  const img = decodePng(file);
  info(`kanvas ${img.width}x${img.height}`);

  if (img.width !== img.height || img.width < 1024) {
    bad(`harus persegi minimal 1024x1024, sekarang ${img.width}x${img.height}`);
  } else {
    ok(`persegi ${img.width}x${img.height}`);
  }

  if (!hasAnyTransparency(img)) {
    bad('tidak ada bagian transparan — lapisan depan harus tembus di sekitar logo');
  } else {
    ok('ada bagian transparan di sekitar logo');
  }

  const safeRadius = (img.width * SAFE_RATIO) / 2;
  const reach = maxOpaqueRadius(img);
  const outside = opaqueOutsideCircle(img, safeRadius);

  info(`radius zona aman  : ${safeRadius.toFixed(0)}px (72dp dari kanvas 108dp)`);
  info(`jangkauan logo    : ${reach.toFixed(0)}px dari pusat`);

  if (reach <= safeRadius) {
    ok(`logo di dalam zona aman — tidak terpotong di bentuk peluncur apa pun`);
  } else {
    const over = ((reach / safeRadius - 1) * 100).toFixed(0);
    bad(`logo melewati zona aman ${over}% — ${(outside.ratio * 100).toFixed(1)}% piksel logo berisiko terpotong`);
    const suggested = ((safeRadius / reach) * 100).toFixed(0);
    info(`perbaikan: perkecil logo jadi ${suggested}% ukuran sekarang`);
  }

  const b = opaqueBounds(img);
  if (b) {
    const fill = Math.max(b.width / img.width, b.height / img.height);
    info(`kotak logo        : ${b.width}x${b.height} (${(fill * 100).toFixed(0)}% kanvas)`);
  }
}

// --- 3. Lapisan latar ikon adaptif ---
function auditBackground(file) {
  header('IKON ADAPTIF ANDROID — lapisan latar', file);
  if (!existsSync(file)) return bad('berkas tidak ada');

  const img = decodePng(file);
  info(`kanvas ${img.width}x${img.height}`);

  if (hasAnyTransparency(img)) {
    bad('lapisan latar harus penuh tanpa celah, kalau tidak akan tampak hitam saat dipotong');
  } else {
    ok('penuh tanpa celah');
  }

  const colors = countColors(img);
  if (colors === 1) {
    const p = img.data;
    const hex = `#${[p[0], p[1], p[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    ok(`satu warna rata ${hex}`);
  } else {
    info(`${colors > 64 ? 'lebih dari 64' : colors} warna berbeda`);
  }
}

// --- 4. Ikon monokrom ---
function auditMonochrome(file) {
  header('IKON MONOKROM (ikon berwarna tema, Android 13+)', file);
  if (!existsSync(file)) return bad('berkas tidak ada');

  const img = decodePng(file);
  info(`kanvas ${img.width}x${img.height}`);

  const colors = countColors(img);
  if (colors === 1) {
    ok('satu warna — benar, karena sistem yang akan mewarnainya');
  } else {
    bad(`${colors > 64 ? 'lebih dari 64' : colors} warna — seharusnya satu warna saja, bentuk dibawa oleh transparansi`);
  }

  if (!hasAnyTransparency(img)) {
    bad('tidak ada transparansi — bentuk ikon monokrom harus dibawa oleh alpha');
  } else {
    ok('bentuk dibawa oleh transparansi');
  }

  const safeRadius = (img.width * SAFE_RATIO) / 2;
  const reach = maxOpaqueRadius(img);
  info(`radius zona aman  : ${safeRadius.toFixed(0)}px`);
  info(`jangkauan bentuk  : ${reach.toFixed(0)}px`);
  if (reach <= safeRadius) ok('di dalam zona aman');
  else bad(`melewati zona aman ${((reach / safeRadius - 1) * 100).toFixed(0)}%`);
}

// --- 5. Gambar splash ---
function auditSplash(file) {
  header('GAMBAR SPLASH', file);
  if (!existsSync(file)) return bad('berkas tidak ada');

  const img = decodePng(file);
  info(`kanvas ${img.width}x${img.height}`);

  const colors = countColors(img);
  const p = img.data;
  let firstVisible = -1;
  for (let i = 0; i < img.width * img.height; i++) {
    if (p[i * 4 + 3] > 8) {
      firstVisible = i * 4;
      break;
    }
  }
  if (firstVisible >= 0) {
    const hex = `#${[p[firstVisible], p[firstVisible + 1], p[firstVisible + 2]]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')}`;
    info(`warna logo        : ${hex}${colors === 1 ? ' (satu warna)' : ` (${colors} warna)`}`);
  }

  if (hasAnyTransparency(img)) ok('transparan di sekitar logo — benar untuk splash');
  else bad('tidak transparan — kotak logo akan terlihat di atas warna latar splash');

  const b = opaqueBounds(img);
  if (b) {
    const fill = Math.max(b.width / img.width, b.height / img.height);
    info(`logo mengisi      : ${(fill * 100).toFixed(0)}% kanvas`);
  }
}

// --- 6. Favicon ---
function auditFavicon(file) {
  header('FAVICON (web)', file);
  if (!existsSync(file)) return bad('berkas tidak ada');
  const img = decodePng(file);
  info(`kanvas ${img.width}x${img.height}`);
  if (img.width >= 48) ok(`ukuran cukup (${img.width}px)`);
  else bad(`terlalu kecil (${img.width}px), minimal 48px`);
}

auditMainIcon('assets/images/icon.png');
auditForeground('assets/images/android-icon-foreground.png');
auditBackground('assets/images/android-icon-background.png');
auditMonochrome('assets/images/android-icon-monochrome.png');
auditSplash('assets/images/splash-icon.png');
auditFavicon('assets/images/favicon.png');

console.log(`\n${'='.repeat(76)}`);
console.log(`${checks} pemeriksaan, ${problems} masalah.`);
if (problems > 0) {
  console.log('Jalankan `node scripts/build-icons.mjs` untuk membuat ulang aset ikon.');
  process.exit(1);
}
console.log('Semua aset ikon memenuhi syarat.\n');
