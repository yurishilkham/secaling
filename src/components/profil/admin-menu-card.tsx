import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type MenuRow = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
};

/**
 * Dua menu, bukan tiga.
 *
 * "Tulis Pengumuman" dihapus dari sini karena sudah ada sebagai tombol di
 * halaman Menu Admin — admin sebelumnya melihat aksi yang sama di dua tempat
 * yang jaraknya cuma satu ketukan, dan itu membuat orang ragu mana yang benar.
 */
const ROWS: MenuRow[] = [
  {
    icon: 'shield-checkmark-outline',
    title: 'Menu Admin',
    subtitle: 'Kelola laporan dan pengumuman desa',
    route: '/admin',
  },
  {
    icon: 'settings-outline',
    title: 'Pengaturan Admin',
    subtitle: 'Keamanan akun dan tampilan',
    route: '/admin/pengaturan',
  },
];

/**
 * Menu khusus perangkat desa.
 *
 * Perubahan:
 *   - Tiap baris akhirnya punya `accessibilityRole` dan label. Sebelumnya tiga
 *     tautan navigasi utama admin sama sekali tidak diucapkan pembaca layar.
 *   - Warna latar ikon yang ditulis mati (`'#0EA5E9'`, `'#6B7280'`) diganti
 *     token tema, jadi ikut berubah di mode gelap.
 *   - Garis pemisah tidak lagi memakai `marginLeft: 44` — angka ajaib yang akan
 *     salah begitu ukuran ikon berubah.
 */
export function AdminMenuCard() {
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <Surface tone="card" radius={Radius.lg} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="briefcase-outline" size={24} color={colors.primaryText} />
        </View>
        <View style={styles.headerText}>
          <AppText variant="heading" color="text" heading>
            Perangkat Desa
          </AppText>
          <AppText variant="caption" color="textMuted">
            Hanya terlihat oleh Anda
          </AppText>
        </View>
      </View>

      {ROWS.map((row, i) => (
        <View key={row.route}>
          {i > 0 ? <View style={[styles.divider, { backgroundColor: colors.divider }]} /> : null}
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') {
                try {
                  Haptics.selectionAsync();
                } catch {}
              }
              router.push(row.route as never);
            }}
            accessibilityRole="button"
            accessibilityLabel={row.title}
            accessibilityHint={row.subtitle}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={row.icon} size={24} color={colors.primaryText} />
            </View>
            <View style={styles.rowText}>
              <AppText variant="bodyStrong" color="text">
                {row.title}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {row.subtitle}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1.5,
    marginVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Touch.large,
    paddingVertical: Spacing.sm,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
