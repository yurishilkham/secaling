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

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [dusun, setDusun] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submit() {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Lengkapi data', 'Nama, email, dan kata sandi wajib diisi.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Kata sandi terlalu pendek', 'Gunakan minimal 6 karakter.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Gagal mendaftar', error.message);
      return;
    }

    if (data.session) {
      await supabase.from('profiles').insert({
        id: data.user!.id,
        full_name: fullName.trim(),
        dusun: dusun.trim(),
        phone: phone.trim(),
      });
      Alert.alert('Pendaftaran berhasil', 'Akun Anda siap digunakan.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Cek email Anda', 'Kami mengirim tautan verifikasi. Verifikasi lalu masuk.', [
        { text: 'OK', onPress: () => router.replace('/auth/login') },
      ]);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
      }, 800);
    } catch (e: any) {
      Alert.alert('Gagal daftar Google', e?.message ?? 'Terjadi kesalahan saat daftar Google.');
    } finally {
      setGoogleLoading(false);
    }
  }

return (
    <Screen>
      <BrandHeader
        title="Daftar Akun Warga"
        subtitle="Bergabunglah untuk melapor kejadian dan menjaga keamanan Desa Segoropuro."
      />

      <View style={styles.form}>
        <Input label="Nama Lengkap" placeholder="Nama sesuai KTP" value={fullName} onChangeText={setFullName} maxLength={80} />
        <Input label="Dusun / RT (opsional)" placeholder="Contoh: Dusun Krajan RT 02" value={dusun} onChangeText={setDusun} maxLength={60} />
        <Input label="No. HP (opsional)" placeholder="08xxxxxxxxxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={16} />
        <Input label="Email" placeholder="nama@email.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Kata Sandi" placeholder="Minimal 6 karakter" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title="Daftar" onPress={submit} loading={loading} icon={<Ionicons name="person-add-outline" size={18} color={theme.onPrimary} />} />

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>atau</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <Button
          title="Daftar dengan Google"
          onPress={handleGoogleLogin}
          loading={googleLoading}
          variant="outline"
          icon={<Ionicons name="logo-google" size={18} color={theme.primary} />}
        />
        <Text style={[styles.oauthNote, { color: theme.textMuted }]}>Daftar via Google otomatis sebagai warga. Admin perlu di-promote via DB.</Text>
      </View>

      <View style={styles.footer}>
        <Text style={{ color: theme.textSecondary }}>Sudah punya akun?</Text>
        <Pressable onPress={() => router.replace('/auth/login')}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Masuk</Text>
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