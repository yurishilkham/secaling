import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppearanceCard } from '@/components/profil/appearance-card';
import { ProfileHeaderCard } from '@/components/profil/profile-header';
import { SecurityAccordion } from '@/components/profil/security-accordion';
import { AccessGuard } from '@/components/ui/access-guard';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { InlineBanner } from '@/components/ui/inline-banner';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useEmailChange, usePasswordChange } from '@/hooks/use-auth-forms';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { unregisterPushNotifications } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

export default function ProfilScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { session, profile, loading, refreshProfile, signOut } = useAuth();

  const [fullName, setFullName] = useState('');
  const [dusun, setDusun] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    { kind: 'success' | 'error'; message: string } | null
  >(null);

  const [askSignOut, setAskSignOut] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Tab di atas "Profil Saya" — hanya terlihat kalau admin (3 orang).
  // "Utama" = profil warga biasa, "Admin" = pintasan ke Menu Admin tanpa
  // harus lewat kartu Perangkat Desa yang lama.
  const [profilTab, setProfilTab] = useState<'utama' | 'admin'>('utama');

  const emailForm = useEmailChange(session);
  const passForm = usePasswordChange(session);

  /**
   * Isian disamakan dengan data profil.
   *
   * Bergantung pada seluruh objek `profile`, bukan hanya `profile.id` seperti
   * sebelumnya. Versi lama membaca `full_name`, `dusun`, dan `phone` tapi hanya
   * menyimak `profile?.id`, jadi kalau salah satu kolom berubah dari sumber
   * lain, isian di layar ini tidak ikut menyesuaikan. Itu juga yang memunculkan
   * peringatan `react-hooks/exhaustive-deps` yang menggantung sejak lama.
   */
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setDusun(profile.dusun);
    setPhone(profile.phone);
  }, [profile]);

  async function saveProfile() {
    if (!session) return;

    const name = fullName.trim();
    if (!name) {
      setNameError('Nama lengkap wajib diisi.');
      return;
    }
    if (name.length < 3) {
      setNameError('Nama terlalu pendek. Tulis nama lengkap Anda.');
      return;
    }

    setNameError(null);
    setSaving(true);
    setSaveStatus(null);

    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      full_name: name,
      dusun: dusun.trim(),
      phone: phone.trim(),
    });

    setSaving(false);

    if (error) {
      setSaveStatus({ kind: 'error', message: friendlyError(error, 'saveProfile').message });
      return;
    }

    await refreshProfile();
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setSaveStatus({ kind: 'success', message: 'Data Anda sudah disimpan.' });
  }

  async function handleSignOut() {
    setAskSignOut(false);
    // Melepas kaitan token dari akun, BUKAN menghapusnya. HP ini tetap
    // menerima peringatan keamanan desa sebagai warga anonim — keluar dari
    // akun tidak berarti ingin berhenti diberi tahu saat ada kejadian.
    //
    // Tanpa argumen: memakai token yang dicatat saat pendaftaran di root
    // layout. Layar ini tidak menyimpannya sendiri karena bukan dia yang
    // mendaftarkan.
    await unregisterPushNotifications();
    await signOut();
  }

  // --- Sedang memuat ---
  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingWrap}>
          <Skeleton width="55%" height={32} />
          <Skeleton height={150} radius={Radius.xl} />
          <Skeleton height={280} radius={Radius.lg} />
        </View>
      </Screen>
    );
  }

  // --- Belum masuk ---
  if (!session) {
    return (
      <AccessGuard
        icon="person-circle-outline"
        title="Akun Warga"
        message="Masuk atau daftar supaya Anda bisa melapor kejadian dan menerima pemberitahuan keamanan desa."
      >
        <Button title="Masuk" size="large" onPress={() => router.push('/auth/login')} />
        <Button
          title="Belum Punya Akun"
          variant="outline"
          onPress={() => router.push('/auth/register')}
        />
      </AccessGuard>
    );
  }


  // --- Profil belum lengkap ---
  if (!profile) {
    return (
      <Screen>
        <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
          <AppText variant="title" color="text" heading>
            Lengkapi Data Anda
          </AppText>
          <AppText variant="body" color="textSecondary">
            Nama Anda akan tercantum di setiap laporan, supaya warga lain tahu
            informasinya bisa dipercaya.
          </AppText>
        </Animated.View>

        {saveStatus ? (
          <InlineBanner
            tone={saveStatus.kind}
            message={saveStatus.message}
            onDismiss={() => setSaveStatus(null)}
          />
        ) : null}

        <Surface tone="card" radius={Radius.lg} style={styles.formCard}>
          <Input
            label="Nama lengkap"
            required
            hint="Tulis sesuai KTP"
            placeholder="Nama lengkap Anda"
            value={fullName}
            onChangeText={(v) => {
              setFullName(v);
              setNameError(null);
            }}
            error={nameError}
            maxLength={80}
            autoComplete="name"
          />
          <Input
            label="Dusun atau RT (boleh dikosongkan)"
            hint="Contoh: Dusun Krajan RT 02"
            placeholder="Tempat tinggal Anda"
            value={dusun}
            onChangeText={setDusun}
            maxLength={60}
          />
          <Input
            label="Nomor HP (boleh dikosongkan)"
            hint="Supaya perangkat desa bisa menghubungi Anda bila perlu"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={16}
            autoComplete="tel"
          />
          <Button title="Simpan" size="large" onPress={saveProfile} loading={saving} />
        </Surface>
      </Screen>
    );
  }

  const isAdmin = profile.role === 'admin';

  return (
    <Screen>
      {/* Tab di ATAS "Profil Saya" — sesuai permintaan: Utama / Admin */}
      {isAdmin ? (
        <View style={[styles.tabRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Pressable
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              setProfilTab('utama');
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: profilTab === 'utama' }}
            style={[
              styles.tabItem,
              profilTab === 'utama'
                ? { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 2 }
                : { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 2 },
            ]}>
            <Ionicons
              name={profilTab === 'utama' ? 'person' : 'person-outline'}
              size={18}
              color={profilTab === 'utama' ? colors.primaryText : colors.textMuted}
            />
            <AppText variant="label" color={profilTab === 'utama' ? 'primary' : 'textMuted'}>
              Utama
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              setProfilTab('admin');
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: profilTab === 'admin' }}
            style={[
              styles.tabItem,
              profilTab === 'admin'
                ? { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 2 }
                : { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 2 },
            ]}>
            <Ionicons
              name={profilTab === 'admin' ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={18}
              color={profilTab === 'admin' ? colors.primaryText : colors.textMuted}
            />
            <AppText variant="label" color={profilTab === 'admin' ? 'primary' : 'textMuted'}>
              Admin
            </AppText>
          </Pressable>
        </View>
      ) : null}

      <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
        <AppText variant="title" color="text" heading>
          Profil Saya
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(50).duration(320)}>
        <ProfileHeaderCard
          name={profile.full_name}
          dusun={profile.dusun}
          phone={profile.phone}
          role={profile.role}
          jabatan={profile.jabatan}
        />
      </Animated.View>

      {saveStatus ? (
        <InlineBanner
          tone={saveStatus.kind}
          message={saveStatus.message}
          onDismiss={() => setSaveStatus(null)}
          autoDismissMs={saveStatus.kind === 'success' ? 4000 : undefined}
        />
      ) : null}

      {/* TAB UTAMA — profil warga seperti biasa */}
      {profilTab === 'utama' || !isAdmin ? (
        <>
          <Animated.View entering={FadeInDown.delay(90).duration(320)}>
            <Surface tone="card" radius={Radius.lg} style={styles.formCard}>
              <View style={styles.sectionHead}>
                <AppText variant="heading" color="text" heading>
                  Data Diri
                </AppText>
                <AppText variant="caption" color="textMuted">
                  Ubah kalau ada yang perlu diperbarui
                </AppText>
              </View>

              <Input
                label="Nama lengkap"
                required
                value={fullName}
                onChangeText={(v) => {
                  setFullName(v);
                  setNameError(null);
                }}
                error={nameError}
                maxLength={80}
                autoComplete="name"
              />
              <Input
                label="Dusun atau RT"
                placeholder="Contoh: Dusun Krajan RT 02"
                value={dusun}
                onChangeText={setDusun}
                maxLength={60}
              />
              <Input
                label="Nomor HP"
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={16}
                autoComplete="tel"
              />
              <Button
                title="Simpan Perubahan"
                onPress={saveProfile}
                loading={saving}
                variant="outline"
              />
            </Surface>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(320)}>
            <AppearanceCard />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(320)}>
            <SecurityAccordion
              email={session.user.email ?? ''}
              emailConfirmed={!!session.user.email_confirmed_at}
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

          <Button
            title="Keluar dari Akun"
            variant="danger"
            onPress={() => setAskSignOut(true)}
            icon={<Ionicons name="log-out-outline" size={22} color={colors.danger} />}
          />

          <View style={styles.footer}>
            <AppText variant="caption" color="textMuted" align="center">
              Secaling — Keamanan Desa Segoropuro
            </AppText>
            <AppText variant="caption" color="textMuted" align="center">
              Dibuat oleh KKN UNIWARA, Universitas PGRI Wiranegara
            </AppText>
          </View>
        </>
      ) : null}

      {/* TAB ADMIN — pintasan perangkat desa, tanpa kartu Perangkat Desa lagi */}
      {isAdmin && profilTab === 'admin' ? (
        <>
          <Animated.View entering={FadeInDown.delay(90).duration(320)}>
            <Surface tone="card" radius={Radius.lg} style={styles.adminCard}>
              <View style={styles.adminHead}>
                <View style={[styles.adminIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="shield-checkmark" size={24} color={colors.primaryText} />
                </View>
                <View style={styles.adminHeadText}>
                  <AppText variant="heading" color="text" heading>
                    Perangkat Desa
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    Kelola laporan dan pengumuman
                  </AppText>
                </View>
              </View>
              <Button
                title="Buka Menu Admin"
                size="large"
                onPress={() => router.push('/admin')}
                icon={<Ionicons name="shield-checkmark-outline" size={22} color={colors.onPrimary} />}
              />
              <Button
                title="Tulis Pengumuman"
                variant="outline"
                onPress={() => router.push('/admin/pengumuman-baru')}
                icon={<Ionicons name="create-outline" size={22} color={colors.primaryText} />}
              />
            </Surface>
          </Animated.View>

          <View style={styles.footer}>
            <AppText variant="caption" color="textMuted" align="center">
              Secaling — Keamanan Desa Segoropuro
            </AppText>
            <AppText variant="caption" color="textMuted" align="center">
              Dibuat oleh KKN UNIWARA, Universitas PGRI Wiranegara
            </AppText>
          </View>
        </>
      ) : null}

      <ConfirmSheet
        visible={askSignOut}
        title="Keluar dari akun?"
        message="Anda tidak akan bisa melapor sampai masuk kembali. Pemberitahuan keamanan desa juga berhenti."
        confirmLabel="Ya, Keluar"
        cancelLabel="Tetap Masuk"
        destructive
        onConfirm={handleSignOut}
        onCancel={() => setAskSignOut(false)}
      />

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
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    marginTop: Spacing.xs,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  formCard: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sectionHead: {
    gap: 2,
  },
  adminCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  adminHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  adminIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminHeadText: {
    flex: 1,
    gap: 2,
  },
  footer: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.lg,
  },
});
