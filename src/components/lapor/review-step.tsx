import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type * as ImagePicker from 'expo-image-picker';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCategory } from '@/hooks/use-category';
import type { ReportDraft } from '@/hooks/use-report-form';

type Props = {
  draft: ReportDraft;
  photo: ImagePicker.ImagePickerAsset | null;
  /** Kembali ke langkah tertentu untuk memperbaiki isinya. */
  onEdit: (step: 1 | 2) => void;
};

function EditButton({ onPress, label }: { onPress: () => void; label: string }) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.editBtn,
        { borderColor: colors.borderStrong, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Ionicons name="pencil" size={18} color={colors.primaryText} />
      <AppText variant="caption" color="primary">
        Ubah
      </AppText>
    </Pressable>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
  editLabel,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="caption" color="textMuted">
          {label}
        </AppText>
        <AppText variant="body" color="text">
          {value}
        </AppText>
      </View>
      <EditButton onPress={onEdit} label={editLabel} />
    </View>
  );
}

/**
 * Langkah 3: periksa sebelum kirim.
 *
 * Kenapa langkah ini ada: sekali laporan terkirim, seluruh warga desa
 * melihatnya, dan warga biasa tidak bisa menghapusnya sendiri. Memberi
 * kesempatan membaca ulang mengurangi laporan yang salah kirim atau setengah
 * selesai — jauh lebih murah daripada memperbaikinya setelah tersebar.
 *
 * Tiap bagian bisa langsung diubah dari sini, jadi warga tidak perlu menekan
 * "Kembali" berkali-kali untuk memperbaiki satu kata.
 */
export function ReviewStep({ draft, photo, onEdit }: Props) {
  const { colors } = useAppTheme();
  const resolveCategory = useCategory();
  const cat = draft.category ? resolveCategory(draft.category) : null;

  return (
    <View style={styles.wrap}>
      <Surface tone="card" radius={Radius.lg} style={styles.card}>
        {cat ? (
          <>
            <View style={styles.catRow}>
              <View
                style={[styles.catIcon, { backgroundColor: cat.soft, borderColor: cat.color }]}>
                <Ionicons name={cat.icon} size={28} color={cat.color} />
              </View>
              <View style={styles.rowText}>
                <AppText variant="caption" color="textMuted">
                  Jenis kejadian
                </AppText>
                <AppText variant="bodyStrong" rawColor={cat.color}>
                  {cat.label}
                </AppText>
              </View>
              <EditButton onPress={() => onEdit(1)} label="Ubah jenis kejadian" />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          </>
        ) : null}

        <ReviewRow
          label="Judul"
          value={draft.title}
          onEdit={() => onEdit(2)}
          editLabel="Ubah judul kejadian"
        />

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <ReviewRow
          label="Cerita kejadian"
          value={draft.description}
          onEdit={() => onEdit(2)}
          editLabel="Ubah cerita kejadian"
        />

        {draft.locationName ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <ReviewRow
              label="Lokasi"
              value={draft.locationName}
              onEdit={() => onEdit(2)}
              editLabel="Ubah lokasi"
            />
          </>
        ) : null}
      </Surface>

      {photo ? (
        <View style={styles.photoWrap}>
          <AppText variant="label" color="textSecondary">
            Foto yang akan dikirim
          </AppText>
          <Image
            source={{ uri: photo.uri }}
            style={[styles.photo, { backgroundColor: colors.skeleton }]}
            contentFit="cover"
            transition={160}
            accessibilityLabel="Foto kejadian yang akan dikirim"
          />
        </View>
      ) : null}

      <Surface tone="info" radius={Radius.md} style={styles.notice}>
        <Ionicons name="information-circle" size={24} color={colors.info} />
        <AppText variant="secondary" color="textSecondary" style={styles.noticeText}>
          Setelah dikirim, laporan ini langsung terlihat oleh seluruh warga Desa
          Segoropuro dan tidak bisa Anda hapus sendiri.
        </AppText>
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
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  catIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: Touch.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  divider: {
    height: 1.5,
  },
  photoWrap: {
    gap: Spacing.sm,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: Radius.lg,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  noticeText: {
    flex: 1,
  },
});
