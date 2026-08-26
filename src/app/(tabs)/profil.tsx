import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getRedirectUri } from '@/lib/google-auth';
import { registerForPushNotificationsAsync, unregisterPushNotifications } from '@/lib/notifications';
import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';

function isRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = (err as any).status ?? (err as any).code === 429 ? 429 : undefined;
  const code = String((err as any).code ?? (err as any).error_code ?? '').toLowerCase();
  const msg = String(err.message ?? (err as any).msg ?? '').toLowerCase();
  return (
    status === 429 ||
    code.includes('over_email') ||
    code.includes('rate_limit') ||
    msg.includes('rate limit') ||
    msg.includes('over_email') ||
    msg.includes('too many requests') ||
    msg.includes('429') ||
    msg.includes('email rate limit exceeded')
  );
}

export default function ProfilScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, profile, loading, refreshProfile, signOut } = useAuth();

  const [fullName, setFullName] = useState('');
  const [dusun, setDusun] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const emailCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setDusun(profile.dusun);
      setPhone(profile.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      registerForPushNotificationsAsync(session.user.id).then((token) => {
        if (token) setPushToken(token);
      });
    }
  }, [session?.user?.id]);

  useEffect(() => {
    return () => {
      if (emailCooldownRef.current) clearInterval(emailCooldownRef.current);
    };
  }, []);

  function startCooldown(seconds: number) {
    setEmailCooldown(seconds);
    if (emailCooldownRef.current) clearInterval(emailCooldownRef.current);
    emailCooldownRef.current = setInterval(() => {
      setEmailCooldown((prev) => {
        if (prev <= 1) {
          if (emailCooldownRef.current) clearInterval(emailCooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function saveProfile() {
    if (!session) return;
    if (!fullName.trim()) {
      Alert.alert('Nama wajib diisi', 'Isi nama lengkap Anda terlebih dahulu.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      full_name: fullName.trim(),
      dusun: dusun.trim(),
      phone: phone.trim(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Gagal menyimpan', error.message);
      return;
    }
    await refreshProfile();
    Alert.alert('Tersimpan', 'Data profil berhasil disimpan.');
  }

  async function handleSignOut() {
    await unregisterPushNotifications(pushToken);
    await signOut();
  }

  function showAlert(title: string, msg?: string) {
    const full = msg ? `${title}\n${msg}` : title;
    if (Platform.OS === 'web') {
      // @ts-ignore web fallback
      if (typeof window !== 'undefined' && window.alert) window.alert(full);
      else Alert.alert(title, msg);
    } else {
      Alert.alert(title, msg);
    }
  }

  async function handleChangeEmail() {
    if (emailLoading) return;
    if (emailCooldown > 0) {
      showAlert('Tunggu sebentar', `Batas pengiriman email tercapai. Coba lagi dalam ${emailCooldown} detik.`);
      return;
    }
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const activeSession = sessData.session ?? session;
      if (!activeSession) {
        showAlert('Sesi habis', 'Silakan keluar lalu masuk kembali sebelum mengubah email.');
        return;
      }
      const email = newEmail.trim().toLowerCase();
      if (!email) {
        showAlert('Lengkapi data', 'Email baru wajib diisi.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAlert('Email tidak valid', 'Masukkan format email yang benar.');
        return;
      }
      if (email === activeSession.user.email?.toLowerCase()) {
        showAlert('Info', 'Email baru sama dengan email saat ini.');
        return;
      }
      let redirectTo: string;
      try {
        redirectTo = getRedirectUri();
      } catch (e: any) {
        console.warn('getRedirectUri error', e);
        redirectTo = 'secaling://auth/callback';
      }
      setEmailLoading(true);
      let updateError: any = null;
      try {
        const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
        updateError = error;
      } catch (e: any) {
        updateError = e;
      }
      // Fallback via REST jika session tidak ditemukan di storage web (bug 403 Session not found di localhost:8081)
      if (updateError) {
        const msgLower = (updateError.message ?? '').toLowerCase();
        const isSessionErr =
          msgLower.includes('session not found') ||
          msgLower.includes('session_not_found') ||
          msgLower.includes('auth session missing') ||
          msgLower.includes('session missing');
        if (isSessionErr) {
          console.log('updateUser failed with session error, trying fallback REST', updateError);
          try {
            const token = activeSession.access_token;
            const res = await fetch(`${supabaseUrl}/auth/v1/user?redirect_to=${encodeURIComponent(redirectTo)}`, {
              method: 'PUT',
              headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              updateError = new Error(body.msg ?? body.message ?? `HTTP ${res.status}`);
              (updateError as any).code = body.error_code ?? body.code;
              (updateError as any).status = res.status;
            } else {
              updateError = null;
              console.log('fallback email update success', body);
            }
          } catch (fe: any) {
            console.log('fallback fetch error', fe);
            updateError = fe;
          }
        }
        if (updateError && (updateError as any).status === undefined && String(updateError.message).toLowerCase().includes('rate limit')) {
          (updateError as any).status = 429;
        }
      }
      setEmailLoading(false);
      if (updateError) {
        console.log('updateUser email error final', updateError);
        const msg = (updateError.message ?? '').toLowerCase();
        const code = String((updateError as any).code ?? (updateError as any).error_code ?? '').toLowerCase();
        if (isRateLimitError(updateError) || msg.includes('rate limit') || code.includes('over_email') || (updateError as any).status === 429) {
          startCooldown(60);
          showAlert(
            'Batas email tercapai (429)',
            'Supabase membatasi pengiriman email (free tier ± 2-4 email/jam). Tunggu 60 detik hingga 60 menit lalu coba lagi. Jangan spam tombol.\n\nJika sering terjadi: cek Supabase Dashboard > Authentication > Email Logs, atau gunakan custom SMTP.'
          );
          return;
        }
        if (msg.includes('email change') && msg.includes('pending')) {
          showAlert('Perubahan pending', 'Masih ada perubahan email yang belum dikonfirmasi. Cek inbox email lama & baru.');
          return;
        }
        if (msg.includes('auth session missing') || msg.includes('session missing') || msg.includes('session not found') || msg.includes('session_not_found')) {
          showAlert('Sesi habis', 'Sesi login habis atau tidak sinkron. Silakan KELUAR lalu MASUK kembali, lalu coba lagi. Jika di web, refresh halaman.');
          return;
        }
        if (msg.includes('rate limit') || msg.includes('over_email')) {
          startCooldown(60);
          showAlert('Terlalu sering', 'Anda terlalu sering mengirim perubahan email. Tunggu ±60 detik lalu coba lagi.');
          return;
        }
        if (msg.includes('redirect')) {
          showAlert('Gagal mengubah email', `Redirect tidak diizinkan: ${redirectTo}. Hubungi admin untuk whitelist. Pesan: ${updateError.message}`);
          return;
        }
        if (msg.includes('422') || msg.includes('already exists') || msg.includes('already registered') || msg.includes('duplicate')) {
          showAlert('Email sudah dipakai', 'Email tersebut sudah terdaftar akun lain.');
          return;
        }
        showAlert('Gagal mengubah email', updateError.message ?? String(updateError));
        return;
      }
      showAlert('Cek email Anda', `Tautan konfirmasi dikirim ke ${email}. Klik tautan di inbox (dan email lama jika diminta) untuk menyelesaikan. Jika tidak masuk, cek spam.`);
      setNewEmail('');
      startCooldown(60);
    } catch (e: any) {
      setEmailLoading(false);
      console.log('handleChangeEmail exception', e);
      if (isRateLimitError(e)) {
        startCooldown(60);
        showAlert('Batas email tercapai (429)', 'Terlalu banyak permintaan. Tunggu 60 detik hingga 60 menit lalu coba lagi.');
        return;
      }
      showAlert('Error', e?.message ?? String(e));
    }
  }

  async function handleChangePassword() {
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const activeSession = sessData.session ?? session;
      if (!activeSession) {
        showAlert('Sesi habis', 'Silakan keluar lalu masuk kembali sebelum mengubah kata sandi.');
        return;
      }
      if (!newPassword || !confirmPassword) {
        showAlert('Lengkapi data', 'Kata sandi baru dan konfirmasi wajib diisi.');
        return;
      }
      if (newPassword.length < 6) {
        showAlert('Kata sandi terlalu pendek', 'Gunakan minimal 6 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        showAlert('Konfirmasi tidak cocok', 'Pastikan kedua kata sandi sama.');
        return;
      }
      setPassLoading(true);
      let passError: any = null;
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        passError = error;
      } catch (e: any) {
        passError = e;
      }
      if (passError) {
        const msgLower = (passError.message ?? '').toLowerCase();
        const isSessionErr =
          msgLower.includes('session not found') ||
          msgLower.includes('session_not_found') ||
          msgLower.includes('auth session missing') ||
          msgLower.includes('session missing');
        if (isSessionErr) {
          console.log('password update session error, trying fallback REST', passError);
          try {
            const token = activeSession.access_token;
            const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
              method: 'PUT',
              headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ password: newPassword }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              passError = new Error(body.msg ?? body.message ?? `HTTP ${res.status}`);
              (passError as any).status = res.status;
            } else {
              passError = null;
              console.log('fallback password update success', body);
            }
          } catch (fe: any) {
            console.log('fallback password fetch error', fe);
            passError = fe;
          }
        }
      }
      setPassLoading(false);
      if (passError) {
        console.log('updateUser password error final', passError);
        const msg = (passError.message ?? '').toLowerCase();
        if (isRateLimitError(passError)) {
          showAlert('Batas permintaan tercapai', 'Terlalu banyak percobaan. Tunggu 60 detik lalu coba lagi.');
          return;
        }
        if (msg.includes('auth session missing') || msg.includes('session missing') || msg.includes('session not found') || msg.includes('session_not_found')) {
          showAlert('Sesi habis', 'Sesi login habis atau tidak sinkron. Silakan KELUAR lalu MASUK kembali, lalu coba lagi. Refresh jika di web.');
          return;
        }
        if (msg.includes('nonce') || msg.includes('reauthentication') || msg.includes('recently signed in')) {
          showAlert('Perlu verifikasi ulang', 'Untuk keamanan, silakan keluar lalu masuk kembali (login ulang), lalu coba ubah kata sandi lagi dalam 24 jam.');
          return;
        }
        if (msg.includes('weak') || msg.includes('password')) {
          showAlert('Gagal mengubah kata sandi', passError.message ?? String(passError));
          return;
        }
        showAlert('Gagal mengubah kata sandi', passError.message ?? String(passError));
        return;
      }
      showAlert('Berhasil', 'Kata sandi berhasil diperbarui. Silakan gunakan kata sandi baru untuk login berikutnya.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPassLoading(false);
      console.log('handleChangePassword exception', e);
      showAlert('Error', e?.message ?? String(e));
    }
  }

  if (loading) {
    return (
      <Screen scroll={false}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>Memuat…</Text>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen scroll={false}>
        <View style={styles.guard}>
          <View style={[styles.guardIcon, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="person-circle-outline" size={36} color={theme.primary} />
          </View>
          <Text style={[styles.guardTitle, { color: theme.text }]}>Akun Warga</Text>
          <Text style={[styles.guardDesc, { color: theme.textSecondary }]}>
            Masuk atau daftar untuk bisa melapor kejadian dan menerima peringatan keamanan desa.
          </Text>
          <Button title="Masuk" onPress={() => router.push('/auth/login')} />
          <Button
            title="Daftar Akun Baru"
            variant="outline"
            onPress={() => router.push('/auth/register')}
          />
        </View>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Lengkapi Profil</Text>
        <Text style={[styles.pageSub, { color: theme.textSecondary }]}>
          Isi data diri agar laporan Anda bisa dipertanggungjawabkan.
        </Text>

        <Input label="Nama Lengkap" placeholder="Nama sesuai KTP" value={fullName} onChangeText={setFullName} maxLength={80} />
        <Input label="Dusun / RT (opsional)" placeholder="Contoh: Dusun Krajan RT 02" value={dusun} onChangeText={setDusun} maxLength={60} />
        <Input label="No. HP (opsional)" placeholder="08xxxxxxxxxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={16} />
        <Button title="Simpan Profil" onPress={saveProfile} loading={saving} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[styles.pageTitle, { color: theme.text }]}>Profil Saya</Text>

      <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}>
          <Text style={[styles.avatarText, { color: theme.onPrimary }]}>
            {profile.full_name.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.profileName, { color: theme.text }]}>{profile.full_name}</Text>
          <Text style={[styles.profileMeta, { color: theme.textSecondary }]}>
            {profile.dusun || 'Dusun belum diisi'}
          </Text>
          <Text style={[styles.profileMeta, { color: theme.textSecondary }]}>
            {profile.phone || 'No. HP belum diisi'}
          </Text>
        </View>
        <View
          style={[
            styles.roleBadge,
            {
              backgroundColor: profile.role === 'admin' ? theme.primarySoft : theme.background,
            },
          ]}>
          <Text
            style={[
              styles.roleText,
              { color: profile.role === 'admin' ? theme.primary : theme.textSecondary },
            ]}>
            {profile.role === 'admin' ? 'Admin Desa' : 'Warga'}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <Input label="Nama Lengkap" value={fullName} onChangeText={setFullName} maxLength={80} />
        <Input label="Dusun / RT" value={dusun} onChangeText={setDusun} maxLength={60} />
        <Input label="No. HP" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={16} />
        <Button title="Simpan Perubahan" onPress={saveProfile} loading={saving} variant="outline" />
      </View>

      {profile.role === 'admin' ? (
        <View style={styles.adminMenu}>
          <Button
            title="Menu Admin · Kelola Konten"
            onPress={() => router.push('/admin')}
            icon={<Ionicons name="shield-outline" size={18} color={theme.onPrimary} />}
          />
          <Button
            title="Tulis Pengumuman Desa"
            variant="outline"
            onPress={() => router.push('/admin/pengumuman-baru')}
            icon={<Ionicons name="create-outline" size={18} color={theme.primary} />}
          />
          <Button
            title="Pengaturan Akun Admin"
            variant="outline"
            onPress={() => router.push('/admin/pengaturan')}
            icon={<Ionicons name="settings-outline" size={18} color={theme.primary} />}
          />
        </View>
      ) : null}

      {/* Ubah Email & Kata Sandi — tersedia untuk semua role (warga & admin) */}
      <View style={[styles.accountCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="mail-outline" size={20} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Ubah Email</Text>
        </View>
        <Text style={[styles.currentLabel, { color: theme.textMuted }]}>
          Email saat ini: <Text style={{ color: theme.text, fontWeight: '700' }}>{session.user.email}</Text>
          {session.user.email_confirmed_at ? '' : ' (belum terverifikasi)'}
        </Text>
        <Input
          label="Email Baru"
          placeholder="email.baru@contoh.com"
          value={newEmail}
          onChangeText={setNewEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button
          title={emailCooldown > 0 ? `Tunggu ${emailCooldown}s` : 'Ubah Email'}
          onPress={handleChangeEmail}
          loading={emailLoading}
          disabled={emailLoading || emailCooldown > 0}
          icon={<Ionicons name="mail" size={16} color={theme.onPrimary} />}
        />
        {emailCooldown > 0 ? (
          <Text style={[styles.hint, { color: theme.danger }]}>Batas email tercapai — tombol terkunci {emailCooldown} detik.</Text>
        ) : null}
        <Text style={[styles.hint, { color: theme.textMuted }]}>Setelah submit, cek inbox email baru (dan lama jika diminta) dan klik tautan konfirmasi. Jika error 429, tunggu 1 jam.</Text>
      </View>

      <View style={[styles.accountCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="key-outline" size={20} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Ubah Kata Sandi</Text>
        </View>
        <Input label="Kata Sandi Baru" placeholder="Minimal 6 karakter" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <Input label="Konfirmasi Kata Sandi" placeholder="Ulangi kata sandi baru" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <Button title="Ubah Kata Sandi" onPress={handleChangePassword} loading={passLoading} icon={<Ionicons name="lock-closed" size={16} color={theme.onPrimary} />} />
        <Text style={[styles.hint, { color: theme.textMuted }]}>Untuk akun Google, mengatur kata sandi memungkinkan login via email+password juga.</Text>
      </View>

      <Button title="Keluar" variant="danger" onPress={handleSignOut} />

      <Text style={[styles.copyright, { color: theme.textMuted }]}>
        © 2026 KKN UNIWARA — Universitas PGRI Wiranegara
      </Text>
      <Text style={[styles.copyrightSub, { color: theme.textMuted }]}>
        Dibuat untuk Desa Segoropuro. All Rights Reserved.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: Spacing.two,
  },
  pageSub: {
    fontSize: 14,
    lineHeight: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    ...Shadows.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
  },
  profileMeta: {
    fontSize: 13,
  },
  roleBadge: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.full,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  form: {
    gap: Spacing.three,
  },
  adminMenu: {
    gap: Spacing.two,
  },
  accountCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two + 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  currentLabel: { fontSize: 13, lineHeight: 19 },
  hint: { fontSize: 12, lineHeight: 17 },
  guard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  guardIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  guardDesc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingTop: Spacing.six,
  },
  appInfo: {
    fontSize: 12,
    textAlign: 'center',
  },
  copyright: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
  copyrightSub: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.7,
  },
});
