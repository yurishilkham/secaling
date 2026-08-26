import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES, CategoryKey } from '@/constants/categories';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/format';

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
  profiles?: { full_name: string } | null;
};

export function ReportCard({
  report,
  onDelete,
  deleting,
}: {
  report: Report;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const cat = CATEGORIES[report.category] ?? CATEGORIES.lainnya;

  return (
    <Pressable
      onPress={() => router.push(`/laporan/${report.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: cat.soft }]}>
          <Ionicons name={cat.icon} size={20} color={cat.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
          <Text style={[styles.time, { color: theme.textMuted }]}>{timeAgo(report.created_at)}</Text>
        </View>
        {onDelete ? (
          <Pressable
            onPress={(e: any) => {
              // cegah bubble ke outer Pressable (penting di web)
              e?.stopPropagation?.();
              e?.preventDefault?.();
              if (!deleting) onDelete();
            }}
            disabled={!!deleting}
            style={({ pressed }) => [
              styles.deleteBtn,
              {
                backgroundColor: theme.dangerSoft,
                borderColor: theme.danger,
                opacity: deleting ? 0.6 : 1,
                transform: [{ scale: pressed && !deleting ? 0.9 : 1 }],
              },
            ]}
            hitSlop={8}
            accessibilityLabel="Hapus laporan"
            accessibilityRole="button">
            {deleting ? (
              <ActivityIndicator size="small" color={theme.danger} />
            ) : (
              <Ionicons name="trash-outline" size={16} color={theme.danger} />
            )}
          </Pressable>
        ) : (
          <View style={styles.chevron}>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {report.title}
      </Text>

      <Text style={[styles.desc, { color: theme.textSecondary }]} numberOfLines={2}>
        {report.description}
      </Text>

      {report.photo_url ? (
        <Image
          source={{ uri: report.photo_url }}
          style={[styles.thumb, { backgroundColor: theme.background }]}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.footer}>
        {report.location_name ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={theme.textMuted} />
            <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
              {report.location_name}
            </Text>
          </View>
        ) : null}
        {report.profiles?.full_name ? (
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={13} color={theme.textMuted} />
            <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
              {report.profiles.full_name}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  time: {
    fontSize: 12,
  },
  chevron: {
    marginLeft: 'auto',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  desc: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  thumb: {
    width: '100%',
    height: 150,
    borderRadius: Radius.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
  },
  meta: {
    fontSize: 12,
    flexShrink: 1,
  },
});