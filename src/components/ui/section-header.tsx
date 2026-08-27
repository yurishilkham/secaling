import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  icon: ReactNode;
  title: string;
  /** Warna khusus untuk latar ikon. */
  accent?: string;
  action?: { label: string; onPress: () => void };
};

/**
 * Judul bagian, dengan tombol aksi opsional.
 *
 * Perubahan: tombol aksinya dulu `minHeight: 32` dengan teks 12.5px — sekarang
 * 48px dengan teks 15px. Judulnya juga dapat `numberOfLines` dan `flexShrink`,
 * karena judul seperti "Laporan (128)" berdampingan dengan tombol "Lihat semua"
 * tidak akan cukup di layar 320dp saat ukuran huruf disetel besar.
 */
export function SectionHeader({ icon, title, accent, action }: Props) {
  const { colors } = useAppTheme();
  const color = accent ?? colors.primaryText;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: accent ? `${accent}1F` : colors.primarySoft },
          ]}>
          {icon}
        </View>
        <AppText variant="heading" color="text" numberOfLines={2} style={styles.title} heading>
          {title}
        </AppText>
      </View>

      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}>
          <AppText variant="label" rawColor={color} numberOfLines={1}>
            {action.label}
          </AppText>
          <Ionicons name="chevron-forward" size={18} color={color} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    // `flex: 1` + `flexShrink` di judul membuat tombol aksi tidak pernah
    // terdorong keluar layar saat judulnya panjang.
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: Touch.min,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 2,
    flexShrink: 0,
  },
});
