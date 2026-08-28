import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hitungan jeda sebelum tombol pengirim email bisa ditekan lagi.
 *
 * KENAPA PERLU
 *   Layanan email membatasi jumlah kiriman. Tanpa jeda, warga yang emailnya
 *   belum sampai akan menekan "Daftar" atau "Kirim Ulang" berkali-kali —
 *   perilaku yang sangat wajar — dan kuota email seluruh desa habis oleh satu
 *   orang dalam satu menit. Setelah itu warga lain melihat kegagalan tanpa tahu
 *   sebabnya.
 *
 *   Ini bukan dugaan: kuota email proyek ini benar-benar habis saat pengujian
 *   karena tombolnya bisa ditekan tanpa batas.
 *
 * DIPAKAI DI MANA
 *   Layar daftar dan layar masuk. `useEmailChange` di `use-auth-forms.ts` sudah
 *   punya mekanisme serupa di dalamnya untuk ganti email.
 */

/** Jeda bawaan. Cukup lama untuk email sampai, cukup singkat untuk tidak membuat warga menyerah. */
export const JEDA_EMAIL_DETIK = 60;

export function useJedaEmail(detik: number = JEDA_EMAIL_DETIK) {
  const [sisa, setSisa] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hitungan dihentikan saat layar ditutup. Kalau tidak, ia terus berjalan dan
  // mencoba memperbarui komponen yang sudah tidak ada.
  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const mulai = useCallback(() => {
    setSisa(detik);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setSisa((sebelum) => {
        if (sebelum <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return sebelum - 1;
      });
    }, 1000);
  }, [detik]);

  return { sisa, mulai, sedangMenunggu: sisa > 0 };
}
