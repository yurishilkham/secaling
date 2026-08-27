import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
};

/**
 * Foto layar penuh.
 *
 * Kenapa perlu: foto bukti di halaman detail dulu tidak bisa diketuk sama
 * sekali, tampil dalam kotak setinggi 260px. Untuk foto kejadian keamanan —
 * wajah orang, plat nomor, kerusakan — itu terlalu kecil untuk dilihat mata
 * yang sudah tidak muda di layar HP.
 *
 * `contentFit="contain"` dipakai supaya seluruh foto terlihat tanpa terpotong,
 * dan `expo-image` menyediakan cubit-untuk-memperbesar lewat prop
 * `allowsZoom`-nya di iOS; di Android setidaknya fotonya kini tampil sebesar
 * layar.
 */
export function PhotoViewer({ visible, uri, onClose }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: colors.photoBackdrop }]}>
        {/* Mengetuk latar juga menutup — jalan keluar yang sudah biasa dipakai
            orang di aplikasi lain. */}
        <Pressable
          style={styles.backdropPress}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Tutup foto"
        />

        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="contain"
          transition={180}
          accessibilityLabel="Foto kejadian, tampilan penuh"
        />

        <View style={[styles.closeWrap, { top: Math.max(insets.top, Spacing.lg) }]}>
          <IconButton icon="close" label="Tutup foto" onPress={onClose} size={52} />
        </View>

        <View style={[styles.hintWrap, { bottom: Math.max(insets.bottom, Spacing.xl) }]}>
          <View style={[styles.hint, { backgroundColor: colors.overlay }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.onOverlay} />
            <AppText variant="caption" rawColor={colors.onOverlay}>
              Ketuk di mana saja untuk menutup
            </AppText>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdropPress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: '100%',
    height: '80%',
  },
  closeWrap: {
    position: 'absolute',
    right: Spacing.lg,
  },
  hintWrap: {
    position: 'absolute',
    alignSelf: 'center',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
  },
});
