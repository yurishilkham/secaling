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
import { useJedaEmail } from '@/hooks/use-jeda-email';
import { friendlyError } from '@/lib/errors';
import { getRedirectUri, signInWithGoogle } from '@/lib/google-auth';
import { supabase } from '@/lib/supabase';

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [dusun, setDusun] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ tone: 'error' | 'success'; message: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  /** Sedang mengirim ulang email konfirmasi. */
  const [resending, setResending] = useState(false);
  /** Sedang memeriksa apakah tautan konfirmasi sudah diketuk. */
  const [checking, setChecking] = useState(false);
  /** Pendaftaran berhasil, tinggal memeriksa email. */
  const [done, setDone] = useState(false);

  // Menahan tombol kirim ulang di layar tunggu supaya kuota email tidak habis.
  const { sisa: jedaSisa, mulai: mulaiJeda, sedangMenunggu: sedangJeda } = useJedaEmail();

  /**
   * Kirim ulang email konfirmasi dari layar tunggu.
   *
   * Sebelumnya tombol ini hanya ada di layar masuk, jadi warga yang emailnya
   * tidak sampai harus menebak untuk pindah ke sana dulu.
   */
  async function kirimUlang() {
    if (sedangJeda) return;

    setBanner(null);
    setResending(true);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: getRedirectUri() },
    });

    setResending(false);

    if (error) {
      setBanner({ tone: 'error', message: friendlyError(error, 'kirimUlangDaftar').message });
      return;
    }

    mulaiJeda();
    setBanner({ tone: 'success', message: 'Email sudah dikirim ulang.' });
  }

  function clearError(key: keyof FieldErrors) {
    setErrors((p) => ({ ...p, [key]: undefined }));
  }

  async function submit() {
    const name = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    const next: FieldErrors = {};
    if (!name) next.fullName = 'Tulis nama lengkap Anda.';
    else if (name.length < 3) next.fullName = 'Nama terlalu pendek.';

    if (!cleanEmail) next.email = 'Tulis email Anda.';
    else if (!EMAIL_PATTERN.test(cleanEmail))
      next.email = 'Penulisan email belum benar. Contoh: nama@gmail.com';

    if (!password) next.password = 'Buat kata sandi untuk akun Anda.';
    else if (password.length < 6)
      next.password = 'Kata sandi harus 6 huruf atau angka atau lebih.';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBanner(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: name, dusun: dusun.trim(), phone: phone.trim() },
        /**
         * WAJIB ADA. Tanpa ini Supabase memakai Site URL bawaannya —
         * `http://localhost:3000` — sebagai tujuan tautan di email. Warga yang
         * mengetuk tautan itu di HP membuka peramban ke halaman yang tidak ada,
         * dan akunnya tidak pernah terkonfirmasi.
         *
         * Dengan `secaling://auth/callback`, Android membuka Secaling langsung
         * lewat deep link, dan `src/app/auth/callback.tsx` menyelesaikan
         * verifikasinya.
         */
        emailRedirectTo: getRedirectUri(),
      },
    });

    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setErrors({ email: 'Email ini sudah punya akun. Silakan masuk saja.' });
        return;
      }
      setBanner({ tone: 'error', message: friendlyError(error, 'register').message });
      return;
    }

    if (data.session && data.user) {
      /**
       * Kegagalan menyimpan profil sekarang diperiksa.
       *
       * Kode lama memanggil `insert` tanpa memeriksa hasilnya, lalu tetap
       * menampilkan "Pendaftaran berhasil". Kalau insert-nya gagal, warga
       * mendarat di layar Profil dengan pesan "Lengkapi Data" tanpa penjelasan
       * apa pun.
       */
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: name,
        dusun: dusun.trim(),
        phone: phone.trim(),
      });

      if (profileError) {
        setBanner({
          tone: 'error',
          message:
            'Akun Anda sudah dibuat, tapi data diri belum tersimpan. Silakan lengkapi lagi di halaman Profil.',
        });
        // Akunnya tetap jadi, jadi tetap masuk ke app.
        setTimeout(() => router.replace('/(tabs)/profil'), 1200);
        return;
      }

      router.replace('/(tabs)');
      return;
    }

    // Perlu memeriksa email dulu. Jeda dimulai supaya tombol kirim ulang di
    // layar berikutnya tidak bisa ditekan berulang.
    mulaiJeda();
    setDone(true);
  }

  /**
   * Periksa apakah warga sudah mengetuk tautan konfirmasi.
   *
   * Menutup kasus yang sering terjadi: email dibuka di perangkat LAIN, misalnya
   * laptop. Deep link `secaling://` hanya berlaku di HP yang memasang Secaling,
   * jadi kalau tautannya diketuk di laptop, HP-nya tidak ikut masuk dan warga
   * terjebak di layar tunggu tanpa jalan keluar.
   *
   * `signInWithPassword` dipakai, bukan `getSession`, karena akun ini belum
   * pernah punya sesi di perangkat ini — tidak ada yang bisa diperiksa.
   */
  async function periksaKonfirmasi() {
    setBanner(null);
    setChecking(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setChecking(false);

    if (!error) {
      router.replace('/(tabs)');
      return;
    }

    const msg = error.message.toLowerCase();
    if (msg.includes('not confirmed') || msg.includes('email not confirmed')) {
      setBanner({
        tone: 'error',
        message:
          'Email Anda belum dikonfirmasi. Buka kotak masuk email, lalu ketuk tautan dari kami.',
      });
      return;
    }

    setBanner({ tone: 'error', message: friendlyError(error, 'periksaKonfirmasi').message });
  }

  async function handleGoogleRegister() {
    setBanner(null);
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // `replace`, bukan `back()`. Dengan `back()` warga yang tiba di sini
        // lewat layar callback justru dikembalikan ke layar itu, yang lalu diam
        // menunggu dan tampil sebagai halaman putih.
        router.replace('/(tabs)');
        return;
      }
      setBanner({ tone: 'error', message: 'Pendaftaran dengan Google belum selesai. Coba lagi.' });
    } catch (e) {
      const msg = String((e as Error)?.message ?? '').toLowerCase();
      if (msg.includes('dibatalkan') || msg.includes('cancel')) {
        setGoogleLoading(false);
        return;
      }

      // Sama seperti di layar masuk: sesi yang nyata lebih menentukan daripada
      // error dari langkah yang kalah cepat.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/(tabs)');
        return;
      }

      setBanner({ tone: 'error', message: friendlyError(e, 'googleRegister').message });
    } finally {
      setGoogleLoading(false);
    }
  }

  // --- Sudah terdaftar, tinggal periksa email ---
  if (done) {
    return (
      <Screen noTabBar center>
        <Animated.View entering={FadeIn.duration(300)}>
          <Surface tone="card" radius={Radius.xl} style={styles.doneCard}>
            <View style={[styles.doneIcon, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="mail-open-outline" size={44} color={colors.success} />
            </View>

            <AppText variant="heading" color="text" align="center" heading>
              Satu langkah lagi
            </AppText>

            <AppText variant="body" color="textSecondary" align="center" style={styles.doneText}>
              Kami sudah mengirim email ke{' '}
              <AppText variant="bodyStrong" color="text">
                {email.trim().toLowerCase()}
              </AppText>
              . Buka kotak masuk email itu dan ketuk tautan dari kami.
            </AppText>

            {banner ? (
              <InlineBanner
                tone={banner.tone}
                message={banner.message}
                onDismiss={() => setBanner(null)}
              />
            ) : null}

            {/* Jalan keluar utama: warga yang membuka email di perangkat lain
                (laptop, HP keluarga) tidak akan otomatis masuk di HP ini,
                karena deep link `secaling://` hanya berlaku di perangkat yang
                memasang Secaling. Tombol ini menutup kasus itu. */}
            <Button
              title="Saya Sudah Konfirmasi"
              size="large"
              onPress={periksaKonfirmasi}
              loading={checking}
              icon={
                <Ionicons name="checkmark-circle-outline" size={24} color={colors.onPrimary} />
              }
              style={styles.doneBtn}
            />

            <AppText variant="caption" color="textMuted" align="center" style={styles.doneText}>
              Emailnya belum datang? Coba periksa folder spam.
            </AppText>

            <Button
              title={sedangJeda ? `Kirim ulang dalam ${jedaSisa} detik` : 'Kirim Ulang Email'}
              variant="outline"
              onPress={kirimUlang}
              loading={resending}
              disabled={sedangJeda}
              icon={<Ionicons name="mail-outline" size={22} color={colors.primaryText} />}
            />

            <Button
              title="Ke Halaman Masuk"
              variant="ghost"
              onPress={() => router.replace('/auth/login')}
            />
          </Surface>
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen noTabBar>
      {/* Header navigasi sudah dihapus, jadi layar ini menyediakan jalan
          kembalinya sendiri. Penting: warga bisa membuka halaman ini dari
          Profil atau dari layar Lapor, dan harus bisa membatalkan. */}
      <BackButton label="Kembali" />

      <Animated.View entering={FadeIn.duration(320)}>
        <BrandHeader
          title="Daftar Akun Warga"
          subtitle="Buat akun supaya Anda bisa melapor dan ikut menjaga keamanan Desa Segoropuro."
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
            label="Nama lengkap"
            required
            hint="Tulis sesuai KTP. Nama ini tercantum di laporan Anda."
            placeholder="Nama lengkap Anda"
            value={fullName}
            onChangeText={(v) => {
              setFullName(v);
              clearError('fullName');
            }}
            error={errors.fullName}
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
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={16}
            autoComplete="tel"
          />

          <Input
            label="Email"
            required
            hint="Dipakai untuk masuk dan memulihkan akun"
            placeholder="nama@gmail.com"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              clearError('email');
            }}
            error={errors.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />

          <Input
            label="Buat kata sandi"
            required
            hint="Paling sedikit 6 huruf atau angka"
            placeholder="Kata sandi baru"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              clearError('password');
            }}
            error={errors.password}
            secureTextEntry
            autoComplete="new-password"
          />

          <Button
            title="Daftar"
            size="large"
            onPress={submit}
            loading={loading}
            icon={<Ionicons name="person-add-outline" size={24} color={colors.onPrimary} />}
          />

          <OrDivider />

          <Button
            title="Daftar dengan Google"
            variant="outline"
            onPress={handleGoogleRegister}
            loading={googleLoading}
            icon={<Ionicons name="logo-google" size={22} color={colors.primaryText} />}
          />

          {/* Catatan lama di sini: "Daftar via Google otomatis sebagai warga.
              Admin perlu di-promote via DB." — dihapus. */}
          <AppText variant="caption" color="textMuted" align="center">
            Lebih cepat, tidak perlu membuat kata sandi baru.
          </AppText>
        </Surface>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.footer}>
        <AppText variant="secondary" color="textSecondary" align="center">
          Sudah punya akun Secaling?
        </AppText>
        <Button
          title="Masuk"
          variant="secondary"
          onPress={() => router.replace('/auth/login')}
          icon={<Ionicons name="log-in-outline" size={22} color={colors.primaryText} />}
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
  doneCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  doneIcon: {
    width: 92,
    height: 92,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  doneText: {
    maxWidth: 340,
  },
  doneBtn: {
    marginTop: Spacing.sm,
  },
});
