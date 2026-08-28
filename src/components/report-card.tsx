import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Surface } from '@/components/ui/surface';
import { type CategoryKey } from '@/constants/categories';
import { type ReportStatus } from '@/constants/report-status';
import { Radius, Spacing, Springs, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCategory } from '@/hooks/use-category';
import { timeAgo } from '@/lib/format';
import { urlGambar } from '@/lib/image-url';
import { buildReportMessage, shareToWhatsApp } from '@/lib/share';

export type { ReportStatus };

export type Report = {
  id: string;
  category: CategoryKey;
  title: string;
  description: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  reporter_id: string;
  created_at: string;
  status: ReportStatus;
  status_changed_at: string | null;
  status_changed_by: string | null;
  profiles?: { full_name: string } | null;
};

type Props = {
  report: Report;
  onDelete?: () => void;
  deleting?: boolean;

  /** Jumlah warga yang membenarkan. Kalau tidak diisi, tombolnya disembunyikan. */
  confirmCount?: number;
  confirmedByMe?: boolean;
  onConfirm?: () => void;
  confirmLoading?: boolean;
  /** Belum masuk — tombol pembenaran tampil tapi tidak aktif. */
  confirmDisabled?: boolean;
};

export function ReportCard({
  report,
  onDelete,
  deleting,
  confirmCount,
  confirmedByMe,
  onConfirm,
  confirmLoading,
  confirmDisabled,
}: Props) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const resolveCategory = useCategory();
  const cat = resolveCategory(report.category);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function openDetail() {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    router.push(`/laporan/${report.id}`);
  }

  function share() {
    shareToWhatsApp(
      buildReportMessage({
        category: report.category,
        title: report.title,
        description: report.description,
        locationName: report.location_name,
        createdAt: report.created_at,
        reporterName: report.profiles?.full_name ?? null,
      }),
    );
  }

  const showConfirm = confirmCount !== undefined && !!onConfirm;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={openDetail}
        onPressIn={() => {
          scale.value = withSpring(0.98, Springs.snappy);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, Springs.gentle);
        }}
        accessibilityRole="button"
        // Diucapkan sebagai satu kalimat bermakna, bukan potongan terpisah.
        accessibilityLabel={`${cat.label}. ${report.title}. ${timeAgo(report.created_at)}`}
        accessibilityHint="Ketuk untuk membaca laporan lengkap">
        <Surface tone="card" radius={Radius.lg} style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: cat.soft, borderColor: cat.color }]}>
              <Ionicons name={cat.icon} size={26} color={cat.color} />
            </View>

            <View style={styles.headerText}>
              <AppText variant="badge" rawColor={cat.color} numberOfLines={1}>
                {cat.label}
              </AppText>
              <AppText variant="caption" color="textMuted" numberOfLines={1}>
                {timeAgo(report.created_at)}
              </AppText>
            </View>

            {onDelete ? (
              deleting ? (
                <View style={styles.deleteSlot}>
                  <ActivityIndicator size="small" color={colors.danger} />
                </View>
              ) : (
                <IconButton
                  icon="trash-outline"
                  label={`Hapus laporan ${report.title}`}
                  tone="danger"
                  onPress={onDelete}
                />
              )
            ) : (
              <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
            )}
          </View>

          {/* Status hanya ditampilkan kalau BUKAN 'baru'.
              Kalau setiap laporan membawa lencana "Laporan Baru", lencananya
              kehilangan makna dan cuma menambah keramaian. Yang berarti bagi
              warga adalah tahu ketika ada yang mulai menanganinya. */}
          {report.status !== 'baru' ? <StatusBadge status={report.status} /> : null}

          <AppText variant="bodyStrong" color="text" numberOfLines={2}>
            {report.title}
          </AppText>

          <AppText variant="secondary" color="textSecondary" numberOfLines={3}>
            {report.description}
          </AppText>

          {report.photo_url ? (
            <Image
              source={{ uri: urlGambar(report.photo_url) }}
              style={[styles.thumb, { backgroundColor: colors.skeleton }]}
              contentFit="cover"
              transition={180}
              accessible={false}
            />
          ) : null}

          <View style={styles.metaWrap}>
            {report.location_name ? (
              <View
                style={[
                  styles.metaPill,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}>
                <Ionicons name="location" size={16} color={colors.primaryText} />
                <AppText
                  variant="caption"
                  color="textSecondary"
                  numberOfLines={1}
                  style={styles.metaText}>
                  {report.location_name}
                </AppText>
              </View>
            ) : null}

            {report.profiles?.full_name ? (
              <View
                style={[
                  styles.metaPill,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}>
                <Ionicons name="person" size={16} color={colors.textMuted} />
                <AppText
                  variant="caption"
                  color="textMuted"
                  numberOfLines={1}
                  style={styles.metaText}>
                  {report.profiles.full_name}
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            {showConfirm ? (
              <ConfirmButton
                count={confirmCount ?? 0}
                confirmed={!!confirmedByMe}
                onPress={onConfirm!}
                loading={confirmLoading}
                disabled={confirmDisabled}
              />
            ) : null}

            <Pressable
              onPress={share}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Bagikan laporan ini ke WhatsApp"
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
          </View>
        </Surface>
      </Pressable>
    </Animated.View>
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
  thumb: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    flexShrink: 1,
    maxWidth: '100%',
  },
  metaText: {
    flexShrink: 1,
  },
  actions: {
    // Membungkus ke baris berikutnya, bukan memaksa dua tombol berdesakan di
    // layar sempit.
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
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
    flexShrink: 1,
  },
});
