import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

const KEY = '@secaling/panduan-selesai';

type OnboardingContextValue = {
  /** `null` berarti masih dibaca dari penyimpanan HP. */
  sudahSelesai: boolean | null;
  tandaiSelesai: () => Promise<void>;
  ulangiPanduan: () => Promise<void>;
};

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

/**
 * Menandai apakah warga sudah melihat panduan awal.
 *
 * HARUS berupa Context, bukan hook biasa dengan `useState` di dalamnya.
 *
 * Kenapa: versi sebelumnya adalah hook biasa, dan dipanggil di DUA tempat —
 * `_layout.tsx` (untuk memutuskan pengalihan) dan `panduan.tsx` (untuk menandai
 * selesai). Karena `useState` membuat keadaan baru di setiap pemanggilan, kedua
 * tempat itu punya salinan keadaan yang terpisah, sehingga terjadi lingkaran:
 *
 *   1. `_layout` membaca penyimpanan  -> keadaan A = false -> pindah ke /panduan
 *   2. `panduan` memanggil hook lagi  -> keadaan B, terpisah dari A
 *   3. Warga menekan "Mulai"          -> hanya keadaan B jadi true
 *   4. `panduan` pindah ke Beranda
 *   5. Keadaan A DI `_layout` MASIH false -> pindah lagi ke /panduan
 *   6. kembali ke langkah 3, terus berulang
 *
 * Penyimpanannya sebenarnya sudah benar tertulis; yang salah adalah `_layout`
 * tidak pernah tahu nilainya berubah. Akibatnya warga terkurung di panduan
 * sampai app ditutup paksa.
 *
 * Dengan Context, hanya ada SATU keadaan yang dibagi ke semua layar, jadi
 * perubahan di satu tempat langsung terlihat di tempat lain.
 *
 * Disimpan di penyimpanan HP, bukan di basis data. Panduan ini soal "apakah
 * orang ini sudah pernah memakai app di HP ini", bukan soal akunnya — warga
 * yang belum punya akun pun harus bisa melihatnya.
 */
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [sudahSelesai, setSudahSelesai] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const nilai = await AsyncStorage.getItem(KEY);
        if (aktif) setSudahSelesai(nilai === 'ya');
      } catch {
        // Penyimpanan gagal dibaca. Anggap sudah selesai — lebih baik warga
        // melewatkan panduan daripada terkurung di dalamnya.
        if (aktif) setSudahSelesai(true);
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  const tandaiSelesai = React.useCallback(async () => {
    // Tulis ke penyimpanan LEBIH DULU, baru ubah keadaan.
    //
    // Urutannya penting: kalau keadaan diubah lebih dulu, pengalihan di
    // `_layout` bisa berjalan sebelum penulisan selesai. Kalau app ditutup
    // tepat di celah itu, panduannya akan muncul lagi saat dibuka berikutnya.
    try {
      await AsyncStorage.setItem(KEY, 'ya');
    } catch {
      // Gagal menyimpan bukan alasan menahan warga di panduan. Setidaknya
      // sesi ini bisa lanjut; panduannya akan muncul lagi lain kali.
    }
    setSudahSelesai(true);
  }, []);

  const ulangiPanduan = React.useCallback(async () => {
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {}
    setSudahSelesai(false);
  }, []);

  const value = React.useMemo<OnboardingContextValue>(
    () => ({ sudahSelesai, tandaiSelesai, ulangiPanduan }),
    [sudahSelesai, tandaiSelesai, ulangiPanduan],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding harus dipakai di dalam <OnboardingProvider>');
  }
  return ctx;
}
