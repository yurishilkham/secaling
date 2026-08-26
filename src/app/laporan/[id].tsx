import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, StyleSheet, Text, View } from 'react-native';

import { Report } from '@/components/report-card';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Screen } from '@/components/ui/screen';
import { CATEGORIES } from '@/constants/categories';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export default function ReportDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('reports')
      .select('*, profiles(full_name)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setReport((data as Report) ?? null);
      });
  }, [id]);

  async function doDelete() {
    if (!report) return;
    setDeleting(true);
    const { error } = await supabase.from('reports').delete().eq('id', report.id);
    setDeleting(false);
    if (error) {
      Alert.alert('Gagal menghapus', error.message);
      return;
    }
    // sukses: kembali ke sebelumnya. Di web router.back() kadang tidak ada history, fallback ke home
    if (Platform.OS === 'web') {
      Alert.alert('Dihapus', 'Laporan telah dihapus.');
      try {
        if (router.canGoBack?.()) router.back();
        else router.replace('/(tabs)' as any);
      } catch {
        router.replace('/(tabs)' as any);
      }
    } else {
      Alert.alert('Dihapus', 'Laporan telah dihapus.', [
        { text: 'OK', onPress: () => {
          try { if (router.canGoBack?.()) router.back(); else router.replace('/(tabs)' as any); } catch { router.replace('/(tabs)' as any); }
        }},
      ]);
    }
  }

  async function deleteReport() {
    if (!report) return;
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm('Hapus laporan\nLaporan ini akan dihapus permanen. Lanjutkan?') : false;
      if (ok) doDelete();
      return;
    }
    Alert.alert(
      'Hapus laporan',
      'Laporan ini akan dihapus permanen. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: doDelete },
      ],
      { cancelable: true }
    );
  }

  if (error) {
    return (
      <Screen scroll={false}>
        <Text style={[styles.emptyText, { color: theme.danger }]}>{error}</Text>
      </Screen>
    );
  }

  if (!report) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.six }} />
      </Screen>
    );
  }

  const cat = CATEGORIES[report.category] ?? CATEGORIES.lainnya;
  // Hanya admin yang boleh hapus (sesuai permintaan: pelapor tidak bisa hapus)
  const canDelete = profile?.role === 'admin';

  return (
    <Screen>
      <View style={styles.header}>
        <CategoryBadge
          label={cat.label}
          color={cat.color}
          soft={cat.soft}
          icon={<Ionicons name={cat.icon} size={14} color={cat.color} />}
          large
        />
        <Text style={[styles.time, { color: theme.textMuted }]}>
          {formatDateTime(report.created_at)}
        </Text>
      </View>

      <Text style={[styles.title, { color: theme.text }]}>{report.title}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        {report.description}
      </Text>

      {report.photo_url ? (
        <Image
          source={{ uri: report.photo_url }}
          style={[styles.photo, { backgroundColor: theme.background }]}
          resizeMode="cover"
        />
      ) : null}

      <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {report.location_name ? (
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="location-outline" size={16} color={theme.primary} />
            </View>
            <Text style={[styles.infoText, { color: theme.text }]}>{report.location_name}</Text>
          </View>
        ) : null}
        {report.profiles?.full_name ? (
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="person-outline" size={16} color={theme.primary} />
            </View>
            <Text style={[styles.infoText, { color: theme.text }]}>
              Dilaporkan oleh {report.profiles.full_name}
            </Text>
          </View>
        ) : null}
      </View>

      {canDelete ? (
        <Button
          title="Hapus Laporan"
          variant="danger"
          onPress={deleteReport}
          loading={deleting}
          icon={<Ionicons name="trash-outline" size={18} color={theme.danger} />}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  time: {
    fontSize: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
  },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: Radius.lg,
    ...Shadows.md,
  },
  infoCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    ...Shadows.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingTop: Spacing.six,
  },
});