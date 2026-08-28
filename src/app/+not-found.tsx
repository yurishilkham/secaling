import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

/**
 * Layar untuk alamat yang tidak dikenali.
 *
 * KENAPA PERLU ADA
 *   Tanpa berkas ini, expo-router memakai layar bawaannya yang berbahasa
 *   Inggris ("Unmatched Route"), atau — kalau alamatnya sama sekali tidak cocok
 *   dengan pola rute mana pun — tidak menampilkan apa pun selain latar kosong.
 *
 *   Ini bukan kasus teoretis. Notifikasi membawa alamat tujuan di dalamnya
 *   (`data.url` di `send-notification`), dan `useNotificationTap` mendorong
 *   warga ke alamat itu. Kalau laporannya sudah dihapus admin atau alamatnya
 *   pernah salah tulis, warga mendarat di layar kosong tanpa jalan keluar.
 */
export default function NotFoundScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <Screen noTabBar center>
      <Surface tone="card" radius={Radius.xl} style={styles.kartu}>
        <View style={[styles.ikon, { backgroundColor: colors.warningSoft }]}>
          <Ionicons name="help-circle-outline" size={44} color={colors.warning} />
        </View>

        <AppText variant="heading" color="text" align="center" heading>
          Halaman tidak ditemukan
        </AppText>

        <AppText variant="body" color="textSecondary" align="center">
          Halaman yang Anda tuju sudah tidak ada. Mungkin laporannya sudah
          dihapus, atau tautannya keliru.
        </AppText>

        <Button
          title="Ke Beranda"
          size="large"
          onPress={() => router.replace('/(tabs)')}
          icon={<Ionicons name="home-outline" size={24} color={colors.onPrimary} />}
        />
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kartu: {
    padding: Spacing.xl,
    gap: Spacing.lg,
    alignItems: 'stretch',
  },
  ikon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
