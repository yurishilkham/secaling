import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Surface } from '@/components/ui/surface';
import {
  REPORT_STATUS,
  REPORT_STATUS_KEYS,
  type ReportStatus,
  statusColors,
} from '@/constants/report-status';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  current: ReportStatus;
  onChange: (status: ReportStatus) => void;
  saving?: boolean;
};

/**
 * Pengubah status laporan, hanya tampil untuk perangkat desa.
 *
 * Ditulis sebagai tiga pilihan yang semuanya terlihat sekaligus, bukan menu
 * turun. Alasannya: perangkat desa perlu melihat status sekarang DAN pilihan
 * lainnya dalam satu pandangan, dan menu turun menyembunyikan keduanya di balik
 * satu ketukan tambahan.
 *
 * Diberi peringatan tegas bahwa mengubah status akan terlihat warga, karena
 * inilah satu-satunya cara warga tahu laporannya ditindaklanjuti — jadi salah
 * tekan bukan hal sepele.
 */
export function StatusControl({ current, onChange, saving }: Props) {
  const { colors } = useAppTheme();

  return (
    <Surface tone="card" radius={Radius.lg} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="clipboard-outline" size={24} color={colors.primaryText} />
        </View>
        <View style={styles.headerText}>
          <AppText variant="heading" color="text" heading>
            Ubah Status
          </AppText>
          <AppText variant="caption" color="textMuted">
            Warga akan melihat perubahan ini
          </AppText>
        </View>
        {saving ? <ActivityIndicator size="small" color={colors.primaryText} /> : null}
      </View>

      <View style={styles.options} accessibilityRole="radiogroup">
        {REPORT_STATUS_KEYS.map((key) => {
          const info = REPORT_STATUS[key];
          const { color, soft } = statusColors(key, colors);
          const active = current === key;

          return (
            <Pressable
              key={key}
              onPress={() => {
                if (active || saving) return;
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                }
                onChange(key);
              }}
              disabled={saving}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, checked: active, disabled: !!saving }}
              accessibilityLabel={info.label}
              accessibilityHint={info.description}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: active ? soft : colors.background,
                  borderColor: active ? color : colors.border,
                  borderWidth: active ? 2.5 : 1.5,
                  opacity: saving ? 0.6 : pressed ? 0.85 : 1,
                },
              ]}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: active ? color : colors.card },
                ]}>
                <Ionicons
                  name={info.icon}
                  size={22}
                  color={active ? colors.textOnColor : color}
                />
              </View>

              <View style={styles.optionText}>
                <AppText variant="bodyStrong" color="text">
                  {info.label}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {info.description}
                </AppText>
              </View>

              <View
                style={[
                  styles.check,
                  {
                    backgroundColor: active ? color : 'transparent',
                    borderColor: active ? color : colors.borderStrong,
                  },
                ]}>
                {active ? (
                  <Ionicons name="checkmark" size={22} color={colors.textOnColor} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
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
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Touch.large,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
