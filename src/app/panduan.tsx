import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useOnboarding } from '@/hooks/use-onboarding';

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  /** Contoh nyata, supaya penjelasannya tidak terasa abstrak. */
  contoh?: string;
};

/**
 * Tiga layar panduan awal.
 *
 * Isinya sengaja menjawab pertanyaan yang benar-benar dipikirkan warga saat
 * pertama membuka app keamanan desa:
 *
 *   1. "Ini aplikasi apa?" — bukan daftar fitur, tapi apa gunanya bagi saya.
 *   2. "Kalau saya lihat sesuatu, saya harus apa?"
 *   3. "Apa yang terjadi setelah saya lapor?" — ini yang paling sering bikin
 *      orang ragu memakai app pelaporan: takut laporannya hilang begitu saja.
 *
 * Tidak ada penjelasan soal cara kerja teknis, karena itu bukan pertanyaan
 * mereka.
 */
const SLIDES: Slide[] = [
  {
    icon: 'people',
    title: 'Saling jaga lewat HP',
    body: 'Secaling menghubungkan warga Desa Segoropuro. Kalau ada kejadian, semua warga bisa langsung tahu tanpa perlu keliling memberi kabar.',
  },
  {
    icon: 'megaphone',
    title: 'Lihat sesuatu? Lapor saja',
    body: 'Cukup tiga langkah: pilih jenis kejadiannya, ceritakan sedikit, lalu kirim. Foto tidak wajib, dan tidak perlu tulisan panjang.',
    contoh: 'Contoh: "Ada orang tidak dikenal keliling di Dusun Krajan sekitar jam 9 malam."',
  },
  {
    icon: 'checkmark-done',
    title: 'Laporan Anda ditindaklanjuti',
    body: 'Perangkat desa akan menandai laporan Anda sebagai Sedang Ditangani lalu Selesai, jadi Anda tahu perkembangannya. Warga lain juga bisa ikut membenarkan kalau mereka melihat hal yang sama.',
  },
];

export default function PanduanScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { tandaiSelesai } = useOnboarding();
  const [index, setIndex] = useState(0);
  const [menutup, setMenutup] = useState(false);

  const slide = SLIDES[index];
  const terakhir = index === SLIDES.length - 1;

  async function selesaikan() {
    // Cegah tekan ganda. Tanpa ini, ketukan cepat dua kali bisa memicu dua
    // perpindahan halaman sekaligus dan menumpuk riwayat navigasi.
    if (menutup) return;
    setMenutup(true);

    // Ditunggu sampai tersimpan, baru pindah halaman. `tandaiSelesai` menulis
    // ke penyimpanan HP lebih dulu, jadi setelah baris ini panduan tidak akan
    // muncul lagi meski app langsung ditutup.
    await tandaiSelesai();

    // Layar ini bisa dibuka dari dua arah:
    //   - otomatis saat pertama pakai (lewat `replace`, tidak ada riwayat)
    //   - dari tombol "Buka Panduan" di Profil (lewat `push`, ada riwayat)
    // Kalau ada riwayat, kembali ke tempat warga sebelumnya — bukan melempar
    // mereka ke Beranda dari halaman Profil.
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  return (
    <Screen scroll={false} noTabBar>
      <View style={styles.wrap}>
        {/* Tombol Lewati selalu tersedia. Warga yang sudah paham tidak boleh
            dipaksa membaca tiga layar. */}
        <View style={styles.topBar}>
          <Pressable
            onPress={selesaikan}
            disabled={menutup}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Lewati panduan"
            accessibilityState={{ disabled: menutup }}
            style={({ pressed }) => [
              styles.skip,
              { opacity: menutup ? 0.4 : pressed ? 0.6 : 1 },
            ]}>
            <AppText variant="label" color="textSecondary">
              Lewati
            </AppText>
          </Pressable>
        </View>

        <Animated.View entering={FadeIn.duration(320)} style={styles.brand}>
          <BrandLogo size={72} />
          <AppText variant="heading" color="text" heading>
            Secaling
          </AppText>
        </Animated.View>

        {/* Isi panduan. `key` diganti tiap langkah supaya animasinya terulang. */}
        <Animated.View key={index} entering={FadeInRight.duration(260)} style={styles.body}>
          <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={slide.icon} size={54} color={colors.primaryText} />
          </View>

          <AppText variant="title" color="text" align="center" heading>
            {slide.title}
          </AppText>

          <AppText variant="body" color="textSecondary" align="center" style={styles.bodyText}>
            {slide.body}
          </AppText>

          {slide.contoh ? (
            <Surface tone="info" radius={Radius.md} style={styles.contohBox}>
              <AppText variant="secondary" color="textSecondary" align="center">
                {slide.contoh}
              </AppText>
            </Surface>
          ) : null}
        </Animated.View>

        {/* Penunjuk langkah. Diberi tulisan, bukan cuma titik-titik — deretan
            titik tidak memberi tahu sudah sampai mana dan masih berapa lagi. */}
        <View style={styles.footer}>
          <View
            style={styles.dots}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: SLIDES.length, now: index + 1 }}
            accessibilityLabel={`Halaman ${index + 1} dari ${SLIDES.length}`}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === index ? colors.primary : colors.border,
                    width: i === index ? 28 : 10,
                  },
                ]}
              />
            ))}
          </View>

          <AppText variant="caption" color="textMuted" align="center">
            {`Halaman ${index + 1} dari ${SLIDES.length}`}
          </AppText>

          <Button
            title={terakhir ? 'Mulai Pakai Secaling' : 'Lanjut'}
            size="large"
            loading={menutup}
            onPress={() => {
              if (terakhir) selesaikan();
              else setIndex((i) => i + 1);
            }}
            iconRight={
              terakhir ? undefined : (
                <Ionicons name="arrow-forward" size={24} color={colors.onPrimary} />
              )
            }
          />

          {index > 0 ? (
            <Button
              title="Kembali"
              variant="ghost"
              disabled={menutup}
              onPress={() => setIndex((i) => i - 1)}
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  skip: {
    minHeight: Touch.min,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  body: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  iconBox: {
    width: 120,
    height: 120,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  bodyText: {
    maxWidth: 380,
  },
  contohBox: {
    padding: Spacing.md,
    maxWidth: 380,
  },
  footer: {
    gap: Spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.xs,
  },
  dot: {
    height: 10,
    borderRadius: Radius.pill,
  },
});
