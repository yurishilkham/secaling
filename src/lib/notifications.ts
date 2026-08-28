import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const isNative = Platform.OS !== 'web';

// Remote push tidak tersedia di Expo Go (dihapus sejak SDK 53).
// Modul `expo-notifications` melempar error saat dievaluasi di Expo Go Android,
// jadi WAJIB di-lazy-require, bukan import statis.
// Catatan: bandingkan nilai string karena Constants.ExecutionEnvironment
// tidak selalu tersedia di semua versi expo-constants.
const executionEnvironment = String(
  (Constants as any).executionEnvironment ?? ''
);
export const isExpoGo = isNative && executionEnvironment === 'storeClient';

type NotificationsModule = typeof import('expo-notifications');

let cachedModule: NotificationsModule | null = null;
let handlerConfigured = false;

/**
 * Alasan kenapa pendaftaran token gagal.
 *
 * Sebelumnya seluruh fungsi ini hanya mengembalikan `null` dan menelan setiap
 * error tanpa jejak. Akibatnya push tidak pernah jalan selama berbulan-bulan
 * tanpa satu pun petunjuk di log: dari sisi app seolah tidak terjadi apa-apa.
 * Sekarang setiap jalan keluar punya nama dan dicatat.
 */
export type PushSetupIssue =
  | 'web' // bukan HP, push memang tidak berlaku
  | 'expo-go' // Expo Go tidak mendukung remote push sejak SDK 53
  | 'emulator' // emulator tidak bisa dapat token FCM
  | 'module-error' // modul native gagal dimuat
  | 'no-project-id' // belum `eas init` — extra.eas.projectId kosong
  | 'permission-denied' // warga menolak izin notifikasi
  | 'no-token' // Expo tidak mengembalikan token (biasanya kredensial FCM belum diunggah)
  | 'token-error' // getExpoPushTokenAsync melempar error
  | 'save-failed'; // token didapat tapi gagal disimpan ke Supabase

export type PushSetupResult =
  | { ok: true; token: string }
  | { ok: false; reason: PushSetupIssue; detail?: string };

/** Catat sekali dengan awalan yang sama seperti `friendlyError`, supaya mudah disaring. */
function catat(pesan: string, detail?: unknown) {
  if (detail === undefined) {
    console.warn(`[secaling] push: ${pesan}`);
    return;
  }
  console.warn(`[secaling] push: ${pesan}`, detail);
}

function getNotifications(): NotificationsModule | null {
  if (!isNative || isExpoGo) return null;
  if (cachedModule) return cachedModule;

  try {
    // `require` memang disengaja di sini, bukan `import` di atas berkas.
    // Modul `expo-notifications` melempar error saat dievaluasi di Expo Go
    // Android, jadi harus dimuat hanya ketika benar-benar akan dipakai.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as NotificationsModule;

    if (!handlerConfigured) {
      handlerConfigured = true;
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
      } catch (e) {
        catat('runtime tidak mendukung setNotificationHandler', e);
      }
    }

    cachedModule = Notifications;
    return Notifications;
  } catch (e) {
    catat('gagal memuat modul expo-notifications', e);
    return null;
  }
}

function ensureHandler() {
  getNotifications();
}

/**
 * Token terakhir yang berhasil didaftarkan di perangkat ini.
 *
 * Disimpan di tingkat modul karena yang MENDAFTARKAN token dan yang perlu
 * MENGHAPUSNYA ada di tempat berbeda: pendaftaran di root layout (supaya semua
 * warga terdaftar), penghapusan di tab Profil saat menekan "Keluar". Menaruhnya
 * di `useState` salah satu layar berarti layar yang lain tidak bisa melihatnya.
 */
let tokenTerakhir: string | null = null;

/**
 * Daftarkan perangkat ini supaya bisa menerima peringatan keamanan desa.
 *
 * Tidak butuh akun. Warga yang belum login tetap terdaftar dengan `user_id`
 * kosong; kalau ia login nanti, tokennya diklaim atas namanya.
 *
 * Aman dipanggil berulang: `register_push_token` di Supabase memakai upsert,
 * jadi memanggilnya dua kali tidak membuat baris ganda.
 *
 * `user_id` tidak pernah diteruskan sebagai argumen — fungsi di Supabase
 * mengambilnya dari `auth.uid()`. Kalau dikirim dari klien, warga bisa
 * mendaftarkan token atas nama orang lain.
 */
export async function registerForPushNotificationsAsync(): Promise<PushSetupResult> {
  ensureHandler();

  if (!isNative) return { ok: false, reason: 'web' };
  if (isExpoGo) return { ok: false, reason: 'expo-go' };
  if (!Device.isDevice) return { ok: false, reason: 'emulator' };

  const Notifications = getNotifications();
  if (!Notifications) return { ok: false, reason: 'module-error' };

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Peringatan & Pengumuman',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    } catch (e) {
      // Saluran gagal dibuat bukan alasan untuk berhenti: notifikasi masih
      // sampai, hanya memakai saluran bawaan tanpa getaran khusus.
      catat('gagal membuat saluran notifikasi "alerts"', e);
    }
  }

  let status: string;
  try {
    const current = await Notifications.getPermissionsAsync();
    status = current.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
  } catch (e) {
    catat('gagal meminta izin notifikasi', e);
    return { ok: false, reason: 'permission-denied' };
  }

  if (status !== 'granted') {
    catat(`izin notifikasi tidak diberikan (status: ${status})`);
    return { ok: false, reason: 'permission-denied' };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    catat(
      'extra.eas.projectId belum ada di app.json — jalankan `eas init` dulu. ' +
        'Tanpa ini Expo tidak bisa menerbitkan token push.'
    );
    return { ok: false, reason: 'no-project-id' };
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!result?.data) {
      catat(
        'Expo tidak mengembalikan token. Biasanya kredensial FCM (google-services.json) ' +
          'belum diunggah ke EAS.'
      );
      return { ok: false, reason: 'no-token' };
    }
    token = result.data;
  } catch (e) {
    catat('getExpoPushTokenAsync gagal', e);
    return { ok: false, reason: 'token-error', detail: String(e) };
  }

  /**
   * Simpan lewat RPC, bukan cek-lalu-insert seperti versi lama.
   *
   * Versi lama SELECT dulu untuk memeriksa apakah token sudah terdaftar, lalu
   * INSERT kalau belum. Itu rusak kalau satu HP dipakai dua akun: policy SELECT
   * hanya mengizinkan membaca token milik sendiri, jadi pemeriksaannya tidak
   * menemukan apa-apa, lalu INSERT-nya kena unique violation pada kolom `token`.
   * `register_push_token` melakukan upsert di sisi server, dan bisa dipanggil
   * baik oleh warga yang sudah login maupun yang belum.
   */
  const { error } = await supabase.rpc('register_push_token', { p_token: token });
  if (error) {
    catat('gagal menyimpan token ke Supabase', error.message);
    return { ok: false, reason: 'save-failed', detail: error.message };
  }

  tokenTerakhir = token;
  return { ok: true, token };
}

/**
 * Lepas kaitan token ini dari akun warga saat ia menekan "Keluar".
 *
 * Barisnya TIDAK dihapus, hanya `user_id`-nya dilepas — perangkatnya tetap
 * menerima peringatan keamanan desa sebagai warga anonim. Menghapusnya berarti
 * warga yang keluar dari akun ikut berhenti diberi tahu saat ada maling atau
 * kebakaran, dan itu bukan yang diinginkan.
 *
 * Dikerjakan lewat DELETE lalu daftar ulang karena policy UPDATE tidak ada:
 * membuka UPDATE pada tabel ini berarti siapa pun yang tahu token orang lain
 * bisa mengklaimnya.
 */
export async function unregisterPushNotifications(token?: string | null) {
  const target = token ?? tokenTerakhir;
  if (!target) return;

  const { error } = await supabase.from('push_tokens').delete().eq('token', target);
  if (error) {
    catat('gagal melepas token saat keluar', error.message);
    return;
  }

  // Daftar ulang tanpa sesi supaya perangkat ini tetap menerima peringatan.
  const { error: ulangErr } = await supabase.rpc('register_push_token', {
    p_token: target,
  });
  if (ulangErr) {
    catat('gagal mendaftar ulang sebagai anonim setelah keluar', ulangErr.message);
    tokenTerakhir = null;
  }
}

export function useNotificationTap(onTap: (url: string) => void) {
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) return;

    try {
      const response = Notifications.getLastNotificationResponse();
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string') {
        onTap(url);
      }

      const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
        const dataUrl = resp.notification.request.content.data?.url;
        if (typeof dataUrl === 'string') {
          onTap(dataUrl);
        }
      });

      return () => sub.remove();
    } catch (e) {
      catat('gagal memasang pendengar ketukan notifikasi', e);
      return undefined;
    }
  }, [onTap]);
}

/**
 * Daftarkan perangkat ini untuk menerima peringatan keamanan desa.
 *
 * TIDAK menunggu warga login. Di desa, tidak semua warga mau atau bisa membuat
 * akun — tapi peringatan maling dan kebakaran justru paling perlu sampai ke
 * mereka. Mewajibkan akun berarti membiarkan sebagian warga tidak tahu apa-apa
 * saat ada kejadian.
 *
 * Dipasang di root layout, bukan di tab Profil seperti versi paling awal, yang
 * hanya mendaftar kalau tab itu dibuka.
 *
 * Dijalankan dua kali dengan sengaja:
 *   1. sekali saat app dibuka, tanpa menunggu apa pun
 *   2. sekali lagi kalau ternyata warga punya sesi, supaya tokennya diklaim
 *      atas namanya dan notifikasi bertarget tetap mungkin
 *
 * `register_push_token` idempoten, jadi panggilan kedua tidak membuat baris
 * ganda — hanya mengisi `user_id` yang tadinya kosong.
 */
export function usePushRegistration(userId: string | undefined) {
  // Menyimpan siapa yang terakhir didaftarkan. `'__anon__'` dibedakan dari
  // `null` supaya pendaftaran anonim tidak diulang tiap kali komponen render.
  const sudahCoba = useRef<string | null>(null);

  useEffect(() => {
    const penanda = userId ?? '__anon__';
    if (sudahCoba.current === penanda) return;
    sudahCoba.current = penanda;

    let dibatalkan = false;
    registerForPushNotificationsAsync().then((hasil) => {
      if (dibatalkan || hasil.ok) return;
      // Kegagalan tidak ditampilkan ke warga: tidak ada yang bisa mereka
      // lakukan soal ini, dan memunculkan peringatan teknis hanya menakuti.
      // Sudah dicatat ke console di dalam fungsinya.
      if (hasil.reason === 'no-project-id' || hasil.reason === 'no-token') {
        // Ini kesalahan setup, bukan kesalahan perangkat. Dibedakan supaya
        // jelas saat menelusuri log.
        catat(`setup push belum lengkap (${hasil.reason})`);
      }
    });

    return () => {
      dibatalkan = true;
    };
  }, [userId]);
}
