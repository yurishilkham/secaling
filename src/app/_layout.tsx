import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/lib/auth';
import { useNotificationTap } from '@/lib/notifications';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useNotificationTap((url) => {
    router.push(url as never);
  });

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="laporan/[id]" options={{ headerShown: true, title: 'Detail Laporan' }} />
          <Stack.Screen name="auth/login" options={{ headerShown: true, title: 'Masuk', presentation: 'modal' }} />
          <Stack.Screen name="auth/register" options={{ headerShown: true, title: 'Daftar Akun', presentation: 'modal' }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: true, title: 'Memproses Login' }} />
          <Stack.Screen name="admin/pengumuman-baru" options={{ headerShown: true, title: 'Tulis Pengumuman' }} />
          <Stack.Screen name="admin/pengaturan" options={{ headerShown: true, title: 'Pengaturan Admin' }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}