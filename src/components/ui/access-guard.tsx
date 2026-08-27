import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  tone?: 'primary' | 'danger';
  /** Tombol-tombol aksi. */
  children?: ReactNode;
};

/**
 * Kartu pembatas akses — dipakai saat warga belum masuk, atau saat halaman
 * memang khusus perangkat desa.
 *
 * Kenapa dijadikan satu komponen: pola ini sebelumnya disalin di lima layar
 * (`profil`, `lapor`, `admin/index`, `admin/pengaturan`,
 * `admin/pengumuman-baru`) dengan hasil yang tidak konsisten — salah satunya
 * bahkan lupa memasang ikon, dan dua di antaranya memakai kalimat berbeda untuk
 * situasi yang persis sama:
 *
 *   admin/index      "Halaman ini khusus perangkat desa. Hubungi admin desa
 *                     bila Anda merasa seharusnya memiliki akses."
 *   admin/pengaturan "Halaman ini khusus admin desa."
 */
export function AccessGuard({ icon, title, message, tone = 'primary', children }: Props) {
  const { colors } = useAppTheme();

  const accent = tone === 'danger' ? colors.danger : colors.primaryText;
  const accentSoft = tone === 'danger' ? colors.dangerSoft : colors.primarySoft;

  return (
    <Screen scroll={false} center noTabBar={tone === 'danger'}>
      <Surface tone="card" radius={Radius.xl} style={styles.card}>
        <View style={[styles.icon, { backgroundColor: accentSoft }]}>
          <Ionicons name={icon} size={40} color={accent} />
        </View>

        <AppText variant="heading" color="text" align="center" heading>
          {title}
        </AppText>

        <AppText variant="body" color="textSecondary" align="center" style={styles.message}>
          {message}
        </AppText>

        {children ? <View style={styles.actions}>{children}</View> : null}
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    width: '100%',
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    maxWidth: 340,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
