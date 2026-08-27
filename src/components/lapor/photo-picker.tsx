import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type * as ImagePicker from 'expo-image-picker';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { InlineBanner } from '@/components/ui/inline-banner';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  photo: ImagePicker.ImagePickerAsset | null;
  onPick: (source: 'camera' | 'library') => void;
  onClear: () => void;
  /** Pesan soal izin atau ukuran foto. */
  message?: string | null;
  onDismissMessage?: () => void;
  onOpenSettings?: () => void;
};

/**
 * Pemilih foto.
 *
 * Perubahan:
 *   - Pesan izin ditolak tidak lagi lewat `Alert.alert`, tapi tampil di dalam
 *     layar dengan tombol "Buka Pengaturan" di sebelahnya.
 *   - Ditegaskan bahwa foto itu tidak wajib. Sebelumnya cuma ditulis
 *     "Opsional", satu kata yang mudah terlewat — padahal warga bisa terhenti
 *     di sini karena merasa harus punya foto dulu untuk bisa melapor.
 *   - Tombol hapus foto 34px -> 48px.
 */
export function PhotoPicker({
  photo,
  onPick,
  onClear,
  message,
  onDismissMessage,
  onOpenSettings,
}: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrap}>
      {photo ? (
        <View style={styles.previewWrap}>
          <Image
            source={{ uri: photo.uri }}
            style={[styles.preview, { backgroundColor: colors.skeleton }]}
            contentFit="cover"
            transition={160}
            accessibilityLabel="Foto kejadian yang Anda pilih"
          />
          <View style={styles.removeWrap}>
            <IconButton
              icon="close"
              label="Hapus foto ini"
              tone="danger"
              onPress={onClear}
            />
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.empty,
            { backgroundColor: colors.background, borderColor: colors.borderStrong },
          ]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="camera-outline" size={34} color={colors.primaryText} />
          </View>
          <AppText variant="secondary" color="textSecondary" align="center" style={styles.emptyText}>
            Foto membantu warga lain memahami keadaannya. Tapi kalau tidak ada
            foto, laporan Anda tetap bisa dikirim.
          </AppText>
        </View>
      )}

      {message ? (
        <InlineBanner
          tone="warning"
          message={message}
          onDismiss={onDismissMessage}
        />
      ) : null}

      {message && onOpenSettings && Platform.OS !== 'web' ? (
        <Button
          title="Buka Pengaturan HP"
          variant="outline"
          onPress={onOpenSettings}
          icon={<Ionicons name="settings-outline" size={22} color={colors.primaryText} />}
        />
      ) : null}

      <View style={styles.actions}>
        <Button
          title={Platform.OS === 'web' ? 'Pilih Foto' : 'Foto Sekarang'}
          variant="outline"
          onPress={() => onPick('camera')}
          icon={<Ionicons name="camera" size={22} color={colors.primaryText} />}
          fullWidth={false}
          style={styles.actionBtn}
        />
        <Button
          title="Dari Galeri"
          variant="outline"
          onPress={() => onPick('library')}
          icon={<Ionicons name="images" size={22} color={colors.primaryText} />}
          fullWidth={false}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.md,
  },
  previewWrap: {
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 240,
    borderRadius: Radius.lg,
  },
  removeWrap: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  empty: {
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    maxWidth: 300,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
