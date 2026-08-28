import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  name: string;
  dusun: string;
  phone: string;
  role: string;
};

/**
 * Kartu identitas warga.
 *
 * Perubahan:
 *
 *   - TATA LETAK JADI BERTUMPUK. Versi lama menyusun avatar, nama, dan lencana
 *     dalam satu baris tanpa `numberOfLines` maupun `flexShrink`. Hitungannya:
 *     avatar 56 + dua celah 32 + padding kartu 32 + lencana ~60 = ~180px ruang
 *     tetap, sehingga di layar 320dp nama hanya dapat ~140px. Nama seperti
 *     "Muhammad Abdurrahman Wahid" akan pecah jadi tiga baris dan kartunya
 *     memanjang tak terduga. Sekarang lencana pindah ke bawah nama.
 *
 *   - Avatar tidak lagi memakai gradien, dan huruf awalnya diberi jalan keluar
 *     kalau nama kosong (dulu `name.charAt(0)` menghasilkan avatar kosong).
 *
 *   - Baris kosong jadi lebih berguna: "Dusun belum diisi" diganti kalimat yang
 *     menyebutkan apa yang bisa dilakukan.
 */
export function ProfileHeaderCard({ name, dusun, phone, role }: Props) {
  const { colors } = useAppTheme();

  const isAdmin = role === 'admin';
  const trimmed = name.trim();
  const initial = trimmed ? trimmed.charAt(0).toUpperCase() : '?';

  return (
    <Surface tone="card" radius={Radius.xl} style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <AppText variant="title" rawColor={colors.onPrimary}>
            {initial}
          </AppText>
        </View>

        <View style={styles.nameWrap}>
          <AppText variant="heading" color="text" numberOfLines={2} heading>
            {trimmed || 'Nama belum diisi'}
          </AppText>

          <View
            style={[
              styles.badge,
              {
                backgroundColor: isAdmin ? colors.primarySoft : colors.background,
                borderColor: isAdmin ? colors.borderStrong : colors.border,
                borderWidth: isAdmin ? 2 : 1.5,
              },
            ]}>
            <Ionicons
              name={isAdmin ? 'shield-checkmark' : 'person'}
              size={16}
              color={isAdmin ? colors.primaryText : colors.textSecondary}
            />
            <AppText variant="badge" color={isAdmin ? 'primary' : 'textSecondary'}>
              {isAdmin ? 'Perangkat Desa' : 'Warga'}
            </AppText>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.metaRow}>
        <Ionicons name="home-outline" size={22} color={colors.textMuted} />
        <AppText variant="secondary" color={dusun ? 'textSecondary' : 'textMuted'} style={styles.metaText}>
          {dusun || 'Dusun belum diisi — isi di bawah'}
        </AppText>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="call-outline" size={22} color={colors.textMuted} />
        <AppText variant="secondary" color={phone ? 'textSecondary' : 'textMuted'} style={styles.metaText}>
          {phone || 'Nomor HP belum diisi — isi di bawah'}
        </AppText>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameWrap: {
    flex: 1,
    gap: Spacing.xs,
    alignItems: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  divider: {
    height: 1.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  metaText: {
    flex: 1,
  },
});
