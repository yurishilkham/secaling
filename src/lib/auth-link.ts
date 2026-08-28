import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

/** Catat dengan awalan seragam supaya mudah disaring di log. */
function catat(pesan: string, detail?: unknown) {
  if (detail === undefined) {
    console.warn(`[secaling] tautan-auth: ${pesan}`);
    return;
  }
  console.warn(`[secaling] tautan-auth: ${pesan}`, detail);
}

/**
 * Ambil nilai dari bagian setelah `#` pada sebuah tautan.
 *
 * KENAPA PERLU
 *   Supabase mengirim token konfirmasi email di FRAGMENT, bukan query:
 *
 *     secaling://auth/callback#access_token=eyJ...&refresh_token=czy...&type=signup
 *                             ^ tanda pagar, bukan tanda tanya
 *
 *   `new URL(...).searchParams` tidak pernah melihat bagian ini. Versi
 *   sebelumnya hanya membaca query, jadi token diabaikan sepenuhnya dan warga
 *   melihat layar putih — baik saat mengonfirmasi pendaftaran maupun saat
 *   mengganti email.
 *
 *   Diverifikasi langsung ke Supabase: permintaan ke `/auth/v1/verify` menjawab
 *   `303` dengan `Location` berisi fragment seperti contoh di atas.
 */
export function bacaFragment(rawUrl: string): Record<string, string> {
  const posisi = rawUrl.indexOf('#');
  if (posisi < 0) return {};

  const isi = rawUrl.slice(posisi + 1);
  if (!isi) return {};

  const hasil: Record<string, string> = {};
  for (const bagian of isi.split('&')) {
    if (!bagian) continue;
    const pisah = bagian.indexOf('=');
    if (pisah < 0) continue;

    const kunci = decodeURIComponent(bagian.slice(0, pisah));
    const nilai = decodeURIComponent(bagian.slice(pisah + 1));
    if (kunci) hasil[kunci] = nilai;
  }
  return hasil;
}

export type HasilTautan =
  | { keadaan: 'berhasil' }
  | { keadaan: 'bukan-tautan-auth' }
  | { keadaan: 'gagal'; error: unknown };

/**
 * Tautan yang sedang atau sudah diproses, beserta hasilnya.
 *
 * KENAPA PERLU
 *   Satu tautan bisa tiba DUA KALI dari dua jalur berbeda:
 *
 *     1. Nilai kembalian `WebBrowser.openAuthSessionAsync` di `google-auth.ts`
 *     2. Deep link ke app, karena skema `secaling` terdaftar di manifest dan
 *        `MainActivity` memakai `launchMode="singleTask"`
 *
 *   Token PKCE dan token konfirmasi email HANYA BERLAKU SEKALI PAKAI. Jadi
 *   penukaran kedua selalu gagal dengan `flow_state_not_found`, lalu
 *   menampilkan pesan gagal ke warga — padahal sesinya sudah berhasil dibuat
 *   oleh penukaran pertama.
 *
 *   Ini terbukti di HP uji: sesi tercatat di Supabase pada 10:17:12.803, lalu
 *   error muncul di log pada 10:17:13.099 — 296 milidetik SETELAH berhasil.
 *
 *   Versi sebelumnya mencoba menambal ini dengan memeriksa sesi setelah gagal.
 *   Itu bergantung pada urutan waktu: kalau penukaran pertama belum selesai
 *   menulis ke penyimpanan HP, pemeriksaannya kosong dan error tetap muncul.
 *   Menyimpan `Promise`-nya menghilangkan penukaran keduanya sama sekali, jadi
 *   tidak ada lagi yang bergantung pada urutan.
 *
 * KENAPA PROMISE, BUKAN SEKADAR PENANDA "SUDAH DIPROSES"
 *   Kalau dua pemanggil datang hampir bersamaan, yang kedua harus MENUNGGU
 *   hasil yang pertama, bukan langsung dianggap gagal. Menyimpan `Promise`
 *   membuat keduanya menerima hasil yang sama.
 */
const sedangDiproses = new Map<string, Promise<HasilTautan>>();

/**
 * Batas jumlah tautan yang diingat.
 *
 * Peta ini tidak pernah dibersihkan sendiri, dan app bisa hidup berhari-hari di
 * HP warga. Tanpa batas, tiap tautan yang pernah dibuka menumpuk di memori.
 */
const BATAS_INGATAN = 20;

export async function terapkanTautanAuth(rawUrl: string): Promise<HasilTautan> {
  const sudahAda = sedangDiproses.get(rawUrl);
  if (sudahAda) {
    catat('tautan yang sama sudah diproses, memakai hasil yang sama');
    return sudahAda;
  }

  const janji = prosesTautan(rawUrl);
  sedangDiproses.set(rawUrl, janji);

  // Buang ingatan tertua kalau sudah terlalu banyak. `Map` di JavaScript
  // mempertahankan urutan penyisipan, jadi kunci pertama adalah yang tertua.
  if (sedangDiproses.size > BATAS_INGATAN) {
    const tertua = sedangDiproses.keys().next();
    if (!tertua.done) sedangDiproses.delete(tertua.value);
  }

  return janji;
}

/**
 * Bangun sesi dari tautan yang membuka app.
 *
 * Menangani TIGA bentuk tautan, dan ketiganya berbeda:
 *
 *   1. FRAGMENT   #access_token=...&refresh_token=...
 *                 Email konfirmasi pendaftaran dan ganti email.
 *   2. token_hash ?token_hash=...&type=...
 *                 Kalau template email diubah memakai `{{ .TokenHash }}`.
 *   3. code       ?code=...
 *                 Alur PKCE, terutama masuk dengan Google.
 *
 * Jangan dipanggil langsung — pakai `terapkanTautanAuth` supaya satu tautan
 * tidak diproses dua kali.
 */
async function prosesTautan(rawUrl: string): Promise<HasilTautan> {
  try {
    const frag = bacaFragment(rawUrl);

    // Supabase menaruh kegagalan di fragment juga, bukan sebagai status HTTP.
    if (frag.error || frag.error_description) {
      const pesan = frag.error_description || frag.error || 'Tautan tidak berlaku';
      catat(`tautan membawa kesalahan: ${pesan}`);
      return { keadaan: 'gagal', error: new Error(pesan) };
    }

    // --- Bentuk 1: token di fragment ---------------------------------------
    if (frag.access_token && frag.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: frag.access_token,
        refresh_token: frag.refresh_token,
      });
      if (error) {
        catat('setSession gagal', error.message);
        return { keadaan: 'gagal', error };
      }
      return { keadaan: 'berhasil' };
    }

    const parsed = Linking.parse(rawUrl);
    const ambil = (kunci: string): string | null => {
      const nilai = parsed.queryParams?.[kunci];
      return typeof nilai === 'string' ? nilai : null;
    };

    const errParam = ambil('error_description') ?? ambil('error');
    if (errParam) {
      catat(`tautan membawa kesalahan di query: ${errParam}`);
      return { keadaan: 'gagal', error: new Error(errParam) };
    }

    // --- Bentuk 2: token_hash ---------------------------------------------
    const tokenHash = ambil('token_hash');
    const type = ambil('type');
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as never,
      });
      if (error) {
        // Sama seperti pada kode PKCE: sesi yang nyata lebih menentukan
        // daripada error dari penukaran yang kalah cepat.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          catat('verifyOtp gagal tapi sesi sudah ada — dianggap berhasil');
          return { keadaan: 'berhasil' };
        }
        catat('verifyOtp gagal', error.message);
        return { keadaan: 'gagal', error };
      }
      return { keadaan: 'berhasil' };
    }

    // --- Bentuk 3: kode PKCE ---------------------------------------------
    const code = ambil('code');
    if (code) {
      const flowId = ambil('sb_flow_id') ?? undefined;
      const { error } = await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : (undefined as never),
      );
      if (error) {
        /**
         * Kalau penukaran gagal, periksa sesi dulu sebelum menyimpulkan gagal.
         *
         * Jaring terakhir. Penukaran ganda seharusnya sudah dicegah oleh
         * `sedangDiproses`, tapi kode yang sama bisa tiba dengan URL yang
         * BERBEDA — misalnya satu jalur membawa `sb_flow_id` dan jalur lain
         * tidak. Bagi peta itu keduanya tautan berbeda, jadi tetap ditukar dua
         * kali.
         *
         * Sesi yang benar-benar ada lebih menentukan daripada error dari
         * penukaran yang kalah cepat.
         */
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          catat('penukaran gagal tapi sesi sudah ada — dianggap berhasil');
          return { keadaan: 'berhasil' };
        }
        catat('exchangeCodeForSession gagal', error.message);
        return { keadaan: 'gagal', error };
      }
      return { keadaan: 'berhasil' };
    }

    return { keadaan: 'bukan-tautan-auth' };
  } catch (e) {
    catat('gagal memproses tautan', e);
    return { keadaan: 'gagal', error: e };
  }
}
