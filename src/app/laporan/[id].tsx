import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { type Report } from '@/components/report-card';
import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineBanner } from '@/components/ui/inline-banner';
import { PhotoViewer } from '@/components/ui/photo-viewer';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatusControl } from '@/components/ui/status-control';
import { Surface } from '@/components/ui/surface';
import { REPORT_STATUS, statusColors } from '@/constants/report-status';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCategory } from '@/hooks/use-category';
import { useConfirmations } from '@/hooks/use-confirmations';
import { useReportStatus } from '@/hooks/use-report-status';
import { useAuth } from '@/lib/auth';
import { friendlyError, type FriendlyError } from '@/lib/errors';
import { formatDateTime, timeAgo } from '@/lib/format';
import { urlGambar } from '@/lib/image-url';
import { buildReportMessage, shareToWhatsApp } from '@/lib/share';
import { PILIH_LAPORAN_DENGAN_PELAPOR, supabase } from '@/lib/supabase';

/**
 * Tiga keadaan yang bisa terjadi setelah memuat, dan dulu tercampur jadi satu.
 *
 * Kode sebelumnya memakai `.maybeSingle()` dan menyimpan `data ?? null`. Kalau
 * id-nya tidak ada, `data` bernilai null DAN `error` juga null — sehingga tidak
 * ada cabang yang terpenuhi, dan layar menampilkan spinner yang berputar
 * selamanya tanpa jalan keluar selain tombol kembali di header.
 */
type LoadState = 'loading' | 'ready' | 'notfound' | 'error';

export default function ReportDetailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { profile, session } = useAuth();
  const resolveCategory = useCategory();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<unknown>(null);

  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailure, setDeleteFailure] = useState<FriendlyError | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);

  const { changeStatus, savingId, statusFailure, clearStatusFailure } = useReportStatus();

  // Daftar id sengaja dibuat stabil supaya hook tidak memuat ulang setiap
  // render. Di halaman ini isinya cuma satu laporan.
  const idList = useMemo(() => (report ? [report.id] : []), [report]);
  const {
    counts,
    mine,
    toggle,
    pendingId,
    confirmationFailure,
    clearConfirmationFailure,
  } = useConfirmations(idList, session?.user.id ?? null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!id) {
      setState('notfound');
      return;
    }

    const { data, error } = await supabase
      .from('reports')
      .select(PILIH_LAPORAN_DENGAN_PELAPOR)
      .eq('id', id)
      .maybeSingle();

    if (!mounted.current) return;

    if (error) {
      setLoadError(error);
      setState('error');
      return;
    }
    if (!data) {
      setState('notfound');
      return;
    }

    setReport(data as Report);
    setState('ready');
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!report) return;

    setAskDelete(false);
    setDeleting(true);
    setDeleteFailure(null);

    const { error } = await supabase.from('reports').delete().eq('id', report.id);

    if (!mounted.current) return;

    if (error) {
      setDeleting(false);
      setDeleteFailure(friendlyError(error, 'deleteReport'));
      return;
    }

    // Satu jalur untuk semua platform. Kode lama punya empat cabang berbeda
    // untuk satu aksi hapus: web dengan window.confirm, HP dengan Alert,
    // masing-masing dengan perilaku navigasi yang sedikit berbeda.
    router.back();
  }

  function share() {
    if (!report) return;
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

  // --- Memuat ---
  if (state === 'loading') {
    return (
      <Screen noTabBar>
        <View style={styles.loadingWrap}>
          <Skeleton width="45%" height={32} radius={Radius.pill} />
          <Skeleton height={30} />
          <Skeleton height={30} width="80%" />
          <Skeleton height={200} radius={Radius.lg} />
          <Skeleton height={90} radius={Radius.lg} />
        </View>
      </Screen>
    );
  }

  // --- Gagal memuat ---
  if (state === 'error') {
    return (
      <Screen noTabBar center>
        <ErrorState error={loadError} onRetry={load} />
      </Screen>
    );
  }

  // --- Tidak ditemukan ---
  if (state === 'notfound' || !report) {
    return (
      <Screen noTabBar center>
        <EmptyState
          icon="document-outline"
          title="Laporan tidak ditemukan"
          description="Laporan ini sudah dihapus, atau tautannya tidak berlaku lagi."
          action={{ label: 'Kembali ke Beranda', onPress: () => router.replace('/') }}
        />
      </Screen>
    );
  }

  const cat = resolveCategory(report.category);
  const isAdmin = profile?.role === 'admin';
  const statusInfo = REPORT_STATUS[report.status];
  const { color: statusColor, soft: statusSoft } = statusColors(report.status, colors);
  const confirmCount = counts[report.id] ?? 0;
  const confirmedByMe = mine.has(report.id);

  return (
    <Screen noTabBar>
      {deleteFailure ? (
        <InlineBanner
          tone="error"
          message={deleteFailure.message}
          onDismiss={() => setDeleteFailure(null)}
        />
      ) : null}

      {statusFailure ? (
        <InlineBanner
          tone="error"
          message={statusFailure.message}
          onDismiss={clearStatusFailure}
        />
      ) : null}

      {confirmationFailure ? (
        <InlineBanner
          tone="error"
          message={confirmationFailure.message}
          onDismiss={clearConfirmationFailure}
        />
      ) : null}

      {/* Header navigasi sudah dihapus dari seluruh app, jadi tiap layar
          menyediakan jalan kembalinya sendiri — dengan target sentuh 48px,
          bukan tanda panah kecil di pojok. */}
      <BackButton label="Kembali" />

      <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
        <View style={styles.badgeRow}>
          <CategoryBadge
            label={cat.label}
            color={cat.color}
            soft={cat.soft}
            icon={<Ionicons name={cat.icon} size={18} color={cat.color} />}
            large
          />
          <StatusBadge status={report.status} large />
        </View>

        {/* Tanggal ditaruh di baris sendiri, bukan sebaris dengan lencana.
            `formatDateTime` menghasilkan teks panjang seperti "Kamis, 27
            Agustus 2026 pukul 14.30" — disandingkan dengan lencana "Bencana
            Alam", baris itu tidak mungkin cukup di layar 320dp. */}
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} />
          <AppText variant="caption" color="textMuted" style={styles.timeText}>
            {formatDateTime(report.created_at)}
          </AppText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(320)}>
        <AppText variant="display" color="text" heading>
          {report.title}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(90).duration(320)}>
        <AppText variant="body" color="textSecondary">
          {report.description}
        </AppText>
      </Animated.View>

      {report.photo_url ? (
        <Animated.View entering={FadeInDown.delay(120).duration(320)}>
          <Pressable
            onPress={() => setPhotoOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Lihat foto ukuran penuh"
            style={({ pressed }) => [styles.photoPress, { opacity: pressed ? 0.9 : 1 }]}>
            <Image
              source={{ uri: urlGambar(report.photo_url) }}
              style={[styles.photo, { backgroundColor: colors.skeleton }]}
              contentFit="cover"
              transition={200}
              accessible={false}
            />
            <View style={[styles.zoomHint, { backgroundColor: colors.overlay }]}>
              <Ionicons name="expand-outline" size={18} color={colors.onOverlay} />
              <AppText variant="caption" rawColor={colors.onOverlay}>
                Ketuk untuk perbesar
              </AppText>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(150).duration(320)}>
        <Surface tone="card" radius={Radius.lg} style={styles.infoCard}>
          {/* Penjelasan status ditulis lengkap di sini, bukan hanya lencananya.
              Lencana memberi tahu APA statusnya; kalimat ini memberi tahu APA
              ARTINYA bagi warga yang melapor. */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: statusSoft }]}>
              <Ionicons name={statusInfo.icon} size={22} color={statusColor} />
            </View>
            <View style={styles.infoText}>
              <AppText variant="caption" color="textMuted">
                Status
              </AppText>
              <AppText variant="secondary" color="text">
                {statusInfo.description}
              </AppText>
              {report.status_changed_at ? (
                <AppText variant="caption" color="textMuted">
                  {`Diperbarui ${timeAgo(report.status_changed_at)}`}
                </AppText>
              ) : null}
            </View>
          </View>

          {report.location_name ? (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="location" size={22} color={colors.primaryText} />
              </View>
              <View style={styles.infoText}>
                <AppText variant="caption" color="textMuted">
                  Lokasi
                </AppText>
                <AppText variant="body" color="text">
                  {report.location_name}
                </AppText>
              </View>
            </View>
          ) : null}

          {report.profiles?.full_name ? (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="person" size={22} color={colors.primaryText} />
              </View>
              <View style={styles.infoText}>
                <AppText variant="caption" color="textMuted">
                  Dilaporkan oleh
                </AppText>
                <AppText variant="body" color="text">
                  {report.profiles.full_name}
                </AppText>
              </View>
            </View>
          ) : null}
        </Surface>
      </Animated.View>

      {/* Tombol "Saya Juga Lihat" */}
      <Animated.View entering={FadeInDown.delay(170).duration(320)}>
        <Surface tone="card" radius={Radius.lg} style={styles.confirmCard}>
          <AppText variant="bodyStrong" color="text">
            Anda juga melihat kejadian ini?
          </AppText>
          <AppText variant="secondary" color="textSecondary">
            {session
              ? 'Ketuk tombol di bawah. Tidak perlu menulis apa pun.'
              : 'Masuk dulu untuk ikut membenarkan laporan ini.'}
          </AppText>
          <ConfirmButton
            count={confirmCount}
            confirmed={confirmedByMe}
            onPress={() => toggle(report.id)}
            loading={pendingId === report.id}
            disabled={!session}
          />
        </Surface>
      </Animated.View>

      {/* Pengubah status, hanya untuk perangkat desa */}
      {isAdmin ? (
        <Animated.View entering={FadeInDown.delay(190).duration(320)}>
          <StatusControl
            current={report.status}
            saving={savingId === report.id}
            onChange={async (next) => {
              const ok = await changeStatus(report.id, next);
              if (ok) {
                setReport((prev) =>
                  prev ? { ...prev, status: next, status_changed_at: new Date().toISOString() } : prev,
                );
              }
            }}
          />
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(210).duration(320)} style={styles.actions}>
        <Button
          title="Bagikan ke WhatsApp"
          variant="outline"
          onPress={share}
          icon={<Ionicons name="logo-whatsapp" size={24} color={colors.primaryText} />}
        />

        {isAdmin ? (
          <Button
            title="Hapus Laporan"
            variant="danger"
            onPress={() => setAskDelete(true)}
            loading={deleting}
            icon={<Ionicons name="trash-outline" size={22} color={colors.danger} />}
          />
        ) : null}
      </Animated.View>

      <PhotoViewer
        visible={photoOpen}
        uri={report.photo_url}
        onClose={() => setPhotoOpen(false)}
      />

      <ConfirmSheet
        visible={askDelete}
        title="Hapus laporan ini?"
        message={`"${report.title}" akan hilang dari daftar dan tidak bisa dikembalikan.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Jangan Hapus"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setAskDelete(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  header: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  badgeRow: {
    // Membungkus ke baris berikutnya, bukan memaksa dua lencana berdesakan.
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  confirmCard: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeText: {
    flexShrink: 1,
  },
  photoPress: {
    position: 'relative',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 280,
  },
  zoomHint: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  infoCard: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  actions: {
    gap: Spacing.sm,
  },
});
