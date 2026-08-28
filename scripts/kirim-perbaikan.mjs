// Kirim perbaikan JavaScript ke HP warga tanpa memasang ulang APK.
//
// Pemakaian:
//   node scripts/kirim-perbaikan.mjs "perbaiki tampilan foto"
//
// KENAPA PERLU SKRIP, BUKAN LANGSUNG `eas update`
//   Dua hal yang membuat perintah mentahnya gagal, dan keduanya tidak jelas
//   dari pesan errornya:
//
//     1. `eas update` TIDAK memuat `.env` sendiri. Tanpa itu Metro gagal saat
//        membundel dengan "supabaseUrl is required" — pesan yang seolah
//        menunjuk kesalahan kode, padahal cuma variabel lingkungan tidak
//        terbaca.
//
//     2. `--environment` wajib diisi kalau berjalan tanpa tanya-jawab.
//
//   Keduanya sempat menggagalkan pengiriman dua kali. Skrip ini mengurus
//   keduanya supaya tidak terulang.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const akar = resolve(import.meta.dirname, '..');
const pesan = process.argv.slice(2).join(' ').trim();

if (!pesan) {
  console.error('');
  console.error('Pesan perubahan wajib diisi.');
  console.error('');
  console.error('Contoh:');
  console.error('  npm run kirim-perbaikan "perbaiki tampilan foto"');
  console.error('');
  process.exit(1);
}

// --- Muat .env --------------------------------------------------------------
//
// Dibaca manual, bukan lewat pustaka, supaya tidak menambah ketergantungan
// hanya untuk satu skrip.
const berkasEnv = resolve(akar, '.env');
if (!existsSync(berkasEnv)) {
  console.error('');
  console.error('Berkas .env tidak ditemukan di akar proyek.');
  console.error('Tanpa itu, pembundelan gagal dengan "supabaseUrl is required".');
  console.error('');
  process.exit(1);
}

const env = { ...process.env };
let jumlahKunci = 0;

for (const baris of readFileSync(berkasEnv, 'utf8').split(/\r?\n/)) {
  const bersih = baris.trim();
  if (!bersih || bersih.startsWith('#')) continue;

  const pisah = bersih.indexOf('=');
  if (pisah < 0) continue;

  const kunci = bersih.slice(0, pisah).trim();
  // Tanda kutip di sekitar nilai dibuang — Metro menganggapnya bagian dari
  // nilai, dan URL berkutip menghasilkan error yang membingungkan.
  const nilai = bersih.slice(pisah + 1).trim().replace(/^["']|["']$/g, '');

  if (kunci) {
    env[kunci] = nilai;
    jumlahKunci++;
  }
}

console.log('');
console.log(`Memuat ${jumlahKunci} variabel dari .env`);
console.log(`Mengirim ke channel: production`);
console.log(`Pesan: ${pesan}`);
console.log('');

const hasil = spawnSync(
  process.platform === 'win32' ? 'eas.cmd' : 'eas',
  [
    'update',
    '--branch',
    'production',
    '--environment',
    'production',
    '--message',
    // Dikutip karena pesan berisi spasi, dan `shell: true` di Windows akan
    // memecahnya menjadi beberapa argumen kalau dibiarkan telanjang.
    process.platform === 'win32' ? `"${pesan.replace(/"/g, '')}"` : pesan,
  ],
  {
    cwd: akar,
    env,
    stdio: 'inherit',
    // `shell: true` diperlukan di Windows: `eas` terpasang sebagai berkas .cmd,
    // dan `spawnSync` tanpa shell tidak bisa menjalankannya walau ada di PATH.
    shell: process.platform === 'win32',
  },
);

if (hasil.error) {
  console.error('');
  console.error('Gagal menjalankan eas-cli. Pastikan sudah terpasang:');
  console.error('  npm install -g eas-cli');
  console.error('');
  process.exit(1);
}

if (hasil.status !== 0) {
  process.exit(hasil.status ?? 1);
}

console.log('');
console.log('Terkirim.');
console.log('');
console.log('Di HP: tutup Secaling sampai keluar dari daftar aplikasi terbaru,');
console.log('lalu buka lagi. Kalau sinyal lemah, mungkin perlu dua kali —');
console.log('app hanya menunggu 3 detik sebelum jalan dengan versi tersimpan.');
console.log('');
