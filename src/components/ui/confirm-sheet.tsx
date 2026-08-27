import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  visible: boolean;
  title: string;
  /** Jelaskan akibatnya dengan kalimat lengkap, bukan cuma "Lanjutkan?". */
  message: string;
  /** Tulisan tombol yang mengerjakan aksinya. Sebut kata kerjanya: "Hapus Laporan". */
  confirmLabel: string;
  cancelLabel?: string;
  /** `true` untuk aksi yang tidak bisa dibatalkan (menghapus). */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Lembar konfirmasi, pengganti `Alert.alert` untuk aksi berbahaya.
 *
 * Kenapa tidak pakai `Alert.alert` saja:
 *
 *   1. Tombolnya kecil dan seragam. Di Alert Android, "Batal" dan "Hapus"
 *      tampak sama persis dan letaknya berdempetan — mudah salah tekan, dan
 *      menghapus laporan tidak bisa dibatalkan.
 *   2. Ukuran teksnya tidak ikut setelan huruf besar pilihan warga, karena
 *      Alert digambar oleh sistem.
 *   3. Alert lama harus ditulis dua kali: satu `Alert.alert` untuk HP dan satu
 *      `window.confirm` untuk web. Di app ini pola itu terduplikasi di 4
 *      tempat, masing-masing sedikit berbeda perilakunya.
 *
 * Di sini "Batal" diletakkan lebih dulu (di atas) dan digambar sebagai tombol
 * penuh, sehingga jalan keluar yang aman justru yang paling mudah dijangkau.
 */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Batal',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Tombol kembali Android harus membatalkan, bukan meneruskan.
      onRequestClose={onCancel}
      statusBarTranslucent>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={loading ? undefined : onCancel}
        accessibilityRole="button"
        accessibilityLabel="Tutup"
      />

      <View style={styles.container} pointerEvents="box-none">
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm,
            },
          ]}
          accessibilityViewIsModal
          accessibilityLiveRegion="polite">
          <View
            style={[
              styles.iconBox,
              { backgroundColor: destructive ? colors.dangerSoft : colors.primarySoft },
            ]}>
            <Ionicons
              name={destructive ? 'trash-outline' : 'help-circle-outline'}
              size={32}
              color={destructive ? colors.danger : colors.primaryText}
            />
          </View>

          <AppText variant="heading" color="text" align="center" heading>
            {title}
          </AppText>

          <AppText variant="body" color="textSecondary" align="center" style={styles.message}>
            {message}
          </AppText>

          <View style={styles.actions}>
            <Button
              title={cancelLabel}
              onPress={onCancel}
              variant="outline"
              disabled={loading}
            />
            <Button
              title={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'danger' : 'primary'}
              loading={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    maxWidth: 340,
    marginBottom: Spacing.sm,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});

