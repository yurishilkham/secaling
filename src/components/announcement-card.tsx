import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/format';

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
  deleting,
}: {
  announcement: Announcement;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const theme = useTheme();
  const important = announcement.is_important;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: important ? theme.dangerSoft : theme.card,
          borderColor: important ? theme.danger : theme.border,
        },
      ]}>
      {onDelete ? (
        <Pressable
          onPress={(e: any) => {
            e?.stopPropagation?.();
            e?.preventDefault?.();
            if (!deleting) onDelete();
          }}
          disabled={!!deleting}
          style={({ pressed }) => [
            styles.deleteBtn,
            {
              backgroundColor: important ? theme.danger : theme.dangerSoft,
              borderColor: theme.danger,
              opacity: deleting ? 0.6 : 1,
              transform: [{ scale: pressed && !deleting ? 0.9 : 1 }],
            },
          ]}
          hitSlop={8}
          accessibilityLabel="Hapus pengumuman"
          accessibilityRole="button">
          {deleting ? (
            <ActivityIndicator size="small" color={important ? '#FFFFFF' : theme.danger} />
          ) : (
            <Ionicons name="trash-outline" size={16} color={important ? '#FFFFFF' : theme.danger} />
          )}
        </Pressable>
      ) : null}
      <View style={styles.header}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: important ? theme.danger : theme.primarySoft },
          ]}>
          <Ionicons
            name={important ? 'megaphone' : 'megaphone-outline'}
            size={20}
            color={important ? '#FFFFFF' : theme.primary}
          />
        </View>
        <View style={[styles.headerText, onDelete ? styles.headerTextWithDelete : null]}>
          <Text
            style={[
              styles.badge,
              { color: important ? theme.danger : theme.primary },
            ]}>
            {important ? 'PENTING' : 'PENGUMUMAN'}
          </Text>
          <Text style={[styles.time, { color: theme.textMuted }]}>
            {timeAgo(announcement.created_at)}
            {announcement.profiles?.full_name ? ` · ${announcement.profiles.full_name}` : ''}
          </Text>
        </View>
      </View>

      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {announcement.title}
      </Text>

      <Text style={[styles.body, { color: theme.textSecondary }]} numberOfLines={4}>
        {announcement.body}
      </Text>
    </View>
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
  deleteBtn: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderWidth: 1,
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
  headerTextWithDelete: {
    paddingRight: Spacing.four + 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  time: {
    fontSize: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    fontSize: 13.5,
    lineHeight: 19,
  },
});