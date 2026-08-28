import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AccessGuard } from '@/components/ui/access-guard';
import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/back-button';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuth } from '@/lib/auth';

export default function AdminPengaturanScreen() {
  const { colors } = useAppTheme();
  const { profile, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <Screen noTabBar>
        <View style={styles.loadingWrap}>
          <Skeleton width="50%" height={32} />
          <Skeleton height={240} radius={Radius.lg} />
          <Skeleton height={200} radius={Radius.lg} />
        </View>
      </Screen>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <AccessGuard
        icon="lock-closed"
        tone="danger"
        title="Halaman Khusus Perangkat Desa"
        message="Halaman ini hanya bisa dibuka oleh perangkat desa. Kalau menurut Anda seharusnya bisa, hubungi kepala desa."
      >
        <BackButton label="Kembali" />
      </AccessGuard>
    );
  }

  return (
    <Screen noTabBar>
      <BackButton label="Menu Admin" />

      <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
        <AppText variant="title" color="text" heading>
          Pengaturan
        </AppText>
        <AppText variant="body" color="textSecondary">
          Pengaturan admin sekarang ada di Profil — supaya tidak ada dua tempat
          yang perlu dijaga.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.linkList}>
        <Pressable
          onPress={() => router.push('/(tabs)/profil')}
          accessibilityRole="button"
          accessibilityLabel="Buka pengaturan tampilan di Profil"
          style={({ pressed }) => [styles.linkCard, { opacity: pressed ? 0.7 : 1 }]}>
          <Surface tone="card" radius={Radius.lg} style={styles.linkInner}>
            <View style={[styles.linkIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="color-palette-outline" size={24} color={colors.primaryText} />
            </View>
            <View style={styles.linkText}>
              <AppText variant="bodyStrong" color="text">
                Tampilan & Huruf
              </AppText>
              <AppText variant="caption" color="textMuted">
                Warna, mode gelap, ukuran huruf
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
          </Surface>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/profil')}
          accessibilityRole="button"
          accessibilityLabel="Buka keamanan akun di Profil"
          style={({ pressed }) => [styles.linkCard, { opacity: pressed ? 0.7 : 1 }]}>
          <Surface tone="card" radius={Radius.lg} style={styles.linkInner}>
            <View style={[styles.linkIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="lock-closed-outline" size={24} color={colors.primaryText} />
            </View>
            <View style={styles.linkText}>
              <AppText variant="bodyStrong" color="text">
                Keamanan Akun
              </AppText>
              <AppText variant="caption" color="textMuted">
                Email, sandi, dan keluar akun
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
          </Surface>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(320)}>
        <Surface tone="info" radius={Radius.md} style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <AppText variant="secondary" color="textSecondary" style={styles.infoText}>
            Anda juga bisa masuk memakai akun Google dengan email yang sama.
            Status perangkat desa tetap mengikuti data akun Anda.
          </AppText>
        </Surface>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  header: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  linkList: {
    gap: Spacing.md,
  },
  linkCard: {
    borderRadius: Radius.lg,
  },
  linkInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
    gap: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  infoText: {
    flex: 1,
  },
});
