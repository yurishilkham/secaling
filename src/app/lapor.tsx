import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

import { CategoryPicker } from '@/components/lapor/category-picker';
import { PhotoPicker } from '@/components/lapor/photo-picker';
import { ReviewStep } from '@/components/lapor/review-step';
import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { InlineBanner } from '@/components/ui/inline-banner';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReportForm } from '@/hooks/use-report-form';
import { useAuth } from '@/lib/auth';

type Step = 1 | 2 | 3;

const STEP_LABELS = ['Apa kejadiannya', 'Ceritakan', 'Periksa & kirim'];

export default function LaporScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { session } = useAuth();
  const form = useReportForm();

  const [step, setStep] = useState<Step>(1);
  const [sent, setSent] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);

  const hasContent = form.hasContent;

  /**
   * Mundur satu langkah, atau tutup halaman kalau sudah di langkah pertama.
   *
   * Dibuat `useCallback` dan diletakkan SEBELUM cabang keluar awal, karena
   * dipakai oleh `useEffect` di bawah — dan hook tidak boleh dipanggil setelah
   * `return` bersyarat.
   */
  const goBack = useCallback(() => {
    if (step === 1) {
      // Di langkah pertama, "Kembali" berarti menutup halaman. Kalau sudah ada
      // isian, tanyakan dulu — jangan sampai tulisan warga hilang tanpa peringatan.
      if (hasContent) setAskDiscard(true);
      else if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }
    setStep((s) => (s === 3 ? 2 : 1) as Step);
  }, [step, hasContent, router]);

  /**
   * Tombol kembali HP diperlakukan sama seperti tombol "Kembali" di layar.
   *
   * Tanpa ini, warga yang sedang di langkah 3 lalu menekan tombol kembali HP
   * akan keluar dari seluruh formulir sekaligus — kehilangan tiga langkah
   * pengisian. Sekarang ia mundur satu langkah dulu.
   */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // Di layar "sudah terkirim" tidak ada yang perlu dijaga, biarkan
      // navigasi menanganinya seperti biasa.
      if (sent) return false;
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack, sent]);

  // --- Belum masuk ---
  if (!session) {
    return (
      <Screen scroll={false} center noTabBar>
        <Surface tone="card" radius={Radius.xl} style={styles.guard}>
          <View style={[styles.guardIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="person-add-outline" size={40} color={colors.primaryText} />
          </View>
          <AppText variant="heading" color="text" align="center" heading>
            Masuk dulu untuk melapor
          </AppText>
          <AppText variant="body" color="textSecondary" align="center" style={styles.guardText}>
            Laporan perlu mencantumkan nama pelapor supaya warga lain tahu
            informasinya bisa dipercaya. Masuk atau daftar dulu, gratis.
          </AppText>
          <Button
            title="Masuk"
            size="large"
            onPress={() => router.push('/auth/login')}
            style={styles.guardBtn}
          />
          <Button
            title="Belum Punya Akun"
            variant="outline"
            onPress={() => router.push('/auth/register')}
          />
        </Surface>
      </Screen>
    );
  }

  // --- Sudah terkirim ---
  if (sent) {
    return (
      <Screen scroll={false} center noTabBar>
        <Animated.View entering={FadeIn.duration(300)} style={styles.doneWrap}>
          <Surface tone="card" radius={Radius.xl} style={styles.guard}>
            <View style={[styles.guardIcon, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <AppText variant="heading" color="text" align="center" heading>
              Laporan sudah terkirim
            </AppText>
            <AppText variant="body" color="textSecondary" align="center" style={styles.guardText}>
              Terima kasih. Laporan Anda sekarang bisa dibaca seluruh warga Desa
              Segoropuro.
            </AppText>
            <Button
              title="Selesai"
              size="large"
              onPress={() => {
                setSent(false);
                setStep(1);
                // Halaman ini dibuka lewat `push`, jadi cukup ditutup — warga
                // kembali ke tempat asalnya (Beranda atau layar lain).
                if (router.canGoBack()) router.back();
                else router.replace('/');
              }}
              style={styles.guardBtn}
            />
            <Button
              title="Lapor Lagi"
              variant="outline"
              onPress={() => {
                setSent(false);
                setStep(1);
              }}
            />
          </Surface>
        </Animated.View>
      </Screen>
    );
  }

  // Diambil ke variabel sendiri karena TypeScript tidak bisa memastikan
  // `session` masih terisi di dalam fungsi async di bawah, meski sudah
  // dicek di awal.
  const userId = session.user.id;

  function goNext() {
    if (step === 1) {
      if (!form.validateStep(1)) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!form.validateStep(2)) return;
      setStep(3);
    }
  }



  async function handleSubmit() {
    const ok = await form.submit(userId);
    if (ok) setSent(true);
  }

  return (
    <Screen noTabBar>
      {/* Halaman ini di luar kelompok tab, jadi tidak ada bilah bawah — layar
          penuh untuk menulis. Sebagai gantinya, jalan keluarnya ada di atas.
          Tombol ini memakai `goBack` yang sama dengan tombol kembali HP, jadi
          keduanya berperilaku sama: mundur satu langkah, bukan keluar. */}
      <BackButton label={step === 1 ? 'Tutup' : 'Langkah Sebelumnya'} onPress={goBack} />

      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <AppText variant="title" color="text" heading>
          Lapor Kejadian
        </AppText>
        <StepIndicator current={step} total={3} labels={STEP_LABELS} />
      </Animated.View>

      {form.failure ? (
        <InlineBanner
          tone="error"
          message={form.failure.message}
          onDismiss={form.clearFailure}
        />
      ) : null}

      {/* LANGKAH 1 — jenis kejadian */}
      {step === 1 ? (
        <Animated.View entering={FadeInRight.duration(260)} style={styles.stepWrap}>
          <View style={styles.prompt}>
            <AppText variant="heading" color="text" heading>
              Apa yang terjadi?
            </AppText>
            <AppText variant="body" color="textSecondary">
              Pilih satu yang paling mendekati. Kalau bingung, pilih
              &ldquo;Lainnya&rdquo;.
            </AppText>
          </View>

          {form.errors.category ? (
            <InlineBanner tone="error" message={form.errors.category} />
          ) : null}

          <CategoryPicker
            value={form.draft.category}
            onChange={(key) => form.update('category', key)}
          />
        </Animated.View>
      ) : null}

      {/* LANGKAH 2 — cerita dan foto */}
      {step === 2 ? (
        <Animated.View entering={FadeInRight.duration(260)} style={styles.stepWrap}>
          <View style={styles.prompt}>
            <AppText variant="heading" color="text" heading>
              Ceritakan kejadiannya
            </AppText>
            <AppText variant="body" color="textSecondary">
              Tidak perlu panjang. Yang penting warga lain paham apa yang perlu
              diwaspadai.
            </AppText>
          </View>

          <Surface tone="card" radius={Radius.lg} style={styles.formCard}>
            <Input
              label="Judul singkat"
              required
              hint="Contoh: Motor hilang di depan masjid"
              placeholder="Tulis judul di sini"
              value={form.draft.title}
              onChangeText={(v) => form.update('title', v)}
              error={form.errors.title}
              maxLength={90}
              showCounter
            />

            <Input
              label="Apa yang Anda lihat?"
              required
              hint="Jam berapa, di mana, ciri-ciri orang atau barangnya"
              placeholder="Ceritakan di sini"
              value={form.draft.description}
              onChangeText={(v) => form.update('description', v)}
              error={form.errors.description}
              multiline
              maxLength={600}
              showCounter
            />

            <Input
              label="Lokasi (boleh dikosongkan)"
              hint="Contoh: Dusun Krajan RT 02"
              placeholder="Nama dusun atau patokan tempat"
              value={form.draft.locationName}
              onChangeText={(v) => form.update('locationName', v)}
              maxLength={120}
            />
          </Surface>

          <View style={styles.prompt}>
            <AppText variant="heading" color="text" heading>
              Ada fotonya?
            </AppText>
          </View>

          <PhotoPicker
            photo={form.photo}
            onPick={form.pickPhoto}
            onClear={form.clearPhoto}
            message={form.permissionMessage}
            onDismissMessage={form.clearPermissionMessage}
            onOpenSettings={form.openSettings}
          />
        </Animated.View>
      ) : null}

      {/* LANGKAH 3 — periksa */}
      {step === 3 ? (
        <Animated.View entering={FadeInRight.duration(260)} style={styles.stepWrap}>
          <View style={styles.prompt}>
            <AppText variant="heading" color="text" heading>
              Sudah benar semua?
            </AppText>
            <AppText variant="body" color="textSecondary">
              Baca sekali lagi. Kalau ada yang perlu diperbaiki, ketuk
              &ldquo;Ubah&rdquo;.
            </AppText>
          </View>

          <ReviewStep
            draft={form.draft}
            photo={form.photo}
            onEdit={(s) => setStep(s)}
          />
        </Animated.View>
      ) : null}

      {/* Tombol maju/mundur */}
      <Animated.View entering={FadeInDown.duration(260)} style={styles.nav}>
        {step === 3 ? (
          <Button
            title={form.uploading ? 'Mengirim foto…' : 'Kirim Laporan'}
            size="large"
            onPress={handleSubmit}
            loading={form.submitting}
            icon={<Ionicons name="paper-plane" size={24} color={colors.onPrimary} />}
          />
        ) : (
          <Button
            title="Lanjut"
            size="large"
            onPress={goNext}
            disabled={step === 1 ? !form.step1Valid : false}
            iconRight={<Ionicons name="arrow-forward" size={24} color={colors.onPrimary} />}
          />
        )}

        <Button
          title={step === 1 ? 'Batal' : 'Kembali'}
          variant="ghost"
          onPress={goBack}
          disabled={form.submitting}
        />
      </Animated.View>

      <ConfirmSheet
        visible={askDiscard}
        title="Batalkan laporan ini?"
        message="Yang sudah Anda tulis akan dihapus dan tidak bisa dikembalikan."
        confirmLabel="Ya, Batalkan"
        cancelLabel="Lanjut Menulis"
        destructive
        onConfirm={() => {
          form.reset();
          setAskDiscard(false);
          setStep(1);
          // Halaman ini dibuka lewat `push`, tapi bisa juga diakses langsung
          // dari tautan pemberitahuan — jadi diperiksa dulu ada riwayat atau tidak.
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}
        onCancel={() => setAskDiscard(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  stepWrap: {
    gap: Spacing.lg,
  },
  prompt: {
    gap: Spacing.xs,
  },
  formCard: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  nav: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  guard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    width: '100%',
  },
  guardIcon: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  guardText: {
    maxWidth: 320,
  },
  guardBtn: {
    marginTop: Spacing.sm,
  },
  doneWrap: {
    width: '100%',
  },
});
