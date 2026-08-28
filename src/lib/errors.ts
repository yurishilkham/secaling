/**
 * Menerjemahkan error teknis menjadi bahasa yang bisa dimengerti warga.
 *
 * Sebelumnya `error.message` dari Supabase ditampilkan mentah-mentah di 13
 * tempat. Warga desa jadi membaca hal seperti:
 *   "JSON object requested, multiple (or no) rows returned"
 *   "AuthApiError: Invalid login credentials"
 *   "new row violates row-level security policy for table reports"
 *
 * Aturan yang dipegang di file ini:
 *   1. Selalu bahasa Indonesia sederhana.
 *   2. Selalu sebutkan apa yang harus dilakukan warga, bukan apa yang salah
 *      di sistem.
 *   3. Tidak pernah menyebut nama tabel, kode HTTP, nama vendor, atau istilah
 *      teknis apa pun.
 *   4. Kalau tidak dikenali, jatuh ke pesan umum yang tetap berguna.
 */

export type FriendlyError = {
  /** Judul singkat. */
  title: string;
  /** Penjelasan + langkah yang bisa diambil warga. */
  message: string;
  /** Bisa diselesaikan warga dengan mencoba lagi (mis. gangguan jaringan). */
  retryable: boolean;
};

/**
 * Pesan untuk error yang tidak dikenali aturan mana pun.
 *
 * SENGAJA TIDAK MENYEBUT INTERNET.
 *
 *   Versi sebelumnya berbunyi "Sambungan internet sepertinya sedang
 *   bermasalah". Karena pesan ini dipakai untuk SEMUA error tak dikenali, warga
 *   jadi dituduhi masalah sinyal untuk hal yang sama sekali bukan soal
 *   jaringan. Itu benar-benar terjadi pada kegagalan masuk dengan Google —
 *   internetnya baik, masuknya bahkan sudah berhasil, tapi pesannya menyuruh
 *   warga memeriksa sinyal.
 *
 *   Kasus jaringan yang sungguhan punya aturannya sendiri di `RULES` di bawah,
 *   yang mencocokkan `network request failed` dan sejenisnya. Jadi tidak ada
 *   yang hilang dengan mengubah pesan ini.
 */
const GENERIC: FriendlyError = {
  title: 'Ada gangguan',
  message: 'Ada gangguan sebentar. Coba ulangi sekali lagi.',
  retryable: true,
};

/** Mengambil teks error dari berbagai bentuk objek yang mungkin datang. */
function extractMessage(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>;
    for (const key of ['message', 'msg', 'error_description', 'details', 'hint']) {
      const v = e[key];
      if (typeof v === 'string' && v) return v;
    }
  }
  return '';
}

function extractCode(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const e = err as Record<string, unknown>;
  for (const key of ['code', 'error_code', 'status']) {
    const v = e[key];
    if (v !== undefined && v !== null) return String(v).toLowerCase();
  }
  return '';
}

type Rule = {
  /** Cocokkan dengan teks error (huruf kecil) atau kode. */
  match: (msg: string, code: string) => boolean;
  result: FriendlyError;
};

const RULES: Rule[] = [
  // --- Jaringan ---
  {
    match: (m) =>
      m.includes('network request failed') ||
      m.includes('failed to fetch') ||
      m.includes('network error') ||
      m.includes('timeout') ||
      m.includes('econnrefused') ||
      m.includes('enotfound'),
    result: {
      title: 'Tidak ada sambungan',
      message:
        'Aplikasi tidak bisa menghubungi server. Periksa sinyal atau data internet Anda, lalu coba lagi.',
      retryable: true,
    },
  },

  // --- Masuk / daftar ---
  {
    /**
     * Kegagalan alur PKCE, terutama saat masuk dengan Google.
     *
     * Sebelumnya tidak ada aturan untuk ini, jadi warga membaca pesan cadangan
     * "Sambungan internet sepertinya bermasalah" — padahal internetnya baik dan
     * seringnya masuknya SUDAH berhasil. Terlihat di HP uji: sesi tercatat di
     * server, error muncul 296 milidetik setelahnya.
     *
     * Penukaran ganda sudah dicegah di `auth-link.ts`, tapi aturan ini tetap
     * perlu untuk kasus tautan kedaluwarsa atau app ditutup di tengah alur.
     */
    match: (m, c) =>
      c.includes('flow_state') ||
      m.includes('flow state') ||
      m.includes('code verifier') ||
      m.includes('code challenge') ||
      m.includes('pkce'),
    result: {
      title: 'Masuk belum selesai',
      message:
        'Proses masuk terputus di tengah jalan. Coba tekan tombol masuk sekali lagi.',
      retryable: true,
    },
  },
  {
    match: (m) => m.includes('invalid login credentials') || m.includes('invalid credentials'),
    result: {
      title: 'Email atau kata sandi salah',
      message:
        'Periksa kembali email dan kata sandi Anda. Kalau lupa kata sandi, Anda bisa masuk memakai akun Google.',
      retryable: false,
    },
  },
  {
    match: (m) => m.includes('email not confirmed') || m.includes('not confirmed'),
    result: {
      title: 'Email belum dipastikan',
      message:
        'Buka kotak masuk email Anda dan ketuk tautan dari kami untuk memastikan email ini milik Anda.',
      retryable: false,
    },
  },
  {
    match: (m) =>
      m.includes('user already registered') ||
      m.includes('already registered') ||
      m.includes('already exists') ||
      m.includes('duplicate key') ||
      m.includes('23505'),
    result: {
      title: 'Email sudah terdaftar',
      message: 'Email ini sudah punya akun. Silakan masuk saja, tidak perlu mendaftar lagi.',
      retryable: false,
    },
  },
  {
    match: (m) => m.includes('password should be at least') || m.includes('password is too short'),
    result: {
      title: 'Kata sandi terlalu pendek',
      message: 'Kata sandi harus paling sedikit 6 huruf atau angka.',
      retryable: false,
    },
  },
  {
    match: (m) => m.includes('unable to validate email') || m.includes('invalid email'),
    result: {
      title: 'Email belum benar',
      message: 'Periksa penulisan email Anda. Contoh yang benar: nama@gmail.com',
      retryable: false,
    },
  },

  // --- Sesi habis ---
  {
    match: (m) =>
      m.includes('auth session missing') ||
      m.includes('session missing') ||
      m.includes('session not found') ||
      m.includes('session_not_found') ||
      m.includes('jwt expired') ||
      m.includes('token is expired'),
    result: {
      title: 'Anda perlu masuk lagi',
      message: 'Untuk keamanan, Anda otomatis keluar setelah beberapa waktu. Silakan masuk kembali.',
      retryable: false,
    },
  },

  // --- Terlalu sering (dulu ditampilkan sebagai "error 429" + nama vendor) ---
  {
    match: (m, c) =>
      c === '429' ||
      c.includes('over_email') ||
      c.includes('rate_limit') ||
      m.includes('rate limit') ||
      m.includes('too many requests') ||
      m.includes('over_email'),
    result: {
      title: 'Terlalu sering mencoba',
      /**
       * Sebelumnya pesan ini berbunyi "Tunggu 1 menit". Itu salah dan menyesatkan:
       * batas pengiriman email dihitung per JAM, bukan per menit. Warga yang
       * menunggu satu menit lalu mencoba lagi akan gagal lagi, dan menyimpulkan
       * app-nya rusak.
       */
      message:
        'Email dari kami dibatasi jumlahnya per jam supaya tidak disalahgunakan. Coba lagi nanti, atau masuk memakai akun Google.',
      retryable: true,
    },
  },

  // --- Hak akses (dulu bocor nama tabel) ---
  {
    match: (m, c) =>
      m.includes('row-level security') ||
      m.includes('violates row-level security') ||
      m.includes('permission denied') ||
      m.includes('not authorized') ||
      c === '42501',
    result: {
      title: 'Tidak diizinkan',
      message:
        'Anda belum punya izin untuk melakukan ini. Kalau menurut Anda seharusnya bisa, hubungi perangkat desa.',
      retryable: false,
    },
  },

  // --- Data tidak ditemukan ---
  {
    match: (m, c) =>
      c === 'pgrst116' ||
      m.includes('multiple (or no) rows returned') ||
      m.includes('no rows returned') ||
      c === '404',
    result: {
      title: 'Data tidak ditemukan',
      message: 'Data yang Anda cari sudah tidak ada. Mungkin sudah dihapus.',
      retryable: false,
    },
  },

  // --- Kolom wajib kosong ---
  {
    match: (m, c) => c === '23502' || m.includes('null value in column') || m.includes('not-null constraint'),
    result: {
      title: 'Ada yang belum diisi',
      message: 'Masih ada bagian yang wajib diisi. Periksa kembali formulir Anda.',
      retryable: false,
    },
  },

  // --- Isi terlalu panjang ---
  {
    match: (m, c) => c === '22001' || m.includes('value too long'),
    result: {
      title: 'Tulisan terlalu panjang',
      message: 'Coba persingkat tulisan Anda sedikit.',
      retryable: false,
    },
  },

  // --- Unggah foto ---
  {
    match: (m) => m.includes('imgbb') || m.includes('upload failed') || m.includes('payload too large'),
    result: {
      title: 'Foto gagal dikirim',
      message:
        'Foto tidak bisa diunggah. Coba pakai foto lain, atau kirim laporan tanpa foto dulu — laporan tetap bisa dibaca warga.',
      retryable: true,
    },
  },

  // --- Server sedang bermasalah ---
  {
    match: (m, c) =>
      c === '500' ||
      c === '502' ||
      c === '503' ||
      m.includes('internal server error') ||
      m.includes('service unavailable') ||
      m.includes('bad gateway'),
    result: {
      title: 'Server sedang sibuk',
      message: 'Server kami sedang bermasalah. Ini bukan kesalahan Anda. Coba lagi beberapa menit lagi.',
      retryable: true,
    },
  },
];

/**
 * Ubah error apa pun menjadi pesan yang layak dibaca warga.
 *
 * Pesan aslinya tetap dicatat ke console supaya bisa ditelusuri saat ada
 * laporan bug, tapi tidak pernah sampai ke layar.
 */
export function friendlyError(err: unknown, context?: string): FriendlyError {
  const raw = extractMessage(err);
  const code = extractCode(err);

  if (raw || code) {
    console.warn(`[secaling]${context ? ` ${context}:` : ''} ${code ? `(${code}) ` : ''}${raw}`);
  }

  const msg = raw.toLowerCase();
  for (const rule of RULES) {
    if (rule.match(msg, code)) return rule.result;
  }
  return GENERIC;
}

/** Kalau hanya butuh satu baris teks, misalnya untuk error di bawah kolom isian. */
export function friendlyErrorText(err: unknown, context?: string): string {
  return friendlyError(err, context).message;
}
