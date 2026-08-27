/**
 * Memeriksa aturan UI yang mudah dilanggar diam-diam saat menulis kode.
 *
 * Jalankan: node scripts/ui-audit.mjs
 *
 * Alasan tiap pemeriksaan ada — semuanya masalah nyata yang ditemukan di audit:
 *
 *   1. Warna hex mentah. Tidak ikut berubah di mode gelap, dan tidak pernah
 *      ikut diverifikasi kontrasnya.
 *   2. Teks lebih kecil dari 13px. Terlalu kecil untuk pembaca berusia 50+.
 *   3. Elemen bisa-ditekan lebih pendek dari 48px.
 *   4. `Alert.alert` atau `window.confirm` untuk validasi dan konfirmasi.
 *   5. `error.message` mentah dari Supabase ditampilkan ke warga.
 *   6. Jargon developer di teks yang dibaca warga.
 *   7. `BlurView` (di Android tidak pernah aktif, tapi biayanya tetap dibayar).
 *
 * Pemeriksaan sengaja dibuat ketat pada BERKAS TAMPILAN saja (`app/`,
 * `components/`). Berkas di `lib/` dan `hooks/` memang perlu menyebut istilah
 * teknis — di sanalah error mentah diterjemahkan — jadi memaksa aturan yang
 * sama di sana hanya menghasilkan tuduhan palsu, dan alat yang sering salah
 * akhirnya diabaikan orang.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

/** Tempat token dibuat — nilai mentah memang seharusnya ada di sini. */
const TOKEN_FILES = ['constants/theme.ts', 'constants/typography.ts'];

/**
 * Berkas yang tugasnya justru menangani hal teknis:
 *   lib/errors.ts       mencocokkan teks error Supabase (harus menyebut aslinya)
 *   lib/supabase.ts     penyetelan klien
 *   lib/google-auth.ts  alur OAuth
 *   hooks/use-auth-forms.ts  membangun objek Error internal sebelum diterjemahkan
 */
const TECHNICAL_FILES = [
  'lib/errors.ts',
  'lib/supabase.ts',
  'lib/google-auth.ts',
  'lib/notifications.ts',
  'lib/imgbb.ts',
  'lib/auth.tsx',
  'hooks/use-auth-forms.ts',
];

/** Hanya berkas ini yang diperiksa soal jargon dan pesan error. */
function isUiFile(rel) {
  return rel.startsWith('app/') || rel.startsWith('components/');
}

/** Buang komentar, pertahankan nomor baris dan kolom. */
function stripComments(src) {
  let out = '';
  let i = 0;
  let inLine = false;
  let inBlock = false;
  let inString = null;

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (inLine) {
      if (c === '\n') {
        inLine = false;
        out += c;
      } else out += ' ';
      i++;
      continue;
    }
    if (inBlock) {
      if (c === '*' && next === '/') {
        inBlock = false;
        out += '  ';
        i += 2;
        continue;
      }
      out += c === '\n' ? '\n' : ' ';
      i++;
      continue;
    }
    if (inString) {
      out += c;
      if (c === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (c === inString) inString = null;
      i++;
      continue;
    }
    if (c === '/' && next === '/') {
      inLine = true;
      out += '  ';
      i += 2;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlock = true;
      out += '  ';
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inString = c;
      out += c;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Ambil hanya bagian yang benar-benar dibaca warga.
 *
 * Yang dibuang:
 *   - string yang tidak punya spasi (hampir selalu kunci, rute, atau nama)
 *   - perbandingan tipe `typeof x === 'undefined'`
 */
function userFacingText(line) {
  if (/typeof\s+\w+\s*[=!]==?\s*['"]/.test(line)) return '';

  const chunks = [];

  const strings = line.match(/'[^']*'|"[^"]*"|`[^`]*`/g);
  if (strings) {
    for (const s of strings) {
      const inner = s.slice(1, -1);
      // Teks untuk manusia hampir selalu punya spasi. Ini menyaring
      // 'email-address', 'auth/callback', 'chevron-forward', dan sejenisnya.
      if (/\s/.test(inner) && /[a-zA-Z]{3}/.test(inner)) chunks.push(inner);
    }
  }

  const jsx = line.match(/>([^<>{}]+)</g);
  if (jsx) {
    for (const s of jsx) {
      const inner = s.slice(1, -1).trim();
      if (inner && /[a-zA-Z]{3}/.test(inner)) chunks.push(inner);
    }
  }

  return chunks.join(' | ');
}

/** Istilah yang tidak boleh sampai ke mata warga. */
const JARGON = [
  'liquid glass',
  'GlassView',
  'Telegram 12.10',
  'di-promote',
  'via DB',
  'role di-profiles',
  'Supabase',
  'error 429',
  'Rate Limit',
  'Redirect tidak',
  'tap untuk',
  'email+password',
  'aksen merah',
  'tidak sinkron',
  'HTTP ',
  'row-level',
  'RLS',
  'JSON',
  'API',
  'token_hash',
  'base64',
];

/**
 * Nama variabel yang menandakan error MENTAH dari Supabase.
 *
 * `failure.message` dan `banner.message` sengaja tidak masuk daftar: itu objek
 * hasil `friendlyError()` yang isinya justru sudah bahasa Indonesia.
 */
const RAW_ERROR_VARS = [
  'error',
  'err',
  'e',
  'loadError',
  'deleteError',
  'insertError',
  'updateError',
  'verifyError',
  'exchangeError',
  'profileError',
  'resendError',
  'passError',
];

const findings = { errors: [], warnings: [] };

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const isToken = TOKEN_FILES.includes(rel);
  const isTechnical = TECHNICAL_FILES.includes(rel);
  const checkText = isUiFile(rel);

  const lines = stripComments(readFileSync(file, 'utf8')).split(/\r?\n/);

  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (!line.trim()) return;

    // --- 1. Hex mentah ---
    if (!isToken) {
      const hex = line.match(/['"]#[0-9a-fA-F]{6}['"]/g);
      if (hex) findings.warnings.push(`${at}  warna hex mentah ${hex.join(' ')}`);
    }

    // --- 2. Ukuran teks ---
    const fs = line.match(/fontSize:\s*([0-9.]+)/);
    if (fs && !isToken) {
      const size = parseFloat(fs[1]);
      if (size < 13) findings.errors.push(`${at}  fontSize ${size} (minimum 13)`);
      else findings.warnings.push(`${at}  fontSize ${size} ditulis langsung — pakai AppText`);
    }

    // --- 3. Target sentuh ---
    const mh = line.match(/minHeight:\s*([0-9]+)/);
    if (mh) {
      const h = parseInt(mh[1], 10);
      if (h < 48 && h >= 20) {
        findings.errors.push(`${at}  minHeight ${h} pada elemen bisa ditekan (minimum 48)`);
      }
    }

    // --- 4. Alert / confirm ---
    if (/\bAlert\.alert\(/.test(line)) {
      findings.errors.push(`${at}  Alert.alert — pakai Input error / InlineBanner / ConfirmSheet`);
    }
    if (/window\.confirm/.test(line)) {
      findings.errors.push(`${at}  window.confirm — pakai ConfirmSheet`);
    }

    // --- 5. Error mentah ditampilkan (hanya di berkas tampilan) ---
    if (checkText) {
      for (const v of RAW_ERROR_VARS) {
        const pattern = new RegExp(
          `(message=|title=|children=|>\\s*\\{)\\s*\\{?\\s*${v}\\??\\.(message|msg)\\b`,
        );
        if (pattern.test(line)) {
          findings.errors.push(`${at}  ${v}.message ditampilkan mentah — pakai friendlyError()`);
          break;
        }
      }
    }

    // --- 6. Jargon (hanya di berkas tampilan) ---
    if (checkText && !isTechnical) {
      const text = userFacingText(line);
      if (text) {
        for (const term of JARGON) {
          if (text.includes(term)) {
            findings.errors.push(`${at}  jargon developer di teks: "${term}"`);
          }
        }
      }
    }

    // --- 7. expo-blur ---
    if (/from ['"]expo-blur['"]|from ['"]expo-glass-effect['"]/.test(line)) {
      findings.errors.push(`${at}  expo-blur / expo-glass-effect masih dipakai`);
    }
  });
}

function report(title, items, limit = 60) {
  console.log(`\n${'='.repeat(76)}`);
  console.log(`${title} (${items.length})`);
  console.log('='.repeat(76));
  if (!items.length) {
    console.log('  tidak ada');
    return;
  }
  for (const item of items.slice(0, limit)) console.log(`  ${item}`);
  if (items.length > limit) console.log(`  ... dan ${items.length - limit} lagi`);
}

report('HARUS DIPERBAIKI', findings.errors);
report('SEBAIKNYA DIPERBAIKI', findings.warnings);

console.log(`\n${'='.repeat(76)}`);
console.log(
  `${findings.errors.length} harus diperbaiki, ${findings.warnings.length} sebaiknya diperbaiki.`,
);
if (findings.errors.length > 0) process.exit(1);
console.log('Semua aturan UI terpenuhi.\n');
