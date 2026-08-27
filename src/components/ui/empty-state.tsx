import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  /** Warna khusus untuk ikon. Bawaannya hijau. */
  accent?: string;
  /** Tombol aksi, supaya keadaan kosong tidak jadi jalan buntu. */
  action?: { label: string; onPress: () => void };
};

/**
 * Keadaan kosong.
 *
 * Perubahan: teks judul dan keterangan dinaikkan (dulu 16.5 dan 13.5), ikon
 * diperbesar, dan ditambah tombol aksi opsional — supaya warga yang sampai di
 * layar kosong punya langkah berikutnya, bukan sekadar diberi tahu bahwa
 * tidak ada apa-apa.
 */
export function EmptyState({ icon, title, description, accent, action }: Props) {
  const { colors } = useAppTheme();
  const color = accent ?? colors.primaryText;

  return (
    <Surface tone="card" radius={Radius.lg} style={styles.box}>
      <View
        style={[
          styles.iconBox,
          { backgroundColor: accent ? `${accent}1F` : colors.primarySoft },
        ]}>
        <Ionicons name={icon} size={34} color={color} />
      </View>

      <AppText variant="heading" color="text" align="center" heading>
        {title}
      </AppText>

      {description ? (
        <AppText variant="secondary" color="textSecondary" align="center" style={styles.desc}>
          {description}
        </AppText>
      ) : null}

      {action ? (
        <Button
          title={action.label}
          onPress={action.onPress}
          variant="outline"
          style={styles.action}
        />
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  desc: {
    maxWidth: 320,
  },
  action: {
    marginTop: Spacing.md,
    minWidth: 200,
  },
});
