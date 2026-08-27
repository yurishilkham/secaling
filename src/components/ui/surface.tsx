import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type SurfaceTone = 'card' | 'raised' | 'sunken' | 'primary' | 'danger' | 'warning' | 'info';

type Props = ViewProps & {
  children?: ReactNode;
  tone?: SurfaceTone;
  radius?: number;
  /** Beri garis batas. Nyala secara bawaan agar kartu tetap terlihat di HP murah. */
  bordered?: boolean;
  /** Tebalkan garis batas — untuk kartu terpilih. */
  emphasis?: boolean;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Kartu — permukaan dasar seluruh app.
 *
 * Menggantikan `GlassCard`. Alasan pergantiannya:
 *
 * 1. KONTRAS TIDAK BISA DIJAMIN. Teks di atas latar tembus pandang
 *    kontrasnya bergantung pada apa pun yang lewat di belakangnya, jadi tidak
 *    mungkin dipastikan lolos WCAG. Untuk app keamanan yang dipakai warga
 *    lansia, itu tidak bisa diterima.
 *
 * 2. BERAT DI HP MURAH. Beranda memasang sekitar 33 `BlurView` sekaligus
 *    (3 kartu statistik + 20 laporan + 10 pengumuman). Di Android entry-level
 *    itu bikin scroll tersendat dan baterai terkuras.
 *
 * 3. DI ANDROID BLUR-NYA TIDAK PERNAH JALAN. Sejak expo-blur SDK 55,
 *    `blurMethod="dimezisBlurView"` mensyaratkan prop `blurTarget` yang menunjuk
 *    ke `BlurTargetView`. Tanpa itu blur otomatis jatuh ke "none" dan mencetak
 *    peringatan. Jadi biaya render tetap dibayar, hasil blur-nya tidak ada.
 */
export function Surface({
  children,
  tone = 'card',
  radius = Radius.lg,
  bordered = true,
  emphasis = false,
  elevation = 'sm',
  padded = false,
  style,
  ...rest
}: Props) {
  const { colors } = useAppTheme();

  const backgrounds: Record<SurfaceTone, string> = {
    card: colors.card,
    raised: colors.cardRaised,
    sunken: colors.background,
    primary: colors.primarySoft,
    danger: colors.dangerSoft,
    warning: colors.warningSoft,
    info: colors.infoSoft,
  };

  const borders: Record<SurfaceTone, string> = {
    card: colors.border,
    raised: colors.border,
    sunken: colors.border,
    primary: colors.primaryText,
    danger: colors.danger,
    warning: colors.warning,
    info: colors.info,
  };

  const shadow = elevation === 'none' ? null : Shadows[elevation];

  return (
    <View
      style={[
        {
          backgroundColor: backgrounds[tone],
          borderRadius: radius,
          // Ketebalan tetap, bukan kelipatan `hairlineWidth`: hairline bernilai
          // beda-beda per kerapatan layar (0.5 di 2x, 0.33 di 3x), sehingga
          // batas kartu jadi tebal-tipis tidak konsisten antar HP.
          borderWidth: bordered ? (emphasis ? 2 : 1.5) : 0,
          borderColor: borders[tone],
          overflow: 'hidden',
        },
        shadow as ViewStyle,
        padded ? styles.padded : null,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  padded: {
    padding: Spacing.lg,
  },
});
