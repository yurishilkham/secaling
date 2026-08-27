import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { REPORT_STATUS, type ReportStatus, statusColors } from '@/constants/report-status';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  status: ReportStatus;
  /** Versi besar untuk halaman detail. */
  large?: boolean;
  style?: ViewStyle;
};

/**
 * Lencana status laporan.
 *
 * Statusnya dibedakan oleh TIGA hal sekaligus: bentuk ikon, tulisan, dan warna.
 * Bukan warna saja — pembaca yang buta warna harus tetap bisa membedakan
 * laporan yang sudah selesai dari yang belum ditangani.
 */
export function StatusBadge({ status, large = false, style }: Props) {
  const { colors } = useAppTheme();
  const info = REPORT_STATUS[status];
  const { color, soft } = statusColors(status, colors);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: soft,
          borderColor: color,
          paddingVertical: large ? Spacing.sm : 6,
          paddingHorizontal: large ? Spacing.md : Spacing.sm + 2,
        },
        style,
      ]}
      // Diucapkan sebagai satu kalimat utuh, bukan potongan.
      accessible
      accessibilityLabel={`Status: ${info.label}`}>
      <Ionicons name={info.icon} size={large ? 20 : 16} color={color} />
      <AppText variant="badge" rawColor={color} numberOfLines={1} style={styles.label}>
        {info.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 1,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    flexShrink: 1,
  },
  label: {
    flexShrink: 1,
  },
});
