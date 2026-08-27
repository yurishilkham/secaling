import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  count: number;
  /** Warga yang sedang masuk sudah membenarkan laporan ini. */
  confirmed: boolean;
  onPress: () => void;
  loading?: boolean;
  /** Belum masuk — tombol ditampilkan tapi tidak aktif. */
  disabled?: boolean;
};

/**
 * Tombol "Saya Juga Lihat".
 *
 * Tulisannya berubah mengikuti keadaan, bukan tetap:
 *   belum ada     -> "Saya Juga Lihat"
 *   sudah ada     -> "3 warga juga lihat"
 *   sudah ikut    -> "Anda + 2 warga lain"
 *
 * Kalimat terakhir itu yang paling penting: warga perlu tahu suaranya masuk
 * hitungan, bukan sekadar melihat angka naik.
 */
export function ConfirmButton({ count, confirmed, onPress, loading, disabled }: Props) {
  const { colors } = useAppTheme();

  const label = (() => {
    if (confirmed) {
      const others = Math.max(0, count - 1);
      if (others === 0) return 'Anda melihat ini';
      return `Anda + ${others} warga lain`;
    }
    if (count === 0) return 'Saya Juga Lihat';
    return `${count} warga juga lihat`;
  })();

  const hint = confirmed
    ? 'Ketuk untuk menarik kembali'
    : 'Ketuk kalau Anda juga melihat kejadian ini';

  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        if (Platform.OS !== 'web') {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
        }
        onPress();
      }}
      disabled={disabled || loading}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: confirmed, disabled: !!disabled, busy: !!loading }}
      accessibilityLabel={label}
      accessibilityHint={disabled ? 'Masuk dulu untuk memakai tombol ini' : hint}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: confirmed ? colors.primarySoft : colors.card,
          borderColor: confirmed ? colors.primaryText : colors.borderStrong,
          borderWidth: confirmed ? 2 : 1.5,
          opacity: disabled ? 0.55 : pressed ? 0.75 : 1,
        },
      ]}>
      {loading ? (
        <View style={styles.spinner}>
          <ActivityIndicator size="small" color={colors.primaryText} />
        </View>
      ) : (
        <Ionicons
          // Ikon berbeda bentuk, bukan cuma berbeda warna.
          name={confirmed ? 'eye' : 'eye-outline'}
          size={22}
          color={confirmed ? colors.primaryText : colors.textSecondary}
        />
      )}

      <AppText
        variant="caption"
        color={confirmed ? 'primary' : 'textSecondary'}
        numberOfLines={1}
        style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    minHeight: Touch.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    flexShrink: 1,
  },
  spinner: {
    width: 22,
    alignItems: 'center',
  },
  label: {
    flexShrink: 1,
  },
});
