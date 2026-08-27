import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/back-button';
import { BrandHeader } from '@/components/ui/brand-header';
import { Button } from '@/components/ui/button';
import { InlineBanner } from '@/components/ui/inline-banner';
import { Input } from '@/components/ui/input';
import { OrDivider } from '@/components/ui/or-divider';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { friendlyError } from '@/lib/errors';
import { signInWithGoogle } from '@/lib/google-auth';
import { supabase } from '@/lib/supabase';

type FieldErrors = { email?: string; password?: string };

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<
    { tone: 'error' | 'success' | 'info'; message: string } | null
  >(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resending, setResending] = useState(false);
  /** Email belum diperiksa — tombol kirim ulang ditampilkan. */
  const [needsVerify, setNeedsVerify] = useState(false);

  function goHome() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  async function submit() {
    const cleanEmail = email.trim().toLowerCase();

    const next: FieldErrors = {};
    if (!cleanEmail) next.email = 'Tulis email Anda.';
    if (!password) next.password = 'Tulis kata sandi Anda.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBanner(null);
    setNeedsVerify(false);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();

      // Email belum diperiksa: dulu ini memunculkan Alert bertombol, lalu Alert
      // lagi di dalam callback-nya — popup di atas popup.
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setNeedsVerify(true);
        setBanner({
          tone: 'info',
          message:
            'Email Anda belum dipastikan. Buka kotak masuk email dan ketuk tautan dari kami, atau minta kami kirim ulang di bawah.',
        });
        return;
      }

      if (msg.includes('invalid login credentials')) {
        setErrors({
          password: 'Email atau kata sandi salah. Periksa lagi.',
        });
        setBanner({
          tone: 'error',
          message:
            'Kalau lupa kata sandi, Anda bisa masuk memakai akun Google dengan email yang sama.',
        });
        return;
      }

      setBanner({ tone: 'error', message: friendlyError(error, 'login').message });
      return;
    }

    /**
     * Navigasi setelah sesi benar-benar terbaca.
     *
     * Kode lama memakai `setTimeout(..., 600)` sebagai jalan cadangan: kalau
     * sesi belum terbaca, tetap pindah halaman setelah 600ms tanpa memastikan
     * apa pun. Di sambungan lambat itu memindahkan warga meski masuknya belum
     * tentu berhasil.
     */
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      goHome();
      return;
    }
    setBanner({
      tone: 'error',
      message: 'Masuk belum selesai. Periksa sambungan internet Anda, lalu coba lagi.',
    });
  }

  async function resendVerification() {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    setResending(false);

    if (error) {
      setBanner({ tone: 'error', message: friendlyError(error, 'resendVerify').message });
      return;
    }
    setBanner({
      tone: 'success',
      message: 'Sudah kami kirim ulang. Buka kotak masuk email Anda.',
    });
  }

  async function handleGoogleLogin() {
    setBanner(null);
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      // Sama seperti di atas: pastikan sesinya ada, bukan menebak lewat jeda.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        goHome();
        return;
      }
      setBanner({
        tone: 'error',
        message: 'Masuk dengan Google belum selesai. Coba lagi.',
      });
    } catch (e) {
      const msg = String((e as Error)?.message ?? '').toLowerCase();
      // Warga menutup jendela Google sendiri — itu bukan kesalahan.
      if (msg.includes('dibatalkan') || msg.includes('cancel')) {
        setGoogleLoading(false);
        return;
      }
      setBanner({ tone: 'error', message: friendlyError(e, 'googleLogin').message });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <Screen noTabBar>
      {/* Header navigasi sudah dihapus, jadi layar ini menyediakan jalan
          kembalinya sendiri. Penting: warga bisa membuka halaman ini dari
          Profil atau dari layar Lapor, dan harus bisa membatalkan. */}
      <BackButton label="Kembali" />

      <Animated.View entering={FadeIn.duration(320)}>
        <BrandHeader
          title="Selamat Datang"
          subtitle="Masuk untuk melapor kejadian dan menerima kabar keamanan desa."
        />
      </Animated.View>

      {banner ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <InlineBanner
            tone={banner.tone}
            message={banner.message}
            onDismiss={() => setBanner(null)}
          />
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(60).duration(320)}>
        <Surface tone="card" radius={Radius.xl} style={styles.form}>
          <Input
            label="Email"
            required
            placeholder="nama@gmail.com"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setErrors((p) => ({ ...p, email: undefined }));
            }}
            error={errors.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />

          <Input
            label="Kata Sandi"
            required
            placeholder="Tulis kata sandi Anda"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setErrors((p) => ({ ...p, password: undefined }));
            }}
            error={errors.password}
            secureTextEntry
            autoComplete="current-password"
          />

          <Button
            title="Masuk"
            size="large"
            onPress={submit}
            loading={loading}
            icon={<Ionicons name="log-in-outline" size={24} color={colors.onPrimary} />}
          />

          {needsVerify ? (
            <Button
              title="Kirim Ulang Email"
              variant="outline"
              onPress={resendVerification}
              loading={resending}
              icon={<Ionicons name="mail-outline" size={22} color={colors.primaryText} />}
            />
          ) : null}

          <OrDivider />

          <Button
            title="Masuk dengan Google"
            variant="outline"
            onPress={handleGoogleLogin}
            loading={googleLoading}
            icon={<Ionicons name="logo-google" size={22} color={colors.primaryText} />}
          />
        </Surface>
      </Animated.View>

      {/* Tautan pindah halaman jadi tombol selebar layar.
          Sebelumnya ini teks 14px tanpa latar — tinggi terlihatnya sekitar 18px,
          padahal itu satu-satunya jalan menuju halaman daftar. */}
      <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.footer}>
        <AppText variant="secondary" color="textSecondary" align="center">
          Belum punya akun Secaling?
        </AppText>
        <Button
          title="Daftar Akun Baru"
          variant="secondary"
          onPress={() => router.replace('/auth/register')}
          icon={<Ionicons name="person-add-outline" size={22} color={colors.primaryText} />}
        />
      </Animated.View>

      <View style={styles.spacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  footer: {
    gap: Spacing.sm,
  },
  spacer: {
    height: Spacing.lg,
  },
});
