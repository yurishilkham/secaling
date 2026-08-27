import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { FONT_SCALE_OPTIONS, type FontScaleKey } from '@/constants/typography';
import { type ThemePreference, useAppTheme } from '@/hooks/use-app-theme';

const THEME_OPTIONS: {
  key: ThemePreference;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'light', label: 'Terang', desc: 'Latar putih', icon: 'sunny' },
  { key: 'dark', label: 'Gelap', desc: 'Enak di malam hari', icon: 'moon' },
  { key: 'system', label: 'Ikut HP', desc: 'Sesuai setelan HP', icon: 'phone-portrait' },
];

const FONT_ICONS: Record<FontScaleKey, keyof typeof Ionicons.glyphMap> = {
  normal: 'text',
  besar: 'text',
  'sangat-besar': 'text',
};

function tap() {
  if (Platform.OS !== 'web') {
    try {
      Haptics.selectionAsync();
    } catch {}
  }
}

/**
 * Satu baris pilihan. Dipakai untuk tema maupun ukuran huruf.
 *
 * Bertumpuk, bukan tiga kolom sejajar. Versi lama menyusun tiga pilihan
 * berjajar dengan `flex: 1`, dan di layar 320dp tiap kolom hanya mendapat
 * (320 − 32 padding layar − 32 padding kartu − 16 celah) / 3 = 80px, dikurangi
 * padding dalam jadi 64px untuk teks. Kata "Sangat Besar" mustahil masuk di
 * situ, apalagi kalau warga memang sedang memakai ukuran huruf besar — yang
 * justru orang-orang yang paling butuh menu ini.
 */
function OptionRow({
  icon,
  label,
  desc,
  selected,
  onPress,
  accessibilityLabel,
  /** Ukuran contoh huruf di sebelah kanan, untuk pilihan ukuran huruf. */
  sampleSize,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  sampleSize?: number;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? colors.primarySoft : colors.background,
          borderColor: selected ? colors.primaryText : colors.border,
          borderWidth: selected ? 2.5 : 1.5,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View
        style={[
          styles.optionIcon,
          { backgroundColor: selected ? colors.primary : colors.card },
        ]}>
        <Ionicons
          name={icon}
          size={sampleSize ?? 22}
          color={selected ? colors.onPrimary : colors.primaryText}
        />
      </View>

      <View style={styles.optionText}>
        <AppText variant="bodyStrong" color="text">
          {label}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {desc}
        </AppText>
      </View>

      {/* Pilihan ditandai centang, bukan hanya warna latar — supaya tetap
          terbaca oleh yang buta warna. */}
      <View
        style={[
          styles.check,
          {
            backgroundColor: selected ? colors.primary : 'transparent',
            borderColor: selected ? colors.primary : colors.borderStrong,
          },
        ]}>
        {selected ? <Ionicons name="checkmark" size={22} color={colors.onPrimary} /> : null}
      </View>
    </Pressable>
  );
}

/**
 * Tampilan: warna dan ukuran huruf.
 *
 * UKURAN HURUF adalah tambahan baru, dan mungkin fitur paling berguna di
 * seluruh perombakan ini untuk warga lansia. Banyak orang tidak tahu setelan
 * ukuran huruf HP itu ada di mana, jadi kita sediakan langsung di dalam app,
 * dengan contoh yang langsung berubah begitu dipilih.
 *
 * Teks jargon yang dulu ada di sini sudah dihapus seluruhnya:
 * "Mode gelap pakai liquid glass juga — iOS jadi GlassView dark, Android jadi
 * blur gelap Telegram 12.10."
 */
export function AppearanceCard() {
  const { colors, preference, setPreference, fontScale, setFontScale } = useAppTheme();
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      {/* --- Warna tampilan --- */}
      <Surface tone="card" radius={Radius.lg} style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="color-palette-outline" size={24} color={colors.primaryText} />
          </View>
          <View style={styles.headerText}>
            <AppText variant="heading" color="text" heading>
              Warna Tampilan
            </AppText>
            <AppText variant="caption" color="textMuted">
              Pilih yang paling nyaman untuk mata Anda
            </AppText>
          </View>
        </View>

        <View style={styles.options} accessibilityRole="radiogroup">
          {THEME_OPTIONS.map((o) => (
            <OptionRow
              key={o.key}
              icon={o.icon}
              label={o.label}
              desc={o.desc}
              selected={preference === o.key}
              onPress={() => setPreference(o.key)}
              accessibilityLabel={`Tampilan ${o.label}, ${o.desc}`}
            />
          ))}
        </View>
      </Surface>

      {/* --- Ukuran huruf --- */}
      <Surface tone="card" radius={Radius.lg} style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="text-outline" size={24} color={colors.primaryText} />
          </View>
          <View style={styles.headerText}>
            <AppText variant="heading" color="text" heading>
              Ukuran Huruf
            </AppText>
            <AppText variant="caption" color="textMuted">
              Kalau tulisan terasa kecil, perbesar di sini
            </AppText>
          </View>
        </View>

        <View style={styles.options} accessibilityRole="radiogroup">
          {FONT_SCALE_OPTIONS.map((o, i) => (
            <OptionRow
              key={o.key}
              icon={FONT_ICONS[o.key]}
              label={o.label}
              desc={o.desc}
              selected={fontScale === o.key}
              onPress={() => setFontScale(o.key)}
              accessibilityLabel={`Ukuran huruf ${o.label}, ${o.desc}`}
              // Ikonnya ikut membesar mengikuti pilihan, jadi bedanya terlihat
              // sebelum ditekan.
              sampleSize={18 + i * 5}
            />
          ))}
        </View>

        {/* Contoh nyata. Teks ini memakai varian `body` yang sama dengan seluruh
            app, jadi begitu pilihan diubah, warga langsung melihat hasilnya
            tanpa perlu keluar dari layar ini. */}
        <View style={[styles.sample, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <AppText variant="caption" color="textMuted">
            Contoh tulisan
          </AppText>
          <AppText variant="body" color="text">
            Ada orang tidak dikenal berkeliling di Dusun Krajan sekitar jam 9
            malam. Warga diminta berhati-hati.
          </AppText>
        </View>
      </Surface>

      {/* --- Panduan --- */}
      <Surface tone="card" radius={Radius.lg} style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="help-circle-outline" size={24} color={colors.primaryText} />
          </View>
          <View style={styles.headerText}>
            <AppText variant="heading" color="text" heading>
              Panduan Pemakaian
            </AppText>
            <AppText variant="caption" color="textMuted">
              Lihat lagi cara memakai Secaling
            </AppText>
          </View>
        </View>

        <Button
          title="Buka Panduan"
          variant="outline"
          onPress={() => router.push('/panduan')}
          icon={<Ionicons name="book-outline" size={22} color={colors.primaryText} />}
        />
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.lg,
  },
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Touch.large,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sample: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
});
