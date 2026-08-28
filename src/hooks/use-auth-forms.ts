import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { friendlyError } from '@/lib/errors';
import { getRedirectUri } from '@/lib/google-auth';
import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';

/**
 * Ubah email dan kata sandi.
 *
 * Ditulis ulang total. Versi sebelumnya memanggil `Alert.alert` di 19 tempat,
 * dan beberapa pesannya membocorkan hal-hal yang seharusnya tidak pernah
 * dilihat warga:
 *
 *   - "Batas email tercapai (429)" + "Supabase membatasi pengiriman email
 *     (±2-4/jam)" — kode HTTP dan nama layanan pihak ketiga
 *   - "Redirect tidak diizinkan: secaling://auth/callback" — URI deep-link mentah
 *   - "Silakan KELUAR lalu MASUK kembali" — huruf besar yang terasa membentak
 *   - "Sesi login habis atau tidak sinkron" — "tidak sinkron" itu istilah teknis
 *   - beberapa jalur berakhir menampilkan `error.message` bahasa Inggris
 *
 * Sekarang hook ini tidak menampilkan apa pun sendiri. Ia mengembalikan
 * keadaan, dan layarnya yang memutuskan cara menampilkannya (banner sebaris,
 * kesalahan di bawah kolom isian). Ini juga membuat pesannya ikut membesar saat
 * warga memilih ukuran huruf besar — Alert milik sistem tidak bisa.
 */

export type FormStatus =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

const IDLE: FormStatus = { kind: 'idle' };

/** Jeda setelah permintaan email, karena layanan email dibatasi per jam. */
const EMAIL_COOLDOWN_SECONDS = 60;

function isRateLimit(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  const status = e.status ?? (e.code === 429 ? 429 : undefined);
  const code = String(e.code ?? e.error_code ?? '').toLowerCase();
  const msg = String(e.message ?? e.msg ?? '').toLowerCase();
  return (
    status === 429 ||
    code.includes('over_email') ||
    code.includes('rate_limit') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('email rate limit exceeded')
  );
}

function isSessionMissing(err: unknown): boolean {
  const msg = String(
    (err as { message?: string } | null)?.message ?? '',
  ).toLowerCase();
  return (
    msg.includes('auth session missing') ||
    msg.includes('session missing') ||
    msg.includes('session not found') ||
    msg.includes('session_not_found')
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Ubah email
// ---------------------------------------------------------------------------

export function useEmailChange(session: Session | null) {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState<FormStatus>(IDLE);
  /** Kesalahan yang menempel di bawah kolom isian, bukan popup. */
  const [fieldError, setFieldError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hitungan jeda dibersihkan saat layar ditutup, kalau tidak akan terus
  // berjalan dan memperbarui komponen yang sudah tidak ada.
  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const reset = useCallback(() => {
    setStatus(IDLE);
    setFieldError(null);
  }, []);

  const changeEmail = useCallback(
    async (rawEmail: string, onSuccess?: () => void): Promise<boolean> => {
      if (loading || cooldown > 0) return false;

      setStatus(IDLE);
      setFieldError(null);

      const email = rawEmail.trim().toLowerCase();

      // --- Pemeriksaan isian, semuanya tampil di bawah kolom ---
      if (!email) {
        setFieldError('Tulis dulu email baru Anda.');
        return false;
      }
      if (!EMAIL_PATTERN.test(email)) {
        setFieldError('Penulisan email belum benar. Contoh: nama@gmail.com');
        return false;
      }

      const { data: sessData } = await supabase.auth.getSession();
      const activeSession = sessData.session ?? session;
      if (!activeSession) {
        setStatus({
          kind: 'error',
          message: 'Anda perlu masuk lagi sebelum mengubah email.',
        });
        return false;
      }
      if (email === activeSession.user.email?.toLowerCase()) {
        setFieldError('Email ini sama dengan email Anda sekarang.');
        return false;
      }

      setLoading(true);

      let redirectTo: string;
      try {
        redirectTo = getRedirectUri();
      } catch {
        redirectTo = 'secaling://auth/callback';
      }

      let updateError: unknown = null;
      try {
        const { error } = await supabase.auth.updateUser(
          { email },
          { emailRedirectTo: redirectTo },
        );
        updateError = error;
      } catch (e) {
        updateError = e;
      }

      /**
       * Kalau pustaka melaporkan sesi hilang padahal kita punya token yang
       * masih berlaku, coba langsung ke API sekali lagi.
       *
       * Ini menutupi kasus di mana keadaan sesi di dalam pustaka sudah tidak
       * cocok dengan token yang sebenarnya masih hidup. Tanpa ini, warga
       * disuruh keluar-masuk padahal tidak perlu.
       */
      if (updateError && isSessionMissing(updateError)) {
        try {
          const res = await fetch(
            `${supabaseUrl}/auth/v1/user?redirect_to=${encodeURIComponent(redirectTo)}`,
            {
              method: 'PUT',
              headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${activeSession.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email }),
            },
          );
          if (res.ok) {
            updateError = null;
          } else {
            const body = await res.json().catch(() => ({}));
            const err = new Error(body.msg ?? body.message ?? `HTTP ${res.status}`);
            (err as Error & { status?: number }).status = res.status;
            updateError = err;
          }
        } catch (e) {
          updateError = e;
        }
      }

      setLoading(false);

      if (updateError) {
        if (isRateLimit(updateError)) {
          startCooldown(EMAIL_COOLDOWN_SECONDS);
          setStatus({
            kind: 'error',
            // Batas email dihitung per jam, bukan per menit. Menyebut "satu
            // menit" membuat warga mencoba lagi terlalu cepat lalu gagal lagi.
            message:
              'Sudah terlalu sering mengirim permintaan. Email dibatasi jumlahnya per jam — coba lagi nanti.',
          });
          return false;
        }

        const msg = String(
          (updateError as { message?: string }).message ?? '',
        ).toLowerCase();

        if (msg.includes('email change') && msg.includes('pending')) {
          setStatus({
            kind: 'error',
            message:
              'Masih ada permintaan ganti email yang belum Anda selesaikan. Cek kotak masuk email Anda dulu.',
          });
          return false;
        }
        if (msg.includes('redirect')) {
          // Dulu di sini URI deep-link mentah ditampilkan ke warga.
          setStatus({
            kind: 'error',
            message:
              'Ada masalah pengaturan di aplikasi. Hubungi perangkat desa dan sebutkan Anda gagal mengganti email.',
          });
          return false;
        }

        setStatus({ kind: 'error', message: friendlyError(updateError, 'changeEmail').message });
        return false;
      }

      setStatus({
        kind: 'success',
        message: `Kami sudah mengirim tautan ke ${email}. Buka kotak masuk email itu dan ketuk tautannya untuk menyelesaikan.`,
      });
      startCooldown(EMAIL_COOLDOWN_SECONDS);
      onSuccess?.();
      return true;
    },
    [cooldown, loading, session, startCooldown],
  );

  return {
    emailLoading: loading,
    emailCooldown: cooldown,
    emailStatus: status,
    emailFieldError: fieldError,
    changeEmail,
    resetEmailStatus: reset,
  };
}

// ---------------------------------------------------------------------------
// Ubah kata sandi
// ---------------------------------------------------------------------------

export type PasswordFieldErrors = {
  password?: string;
  confirm?: string;
};

export function usePasswordChange(session: Session | null) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<FormStatus>(IDLE);
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});

  const reset = useCallback(() => {
    setStatus(IDLE);
    setFieldErrors({});
  }, []);

  const changePassword = useCallback(
    async (password: string, confirm: string, onSuccess?: () => void): Promise<boolean> => {
      if (loading) return false;

      setStatus(IDLE);

      // --- Pemeriksaan isian ---
      const errs: PasswordFieldErrors = {};
      if (!password) errs.password = 'Tulis dulu kata sandi baru Anda.';
      else if (password.length < 6) errs.password = 'Kata sandi harus 6 huruf atau angka atau lebih.';

      if (!confirm) errs.confirm = 'Tulis ulang kata sandi baru Anda.';
      else if (password && password !== confirm)
        errs.confirm = 'Dua kata sandi ini belum sama. Periksa lagi.';

      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) return false;

      const { data: sessData } = await supabase.auth.getSession();
      const activeSession = sessData.session ?? session;
      if (!activeSession) {
        setStatus({
          kind: 'error',
          message: 'Anda perlu masuk lagi sebelum mengubah kata sandi.',
        });
        return false;
      }

      setLoading(true);

      let passError: unknown = null;
      try {
        const { error } = await supabase.auth.updateUser({ password });
        passError = error;
      } catch (e) {
        passError = e;
      }

      // Jalur cadangan yang sama seperti pada ubah email.
      if (passError && isSessionMissing(passError)) {
        try {
          const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
            method: 'PUT',
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${activeSession.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
          });
          if (res.ok) {
            passError = null;
          } else {
            const body = await res.json().catch(() => ({}));
            const err = new Error(body.msg ?? body.message ?? `HTTP ${res.status}`);
            (err as Error & { status?: number }).status = res.status;
            passError = err;
          }
        } catch (e) {
          passError = e;
        }
      }

      setLoading(false);

      if (passError) {
        if (isRateLimit(passError)) {
          setStatus({
            kind: 'error',
            // Ganti kata sandi tidak mengirim email, jadi batas di sini per
            // menit — beda dari batas email. Pesannya sengaja tidak disamakan.
            message: 'Sudah terlalu sering mencoba. Tunggu satu menit, lalu coba lagi.',
          });
          return false;
        }

        const msg = String((passError as { message?: string }).message ?? '').toLowerCase();
        if (
          msg.includes('nonce') ||
          msg.includes('reauthentication') ||
          msg.includes('recently signed in')
        ) {
          setStatus({
            kind: 'error',
            message:
              'Untuk keamanan, Anda perlu keluar lalu masuk kembali sebelum mengubah kata sandi.',
          });
          return false;
        }
        if (msg.includes('same') && msg.includes('password')) {
          setFieldErrors({ password: 'Kata sandi ini sama dengan yang sekarang.' });
          return false;
        }

        setStatus({
          kind: 'error',
          message: friendlyError(passError, 'changePassword').message,
        });
        return false;
      }

      setStatus({ kind: 'success', message: 'Kata sandi Anda sudah diganti.' });
      onSuccess?.();
      return true;
    },
    [loading, session],
  );

  return {
    passLoading: loading,
    passStatus: status,
    passFieldErrors: fieldErrors,
    changePassword,
    resetPassStatus: reset,
  };
}
