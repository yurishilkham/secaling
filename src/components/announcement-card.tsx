import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { timeAgo } from '@/lib/format';
import { buildAnnouncementMessage, shareToWhatsApp } from '@/lib/share';

export type Announcement = {
  id: string;
  title: string;
  body: string;
  is_important: boolean;
  author_id: string;
  created_at: string;
  profiles?: { full_name: string } | null;
};

export function AnnouncementCard({
  announcement,
  onDelete,
  onEdit,
  deleting,
}: {
  announcement: Announcement;
  onDelete?: () => void;
  onEdit?: () => void;
  deleting?: boolean;
}) {
  const { colors } = useAppTheme();
  const important = announcement.is_important;

  const accent = important ? colors.danger : colors.primaryText;
  const accentSoft = important ? colors.dangerSoft : colors.primarySoft;

  function share() {
    shareToWhatsApp(
      buildAnnouncementMessage({
        title: announcement.title,
        body: announcement.body,
        isImportant: important,
        createdAt: announcement.created_at,
        authorName: announcement.profiles?.full_name ?? null,
      }),
    );
  }

  return (
    <Surface
      tone="card"
      radius={Radius.lg}
      // Pengumuman penting ditandai TIGA cara sekaligus: garis tebal di kiri,
      // ikon berbeda, dan tulisan "PENTING". Tidak boleh hanya warna, karena
      // pembaca yang buta warna harus tetap bisa membedakannya.
      emphasis={important}
      style={[
        styles.card,
        important
          ? { borderLeftWidth: 6, borderLeftColor: colors.danger, paddingLeft: Spacing.lg - 4 }
          : null,
      ]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: accentSoft, borderColor: accent }]}>
          <Ionicons
            name={important ? 'alert-circle' : 'megaphone-outline'}
            size={26}
            color={accent}
          />
        </View>

        <View style={styles.headerText}>
          <AppText variant="badge" rawColor={accent} numberOfLines={1}>
            {important ? 'PENTING' : 'PENGUMUMAN'}
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={2}>
            {timeAgo(announcement.created_at)}
            {announcement.profiles?.full_name ? ` · ${announcement.profiles.full_name}` : ''}
          </AppText>
        </View>

        {onEdit ? (
          <IconButton
            icon="create-outline"
            label={`Ubah pengumuman ${announcement.title}`}
            tone="primary"
            onPress={onEdit}
          />
        ) : null}
        {onDelete ? (
          deleting ? (
            <View style={styles.deleteSlot}>
              <ActivityIndicator size="small" color={colors.danger} />
            </View>
          ) : (
            <IconButton
              icon="trash-outline"
              label={`Hapus pengumuman ${announcement.title}`}
              tone="danger"
              onPress={onDelete}
            />
          )
        ) : null}
      </View>

      <AppText variant="bodyStrong" color="text">
        {announcement.title}
      </AppText>

      {/* Pengumuman desa itu informasi resmi — warga perlu membaca isinya, jadi
          dibiarkan sampai 6 baris, bukan 4 seperti sebelumnya. */}
      <AppText variant="body" color="textSecondary" numberOfLines={6}>
        {announcement.body}
      </AppText>

      <Pressable
        onPress={share}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Bagikan pengumuman ini ke WhatsApp"
        style={({ pressed }) => [
          styles.shareBtn,
          {
            backgroundColor: colors.primarySoft,
            borderColor: colors.primaryText,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        <Ionicons name="logo-whatsapp" size={20} color={colors.primaryText} />
        <AppText variant="caption" color="primary">
          Bagikan
        </AppText>
      </Pressable>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  deleteSlot: {
    width: Touch.icon,
    height: Touch.icon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: Touch.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
});
