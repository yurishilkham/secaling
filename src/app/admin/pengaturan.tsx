import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getRedirectUri } from '@/lib/google-auth';
import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';

function isRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = (err as any).status ?? (err as any).code === 429 ? 429 : undefined;
  const code = String((err as any).code ?? (err as any).error_code ?? '').toLowerCase();
  const msg = String(err.message ?? err.msg ?? '').toLowerCase();
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

export default function AdminPengaturanScreen() {
  const theme = useTheme();
  const { session, profile, loading } = useAuth();

  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const emailCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

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

  if (loading) {
    return (
      <Screen scroll={false}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>Memuat…</Text>
      </Screen>
    );
  }

  if (!session || !profile || profile.role !== 'admin') {
    return (
      <Screen scroll={false}>
        <View style={styles.guard}>
          <View style={[styles.guardIcon, { backgroundColor: theme.dangerSoft }]}>
            <Ionicons name="lock-closed" size={32} color={theme.danger} />
          </View>
          <Text style={[styles.guardTitle, { color: theme.danger }]}>Akses Ditolak</Text>
          <Text style={[styles.guardDesc, { color: theme.textSecondary }]}>Halaman ini khusus admin desa.</Text>
        </View>
      </Screen>
    );
  }

  function showAlert(title: string, msg?: string) {
    const full = msg ? `${title}\n${msg}` : title;
    if (Platform.OS === 'web') {
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
      if (updateError) {
        const msgLower = (updateError.message ?? '').toLowerCase();
        const isSessionErr =
          msgLower.includes('session not found') ||
          msgLower.includes('session_not_found') ||
          msgLower.includes('auth session missing') ||
          msgLower.includes('session missing');
        if (isSessionErr) {
          console.log('admin email session error, fallback REST', updateError);
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
              // 429 fallback tetap harus ditangani sebagai rate limit
              if (res.status === 429) {
                (updateError as any).status = 429;
              }
            } else {
              updateError = null;
              console.log('fallback admin email success', body);
            }
          } catch (fe: any) {
            console.log('fallback admin email fetch error', fe);
            updateError = fe;
          }
        }
        // Tandai status jika error dari supabase-js mengandung status 429
        if (updateError && (updateError as any).status === undefined && String(updateError.message).toLowerCase().includes('rate limit')) {
          (updateError as any).status = 429;
        }
      }
      setEmailLoading(false);
      if (updateError) {
        console.log('updateUser email error final', updateError);
        const msg = (updateError.message ?? '').toLowerCase();
        const code = String((updateError as any).code ?? (updateError as any).error_code ?? '').toLowerCase();
        // Rate limit — 429 Too Many Requests (over_email_send_rate_limit)
        if (isRateLimitError(updateError) || msg.includes('rate limit') || code.includes('over_email') || (updateError as any).status === 429) {
          startCooldown(60);
          showAlert(
            'Batas email tercapai (429)',
            'Supabase membatasi pengiriman email (free tier ± 2-4 email/jam untuk perubahan email). Tunggu 60 detik hingga 60 menit, lalu coba lagi. Jangan spam tombol.\n\nJika sering terjadi: cek Supabase Dashboard > Authentication > Email Logs / Rate Limits, atau ganti ke custom SMTP. Untuk uji coba, coba ganti email lagi nanti atau hubungi admin project.'
          );
          return;
        }
        if (msg.includes('email change') && msg.includes('pending')) {
          showAlert('Perubahan pending', 'Masih ada perubahan email yang belum dikonfirmasi. Cek inbox email lama & baru, atau hubungi admin untuk reset.');
          return;
        }
        if (msg.includes('auth session missing') || msg.includes('session missing') || msg.includes('session not found') || msg.includes('session_not_found')) {
          showAlert('Sesi habis', 'Sesi login habis atau tidak sinkron. Silakan KELUAR lalu MASUK kembali, lalu coba lagi. Jika di web, refresh.');
          return;
        }
        if (msg.includes('redirect')) {
          showAlert('Gagal mengubah email', `Redirect tidak diizinkan: ${redirectTo}. Pesan: ${updateError.message}`);
          return;
        }
        if (msg.includes('422') || msg.includes('already exists') || msg.includes('already registered') || msg.includes('duplicate')) {
          showAlert('Email sudah dipakai', 'Email tersebut sudah terdaftar akun lain. Gunakan email lain.');
          return;
        }
        showAlert('Gagal mengubah email', updateError.message ?? String(updateError));
        return;
      }
      showAlert('Cek email Anda', `Tautan konfirmasi dikirim ke ${email} (dan ke email lama jika "Secure email change" aktif). Klik tautan di kedua inbox untuk menyelesaikan. Jika tidak masuk, cek spam.`);
      setNewEmail('');
      // Beri cooldown ringan agar tidak spam langsung
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
          console.log('admin password session error, fallback REST', passError);
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
              console.log('fallback admin password success', body);
            }
          } catch (fe: any) {
            console.log('fallback admin password fetch error', fe);
            passError = fe;
          }
        }
      }
      setPassLoading(false);
      if (passError) {
        console.log('updateUser password error final', passError);
        const msg = (passError.message ?? '').toLowerCase();
        if (isRateLimitError(passError)) {
          showAlert('Batas permintaan tercapai', 'Terlalu banyak percobaan ubah kata sandi. Tunggu 60 detik lalu coba lagi.');
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

  return (
    <Screen>
      <Text style={[styles.pageTitle, { color: theme.text }]}>Pengaturan Admin</Text>
      <Text style={[styles.pageSub, { color: theme.textSecondary }]}>Kelola email dan kata sandi akun admin. Perubahan email memerlukan verifikasi via email baru.</Text>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
          placeholder="admin.baru@segoropuro.desa"
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
          <Text style={[styles.hint, { color: theme.danger }]}>Batas email tercapai — tombol terkunci {emailCooldown} detik. Jangan tutup halaman.</Text>
        ) : null}
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Setelah submit, cek inbox email baru dan klik tautan konfirmasi. Login Google tidak terpengaruh, tapi email login password akan berubah. Jika 429, tunggu 1 jam atau ganti SMTP di Supabase Dashboard.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="key-outline" size={20} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Ubah Kata Sandi</Text>
        </View>
        <Input label="Kata Sandi Baru" placeholder="Minimal 6 karakter" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <Input label="Konfirmasi Kata Sandi" placeholder="Ulangi kata sandi baru" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <Button
          title="Ubah Kata Sandi"
          onPress={handleChangePassword}
          loading={passLoading}
          icon={<Ionicons name="lock-closed" size={16} color={theme.onPrimary} />}
        />
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Untuk akun yang login via Google, mengatur kata sandi akan memungkinkan login via email+password juga.
        </Text>
      </View>

      <View style={[styles.infoBox, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
        <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Admin juga bisa login via Google menggunakan tombol “Masuk dengan Google” jika email Google sudah terdaftar dan role di-profiles = admin. Untuk error 429, cek Supabase Dashboard &gt; Auth &gt; Rate Limits.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 22, fontWeight: '800', marginTop: Spacing.two },
  pageSub: { fontSize: 14, lineHeight: 20 },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two + 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  currentLabel: { fontSize: 13, lineHeight: 19 },
  hint: { fontSize: 12, lineHeight: 17 },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
  guard: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four },
  guardIcon: { width: 72, height: 72, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  guardTitle: { fontSize: 20, fontWeight: '800' },
  guardDesc: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingTop: Spacing.six },
});
