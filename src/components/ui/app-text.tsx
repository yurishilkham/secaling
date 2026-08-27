import { Text, type TextProps, type TextStyle } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import type { TextVariant } from '@/constants/typography';

type ColorToken =
  | 'text'
  | 'textSecondary'
  | 'textMuted'
  | 'primary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'onPrimary'
  | 'onColor';

type Props = Omit<TextProps, 'style'> & {
  variant?: TextVariant;
  /** Nama warna dari palet. Pakai ini, bukan hex mentah. */
  color?: ColorToken;
  /** Hex mentah — hanya untuk warna kategori yang datang dari data. */
  rawColor?: string;
  align?: TextStyle['textAlign'];
  style?: TextProps['style'];
  /** Tandai sebagai judul agar pembaca layar bisa melompat antar bagian. */
  heading?: boolean;
};

/**
 * Satu-satunya cara menampilkan teks di app ini.
 *
 * Kenapa tidak `<Text>` biasa dengan `StyleSheet.create`:
 * ukuran huruf sekarang bisa diubah warga lewat setelan di dalam app, jadi
 * nilainya datang dari hook dan tidak bisa ditulis di StyleSheet statis.
 * Komponen ini juga otomatis memasang:
 *   - `fontFamily` per berat (bukan `fontWeight`, yang tidak jalan untuk font
 *     kustom di Android)
 *   - `maxFontSizeMultiplier` supaya skala HP tidak bertumpuk dengan skala
 *     in-app sampai merusak tata letak
 *   - `accessibilityRole="header"` untuk judul
 */
export function AppText({
  variant = 'body',
  color = 'text',
  rawColor,
  align,
  style,
  heading,
  ...rest
}: Props) {
  const { colors, type } = useAppTheme();

  // `maxFontSizeMultiplier` adalah prop <Text>, bukan properti style —
  // jadi harus dipisahkan dari objek gaya.
  const { maxFontSizeMultiplier, ...textStyle } = type[variant];

  const resolvedColor =
    rawColor ??
    (color === 'onColor'
      ? colors.textOnColor
      : color === 'primary'
        ? colors.primaryText
        : colors[color]);

  return (
    <Text
      style={[textStyle, { color: resolvedColor }, align ? { textAlign: align } : null, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityRole={heading ? 'header' : rest.accessibilityRole}
      {...rest}
    />
  );
}
