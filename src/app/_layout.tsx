import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';

import { AppThemeProvider, useAppTheme } from '@/hooks/use-app-theme';
import { OnboardingProvider, useOnboarding } from '@/hooks/use-onboarding';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useNotificationTap, usePushRegistration } from '@/lib/notifications';

// Splash ditahan sampai font siap, supaya teks tidak sempat tampil dengan
// font sistem lalu berkedip ganti ke Plus Jakarta Sans.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Mendaftarkan perangkat untuk notifikasi begitu warga punya sesi.
 *
 * Komponen tanpa tampilan, dan harus ada DI DALAM `AuthProvider` karena
 * memakai `useAuth`. Sebelumnya pendaftaran ini ada di tab Profil — artinya
 * warga yang tidak pernah membuka Profil tidak pernah terdaftar dan tidak
 * akan menerima peringatan keamanan sama sekali.
 */
function PushRegistration() {
  const { session } = useAuth();
  usePushRegistration(session?.user?.id);
  return null;
}

function RootLayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const { resolved, colors, ready } = useAppTheme();
  const { sudahSelesai } = useOnboarding();

  /**
   * Font di-embed lewat plugin `expo-font` di app.json, jadi di HP sudah
   * tersedia sejak app dibuka. Ionicons tetap perlu dimuat di sini: kalau
   * tidak, ikon tampil kosong sebentar saat pertama kali dipakai.
   */
  const [iconsLoaded, iconsError] = useFonts(Ionicons.font);

  useNotificationTap((url) => {
    router.push(url as never);
  });

  /**
   * Arahkan ke panduan awal saat app pertama kali dipakai di HP ini.
   *
   * `sudahSelesai` datang dari Context, jadi begitu warga menekan "Mulai Pakai
   * Secaling", nilai di sini ikut berubah dan pengalihan ini tidak berjalan lagi.
   */
  const diPanduan = segments[0] === 'panduan';
  useEffect(() => {
    if (sudahSelesai === false && !diPanduan) {
      router.replace('/panduan');
    }
  }, [sudahSelesai, diPanduan, router]);

  const navTheme = useMemo(() => {
    const base = resolved === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        primary: colors.primaryText,
      },
    };
  }, [resolved, colors]);

  const canShow = ready && sudahSelesai !== null && (iconsLoaded || !!iconsError);
  useEffect(() => {
    if (canShow) SplashScreen.hideAsync().catch(() => {});
  }, [canShow]);

  if (!canShow) return null;

  return (
    <ThemeProvider value={navTheme}>
      <AuthProvider>
        <PushRegistration />
        {/**
         * SEMUA LAYAR TANPA HEADER NAVIGASI.
         *
         * Sebelumnya sebagian layar memakai header bawaan navigasi dengan
         * `title`. Itu menimbulkan dua masalah:
         *
         *   1. JUDUL GANDA. `admin/pengaturan` menampilkan header "Pengaturan
         *      Admin" DAN judul "Pengaturan Admin" di isi layarnya. Begitu juga
         *      `admin/pengumuman-baru`.
         *   2. TOMBOL KEMBALI GANDA. Layar admin punya tanda panah di header
         *      dan tombol "Kembali" sendiri di bawah.
         *
         * Sekarang tiap layar mengurus bagian atasnya sendiri lewat `Screen`,
         * yang menambahkan jarak di atas inset bilah status — jadi isi layar
         * tidak lagi menempel ke jam dan ikon sinyal.
         */}
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 220,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="panduan" options={{ animation: 'fade' }} />
          <Stack.Screen name="lapor" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="laporan/[id]" />
          <Stack.Screen name="auth/login" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="auth/register" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
          <Stack.Screen name="admin/index" />
          <Stack.Screen name="admin/pengumuman-baru" />
          <Stack.Screen name="admin/pengaturan" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      {/* `OnboardingProvider` harus membungkus SELURUH app, bukan dipanggil per
          layar. Kalau tidak, tiap layar punya salinan keadaannya sendiri dan
          panduan akan muncul berulang meski warga sudah menyelesaikannya. */}
      <OnboardingProvider>
        <RootLayoutInner />
      </OnboardingProvider>
    </AppThemeProvider>
  );
}
