import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuth } from '@/lib/auth';

/**
 * Berapa lama menunggu sesi muncul sebelum menyerah.
 *
 * Penukaran token terjadi di `AuthProvider`, dan butuh sekali jalan ke server.
 * Tanpa batas waktu, warga yang tautannya gagal akan menatap pemuat selamanya —
 * persis gejala layar putih yang dilaporkan.
 */
const BATAS_TUNGGU_MS = 12000;

/**
 * Layar transisi setelah warga menekan tautan dari email atau menyelesaikan
 * masuk dengan Google.
 *
 * LAYAR INI TIDAK LAGI MENUKAR TOKEN.
 *
 *   Sebelumnya layar ini DAN `AuthProvider` sama-sama mendaftarkan pendengar
 *   tautan, lalu keduanya mencoba menukar token yang sama. Token konfirmasi
 *   hanya berlaku sekali pakai, jadi yang berjalan kedua selalu gagal. Kalau
 *   yang kedua itu layar ini, warga melihat "tautan tidak berlaku" padahal
 *   sesinya sudah berhasil dibuat.
 *
 *   Sekarang seluruh penanganan tautan ada di satu tempat — `terapkanTautanAuth`
 *   yang dipanggil `AuthProvider`. Layar ini hanya mengamati `session` dan
 *   berpindah begitu sesinya ada.
 */
export default function AuthCallbackScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { session, loading } = useAuth();

  const [habisWaktu, setHabisWaktu] = useState(false);
  const sudahPindah = useRef(false);

  // Pindah begitu sesi muncul. `replace`, supaya tombol kembali tidak
  // mendaratkan warga di layar ini lagi.
  useEffect(() => {
    if (sudahPindah.current || !session) return;
    sudahPindah.current = true;
    router.replace('/(tabs)');
  }, [session, router]);

  useEffect(() => {
    if (session) return;

    const timer = setTimeout(() => {
      if (!sudahPindah.current) setHabisWaktu(true);
    }, BATAS_TUNGGU_MS);

    return () => clearTimeout(timer);
  }, [session]);

  if (habisWaktu && !session) {
    return (
      <Screen noTabBar center>
        <ErrorState
          error={new Error('Tautan tidak menghasilkan sesi')}
          title="Tautan tidak berhasil dibuka"
          message="Tautan ini mungkin sudah kedaluwarsa atau sudah pernah dipakai. Coba masuk seperti biasa."
        />
        <Button
          title="Ke Halaman Masuk"
          size="large"
          onPress={() => router.replace('/auth/login')}
          style={styles.button}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} center noTabBar>
      <View style={styles.wrap}>
        <BrandLogo size={80} />
        <ActivityIndicator size="large" color={colors.primaryText} />
        <AppText variant="body" color="textSecondary" align="center">
          {loading ? 'Mohon tunggu sebentar…' : 'Menyiapkan akun Anda…'}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  button: {
    marginTop: Spacing.md,
  },
});
