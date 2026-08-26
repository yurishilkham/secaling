import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/ui/brand-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/google-auth';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert('Lengkapi data', 'Email dan kata sandi wajib diisi.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('email not confirmed')) {
        Alert.alert('Email belum verifikasi', 'Akun Anda belum diverifikasi. Cek inbox email untuk tautan verifikasi atau kirim ulang.', [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Kirim ulang',
            onPress: async () => {
              const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email: email.trim().toLowerCase(),
              });
              if (resendError) Alert.alert('Gagal mengirim', resendError.message);
              else Alert.alert('Terkirim', 'Tautan verifikasi dikirim ulang ke email Anda.');
            },
          },
        ]);
        return;
      }
      if (msg.includes('invalid login credentials')) {
        Alert.alert('Gagal masuk', 'Email atau kata sandi salah. Coba lagi atau gunakan Masuk dengan Google.');
        return;
      }
      Alert.alert('Gagal masuk', error.message);
      return;
    }
    // pastikan session tersimpan sebelum navigasi (untuk warga & admin sama)
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session) {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } else {
      // fallback jika session belum ready (PKCE)
      setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
      }, 600);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // di web, akan redirect otomatis; di native, session sudah ter-set via exchangeCodeForSession
      // beri jeda sedikit agar onAuthStateChange terpicu sebelum navigasi
      setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
      }, 800);
    } catch (e: any) {
      Alert.alert('Gagal masuk Google', e?.message ?? 'Terjadi kesalahan saat login Google.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <Screen>
      <BrandHeader
        title="Selamat Datang Kembali"
        subtitle="Masuk untuk melapor kejadian dan terhubung dengan warga desa."
      />

      <View style={styles.form}>
        <Input
          label="Email"
          placeholder="nama@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="Kata Sandi"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title="Masuk" onPress={submit} loading={loading} icon={<Ionicons name="log-in-outline" size={18} color={theme.onPrimary} />} />

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>atau</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <Button
          title="Masuk dengan Google"
          onPress={handleGoogleLogin}
          loading={googleLoading}
          variant="outline"
          icon={<Ionicons name="logo-google" size={18} color={theme.primary} />}
        />
        <Text style={[styles.oauthNote, { color: theme.textMuted }]}>Untuk warga maupun admin — role tetap mengikuti data profil.</Text>
      </View>

      <View style={styles.footer}>
        <Text style={{ color: theme.textSecondary }}>Belum punya akun?</Text>
        <Pressable onPress={() => router.replace('/auth/register')}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Daftar sekarang</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
    marginTop: Spacing.five,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  oauthNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: -Spacing.one,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.four,
  },
});