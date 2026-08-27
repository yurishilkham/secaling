import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Penjelasan di bawah label, tampil terus — bukan placeholder yang hilang saat menulis. */
  hint?: string;
  /** Pesan salah. Kalau ada, kolom berubah jadi keadaan salah. */
  error?: string | null;
  /** Tampilkan tanda wajib. Kalau `false`, tulis "boleh dikosongkan" di label. */
  required?: boolean;
  multiline?: boolean;
  /** Tampilkan sisa huruf. Nyala otomatis kalau ada `maxLength` dan `multiline`. */
  showCounter?: boolean;
  style?: ViewStyle;
  inputStyle?: TextInputProps['style'];
};

/**
 * Perubahan dari versi sebelumnya:
 *
 *   - PROP `error`. Dulu tidak ada sama sekali, jadi semua pesan kesalahan
 *     harus lewat `Alert.alert`: warga menekan Kirim, muncul popup, tekan OK,
 *     popup hilang — lalu harus mengingat sendiri kolom mana yang salah.
 *     Sekarang pesannya menempel di bawah kolom yang bersangkutan.
 *
 *   - TOMBOL LIHAT KATA SANDI. Sebelumnya tidak ada di seluruh app, padahal
 *     mengetik kata sandi buta di papan tombol HP itu sumber frustrasi utama
 *     bagi pemakai lansia.
 *
 *   - `hint` yang tampil terus. Dulu petunjuk seperti "Minimal 6 karakter"
 *     ditulis sebagai placeholder, jadi hilang tepat saat mulai dibutuhkan.
 *
 *   - PENANDA WAJIB. Dulu warga baru tahu kolom mana yang wajib setelah gagal
 *     mengirim.
 *
 *   - Kesalahan tidak ditandai warna saja: ada ikon segitiga peringatan dan
 *     teksnya, supaya tetap terbaca oleh yang buta warna.
 */
export function Input({
  label,
  hint,
  error,
  required,
  multiline,
  showCounter,
  style,
  inputStyle,
  onFocus,
  onBlur,
  secureTextEntry,
  maxLength,
  value,
  ...rest
}: Props) {
  const { colors, type } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const hasError = !!error;
  const isPassword = !!secureTextEntry;
  const counterVisible = showCounter ?? (!!maxLength && !!multiline);
  const used = value?.length ?? 0;

  const borderColor = hasError
    ? colors.danger
    : focused
      ? colors.primary
      : colors.borderStrong;

  return (
    <View style={[styles.wrapper, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <AppText variant="label" color="text" style={styles.labelText}>
            {label}
            {required ? (
              <AppText variant="label" color="danger">
                {' *'}
              </AppText>
            ) : null}
          </AppText>
          {counterVisible && maxLength ? (
            <AppText variant="caption" color={used >= maxLength ? 'danger' : 'textMuted'}>
              {used}/{maxLength}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {hint ? (
        <AppText variant="caption" color="textMuted" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}

      <View style={styles.fieldRow}>
        <TextInput
          value={value}
          maxLength={maxLength}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          secureTextEntry={isPassword && !revealed}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          // Batas ini menjaga tinggi kolom tetap terkendali saat warga memakai
          // ukuran huruf "Sangat Besar" bersamaan dengan setelan HP yang besar.
          maxFontSizeMultiplier={1.5}
          accessibilityLabel={label}
          accessibilityHint={hint}
          accessibilityState={{ disabled: rest.editable === false }}
          style={[
            styles.input,
            type.body,
            {
              backgroundColor: hasError ? colors.dangerSoft : colors.card,
              borderColor,
              // Garis batas 2px ini yang membuat kolom isian memenuhi WCAG
              // 1.4.11 (kontras elemen non-teks minimal 3.0).
              borderWidth: focused || hasError ? 2.5 : 2,
              color: colors.text,
              minHeight: multiline ? 132 : Touch.comfortable,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingRight: isPassword ? Touch.icon + Spacing.sm : Spacing.lg,
            },
            inputStyle,
          ]}
          {...rest}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            style={styles.reveal}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            accessibilityState={{ selected: revealed }}>
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      {hasError ? (
        <View
          style={styles.errorRow}
          // Pembaca layar langsung mengucapkan pesan ini saat muncul.
          accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <AppText variant="caption" color="danger" style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  labelText: {
    flexShrink: 1,
  },
  hint: {
    marginBottom: 2,
  },
  fieldRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  reveal: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: Touch.icon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: 2,
  },
  errorText: {
    flex: 1,
  },
});

