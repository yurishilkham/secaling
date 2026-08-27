import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Spacing } from '@/constants/theme';

type Props = {
  title: string;
  subtitle: string;
};

/**
 * Kepala halaman masuk/daftar.
 *
 * Perubahan:
 *   - Ikon `shield-checkmark` bawaan Ionicons diganti logo Secaling asli.
 *   - Judul 23px -> varian `title` 24px, jadi konsisten dengan judul halaman
 *     lain (dulu halaman auth sendirian memakai 23px).
 *   - Logo 88px -> 80px. Di HP pendek dengan papan tombol terbuka, logo besar
 *     mendorong kolom isian keluar layar.
 *   - Tulisan "SECALING" berhuruf renggang dihapus. Nama app sudah ada di
 *     judul, dan teks 11.5px dengan opacity 0.7 gagal syarat kontras.
 */
export function BrandHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.header}>
      <BrandLogo size={80} />
      <AppText variant="title" color="text" align="center" heading style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" color="textSecondary" align="center" style={styles.subtitle}>
        {subtitle}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  title: {
    marginTop: Spacing.xs,
  },
  subtitle: {
    maxWidth: 340,
  },
});
