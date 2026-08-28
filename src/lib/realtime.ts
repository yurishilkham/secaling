import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * Pembantu untuk saluran realtime Supabase.
 *
 * MASALAH YANG DISELESAIKAN
 *   `supabase.channel('nama')` TIDAK selalu membuat saluran baru. Kalau saluran
 *   dengan nama itu masih ada, yang lama dikembalikan (lihat
 *   `RealtimeClient.js` — `channel()` memeriksa `getChannels()` lebih dulu).
 *
 *   Dan `RealtimeChannel.on()` MELEMPAR ERROR kalau dipanggil pada saluran yang
 *   sudah `subscribe()`:
 *
 *     Error: cannot add `postgres_changes` callbacks for
 *            realtime:home-realtime after `subscribe()`
 *
 *   Rangkaiannya seperti ini di layar beranda:
 *
 *     1. Warga masuk lewat Google
 *     2. `HomeScreen` dilepas, lalu dipasang ulang
 *     3. Pembersihan memanggil `removeChannel` — tapi itu `async` dan tidak
 *        ditunggu, jadi saluran lamanya BELUM selesai dibuang
 *     4. Pemasangan baru memanggil `channel('home-realtime')` -> dapat saluran
 *        LAMA yang masih aktif
 *     5. `.on()` dipanggil -> error dilempar, seluruh layar gagal dirender
 *
 *   Akibatnya beranda berhenti memperbarui laporan secara langsung. Untuk app
 *   peringatan keamanan desa itu serius: laporan maling baru tidak muncul
 *   sampai warga menarik layar untuk menyegarkan.
 *
 * CARA MENGHINDARINYA
 *   Beri nama unik untuk setiap pemasangan komponen. Dengan begitu tidak ada
 *   lagi saluran lama yang bisa dikembalikan, dan urutan pembersihan tidak lagi
 *   menentukan.
 */

let nomorUrut = 0;

/**
 * Nama saluran yang dijamin belum pernah dipakai di sesi app ini.
 *
 * Nomor urut cukup — nama hanya perlu unik di dalam satu proses, bukan antar
 * perangkat. Memakai penanda acak justru menyulitkan penelusuran log.
 */
export function namaSaluranUnik(dasar: string): string {
  nomorUrut += 1;
  return `${dasar}-${nomorUrut}`;
}

/**
 * Buang saluran dengan aman, tanpa membuat layar gagal kalau prosesnya
 * bermasalah.
 *
 * `removeChannel` mengembalikan `Promise`, dan kegagalannya tidak pernah
 * penting bagi warga — saluran yang gagal dibuang akan hilang sendiri saat
 * sambungannya tertutup.
 */
export function buangSaluran(channel: RealtimeChannel) {
  try {
    const hasil = supabase.removeChannel(channel);
    // `removeChannel` bisa mengembalikan `Promise` maupun nilai biasa,
    // tergantung versi pustaka. Diperiksa dulu supaya tidak melempar.
    if (hasil && typeof (hasil as Promise<unknown>).catch === 'function') {
      (hasil as Promise<unknown>).catch((e) => {
        console.warn('[secaling] realtime: gagal membuang saluran', e);
      });
    }
  } catch (e) {
    console.warn('[secaling] realtime: gagal membuang saluran', e);
  }
}
