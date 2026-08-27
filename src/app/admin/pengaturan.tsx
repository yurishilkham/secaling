import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppearanceCard } from '@/components/profil/appearance-card';
import { SecurityAccordion } from '@/components/profil/security-accordion';
import { AccessGuard } from '@/components/ui/access-guard';
import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/back-button';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useEmailChange, usePasswordChange } from '@/hooks/use-auth-forms';
import { useAuth } from '@/lib/auth';

export default function AdminPengaturanScreen() {
  const { colors } = useAppTheme();
  const { session, profile, loading } = useAuth();

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const emailForm = useEmailChange(session);
  const passForm = usePasswordChange(session);

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
      {/* Jalan kembali di ATAS layar, bukan cuma di bawah. Warga tidak harus
          menggulir sampai habis dulu untuk bisa keluar. */}
      <BackButton label="Menu Admin" />

      <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
        <AppText variant="title" color="text" heading>
          Pengaturan Admin
        </AppText>
        <AppText variant="body" color="textSecondary">
          Keamanan akun dan tampilan aplikasi.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(320)}>
        <AppearanceCard />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(320)}>
        <SecurityAccordion
          email={session?.user.email ?? ''}
          emailConfirmed={!!session?.user.email_confirmed_at}
          newEmail={newEmail}
          setNewEmail={setNewEmail}
          onChangeEmail={() => emailForm.changeEmail(newEmail, () => setNewEmail(''))}
          emailLoading={emailForm.emailLoading}
          emailCooldown={emailForm.emailCooldown}
          emailStatus={emailForm.emailStatus}
          emailFieldError={emailForm.emailFieldError}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          onChangePassword={() =>
            passForm.changePassword(newPassword, confirmPassword, () => {
              setNewPassword('');
              setConfirmPassword('');
            })
          }
          passLoading={passForm.passLoading}
          passStatus={passForm.passStatus}
          passFieldErrors={passForm.passFieldErrors}
          onDismissStatus={() => {
            emailForm.resetEmailStatus();
            passForm.resetPassStatus();
          }}
        />
      </Animated.View>

      {/* Catatan pengembang yang dulu ada di sini sudah dihapus seluruhnya.
          Isinya: "Admin juga bisa login via Google jika email Google sudah
          terdaftar dan role di-profiles = admin. Untuk error 429, cek Supabase
          Dashboard > Auth > Rate Limits." — membocorkan nama tabel, konsep
          kolom, kode HTTP, dan panel layanan pihak ketiga. */}
      <Animated.View entering={FadeInDown.delay(140).duration(320)}>
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
