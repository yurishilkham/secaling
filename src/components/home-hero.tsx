import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

/**
 * Hero Beranda.
 *
 * Perubahan:
 *   - Memakai logo Secaling asli, bukan ikon `shield-checkmark` bawaan Ionicons.
 *   - Lencana "LIVE" dihapus. Itu istilah teknis yang tidak berarti apa-apa
 *     bagi warga desa, dan menempati ruang yang lebih berguna untuk isi.
 *   - Gradien diganti warna rata. Selain soal kontras, warna rata membuat
 *     tombol putih di atasnya terbaca sama jelas di seluruh permukaan hero.
 *   - Tombol "Lapor Kejadian" jadi tombol besar 64px.
 */
export function HomeHero() {
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <View
      style={[styles.hero, { backgroundColor: colors.primary }, Shadows.lg as object]}>
      <View style={styles.top}>
        <BrandLogo size={64} tone="onColor" />
        <View style={styles.titleWrap}>
          <AppText variant="title" rawColor={colors.onPrimary} numberOfLines={1} heading>
            Secaling
          </AppText>
          <AppText variant="secondary" rawColor={colors.onPrimary} numberOfLines={2}>
            Keamanan Desa Segoropuro
          </AppText>
        </View>
      </View>

      <AppText variant="body" rawColor={colors.onPrimary} style={styles.desc}>
        Lihat kejadian terbaru di desa, dan laporkan kalau Anda melihat sesuatu
        yang perlu diketahui warga lain.
      </AppText>

      <Button
        title="Lapor Kejadian"
        size="large"
        variant="secondary"
        onPress={() => router.push('/lapor')}
        icon={<Ionicons name="add-circle" size={26} color={colors.primaryText} />}
        accessibilityHint="Membuka formulir laporan tiga langkah"
        style={styles.cta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  desc: {
    // Sedikit lebih terang dari putih penuh supaya tidak bersaing dengan judul,
    // tapi masih jauh di atas ambang kontras.
    opacity: 0.95,
  },
  cta: {
    marginTop: Spacing.xs,
  },
});
