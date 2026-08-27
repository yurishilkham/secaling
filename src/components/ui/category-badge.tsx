import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing } from '@/constants/theme';

type Props = {
  label: string;
  /** Warna utuh kategori — dipakai untuk teks dan garis batas. */
  color: string;
  /** Latar lembut kategori. */
  soft: string;
  icon?: ReactNode;
  large?: boolean;
  style?: ViewStyle;
};

/**
 * Lencana kategori.
 *
 * Perubahan: teksnya dulu 11.5px (13.5 untuk versi besar) — sekarang memakai
 * varian `badge` 13px, dan warnanya datang dari palet yang sudah diverifikasi
 * kontrasnya. Lencana ini penting: ia yang memberi tahu warga jenis kejadian
 * apa yang sedang dibaca, jadi harus terbaca dalam sekali lihat.
 *
 * Garis batasnya juga tidak lagi memakai warna dengan alpha (`color + '20'`)
 * yang nyaris tak terlihat, sekarang warna utuh dengan ketebalan 1.5px.
 */
export function CategoryBadge({ label, color, soft, icon, large = false, style }: Props) {
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
      ]}>
      {icon}
      <AppText variant="badge" rawColor={color} numberOfLines={1} style={styles.label}>
        {label}
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
    // Supaya lencana bisa menyusut, bukan mendorong isi lain keluar layar,
    // saat berdampingan dengan teks tanggal panjang di layar kecil.
    flexShrink: 1,
  },
  label: {
    flexShrink: 1,
  },
});
