import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/lib/database.types';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const webStorage = {
  async getItem(key: string) {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  async removeItem(key: string) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
};

// Tipe `Database` membuat TypeScript ikut memeriksa nama tabel, nama kolom, dan
// nilai enum di setiap kueri — jadi salah tulis nama kolom tertangkap saat
// mengetik, bukan saat app sudah jalan di HP warga.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

/**
 * Pilihan kolom untuk mengambil laporan beserta nama pelapornya.
 *
 * Nama foreign key HARUS disebut. Ada dua jalur dari `reports` ke `profiles`:
 *
 *   1. langsung          reports.reporter_id -> profiles.id   (siapa yang melapor)
 *   2. lewat perantara   reports -> report_confirmations -> profiles
 *                                                          (siapa yang menekan
 *                                                           "Saya Juga Lihat")
 *
 * Tanpa nama FK, Supabase tidak tahu jalur mana yang dimaksud dan menolak
 * seluruh kueri dengan PGRST201 — bukan sekadar peringatan, tapi kegagalan yang
 * membuat daftar laporan tidak muncul sama sekali.
 *
 * Jalur kedua tidak bisa dihilangkan karena fitur "Saya Juga Lihat" memakainya,
 * jadi menyebut nama FK adalah satu-satunya jalan.
 *
 * Ditaruh di satu tempat supaya kueri baru tidak lupa memakainya dan mengulang
 * kesalahan yang sama.
 */
export const PILIH_LAPORAN_DENGAN_PELAPOR =
  '*, profiles!reports_reporter_id_profiles_fkey(full_name)' as const;
