import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  type RefreshControlProps,
  ScrollView,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, TabBarHeight } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = ViewProps & {
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  children?: ReactNode;
  /** Layar tanpa bilah tab (mis. halaman admin) — tidak perlu ruang bawah sebanyak itu. */
  noTabBar?: boolean;
  /** Nama lama dari `noTabBar`. */
  noInset?: boolean;
  /** Rapatkan ke tengah secara vertikal — untuk kartu pembatas akses. */
  center?: boolean;
  /**
   * Layar sudah punya header dari navigasi (mis. Detail Laporan), jadi jarak
   * atasnya diurus header — bukan oleh kita.
   */
  hasHeader?: boolean;
};

/**
 * Wadah layar: mengatur jarak dari tepi layar, ruang bilah tab, dan papan tombol.
 *
 * PERUBAHAN PENTING SOAL JARAK ATAS
 *
 * Sebelumnya memakai `<SafeAreaView edges={['top']}>`. Itu memang menghindari
 * bilah status, tapi hasilnya isi layar menempel PERSIS di bawahnya tanpa
 * jarak sama sekali — judul halaman terasa menabrak jam dan ikon sinyal.
 *
 * Sekarang memakai `useSafeAreaInsets()` langsung, lalu menambahkan jarak
 * bernapas di atas nilai inset. Bedanya:
 *
 *   SafeAreaView    : paddingTop = insets.top          (mentok)
 *   sekarang        : paddingTop = insets.top + 12..16 (ada jarak)
 *
 * Dipakai `useSafeAreaInsets` dan bukan `SafeAreaView` karena kita perlu
 * menjumlahkan nilainya; `SafeAreaView` hanya bisa memakai atau tidak memakai.
 */
export function Screen({
  children,
  style,
  scroll = true,
  refreshControl,
  noTabBar = false,
  noInset = false,
  center = false,
  hasHeader = false,
  ...rest
}: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  /**
   * Jarak atas.
   *
   * Kalau layar punya header navigasi, header itu sudah memakan inset atasnya,
   * jadi kita hanya perlu jarak kecil. Kalau tidak ada header, kita sendiri yang
   * harus menghindari bilah status DAN memberi jarak.
   */
  const topInset = hasHeader ? Spacing.sm : insets.top + Spacing.md;

  const withoutTabBar = noTabBar || noInset;
  const bottomInset = withoutTabBar
    ? Math.max(insets.bottom, Spacing.lg) + Spacing.lg
    : Math.max(insets.bottom, 10) + TabBarHeight + Spacing.lg;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.contentWrap,
        { paddingTop: topInset, paddingBottom: bottomInset },
        center ? styles.centerScroll : null,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={refreshControl}>
      <View style={[styles.content, style as ViewStyle]} {...rest}>
        {children}
      </View>
    </ScrollView>
  ) : (
    <View
      style={[
        styles.contentWrap,
        styles.contentFlex,
        { paddingTop: topInset, paddingBottom: bottomInset },
        center ? styles.centerFixed : null,
        style as ViewStyle,
      ]}
      {...rest}>
      {children}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        // Di Android biarkan sistem yang mengatur lewat `adjustResize`;
        // memaksa 'height' membuat tata letak melompat saat papan tombol muncul.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        {body}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  contentWrap: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.lg,
    alignSelf: 'stretch',
  },
  contentFlex: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  centerScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerFixed: {
    justifyContent: 'center',
  },
});
