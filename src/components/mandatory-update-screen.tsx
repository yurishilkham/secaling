import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { InlineBanner } from '@/components/ui/inline-banner';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  updateUrl: string;
  message: string;
  remoteVersion?: string;
  localVersion?: string;
  onRetry?: () => void;
};

/**
 * Layar wajib update — hard-block.
 *
 * Nggak ada tombol tutup, nggak bisa back. Ada tombol utama buka Drive
 * dan tombol kedua "Coba Lagi" untuk cek gate ulang tanpa restart.
 * Cuma muncul kalau `needsUpdate===true` (force_update=true + versionCode kadaluarsa).
 */
export function MandatoryUpdateScreen({
  updateUrl,
  message,
  remoteVersion,
  localVersion,
  onRetry,
}: Props) {
  const { colors } = useAppTheme();
  const [err, setErr] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  // Blok tombol back HP — kayak lapor.tsx:66 tapi return true terus
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const open = useCallback(async () => {
    setErr(null);
    setOpening(true);
    try {
      await Linking.openURL(updateUrl);
    } catch (e: any) {
      setErr(e?.message ?? 'Gagal membuka tautan. Salin alamat ini di browser: ' + updateUrl);
    } finally {
      setOpening(false);
    }
  }, [updateUrl]);

  return (
    <Screen scroll={false} center noTabBar>
      <Surface tone="card" radius={Radius.xl} style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: colors.warningSoft }]}>
          <Ionicons name="download-outline" size={40} color={colors.warning} />
        </View>
        <AppText variant="title" color="text" align="center" heading>
          Perbarui Secaling
        </AppText>
        <AppText variant="body" color="textSecondary" align="center" style={styles.msg}>
          {message}
        </AppText>
        {remoteVersion || localVersion ? (
          <AppText variant="caption" color="textMuted" align="center">
            {localVersion ? `Versi Anda ${localVersion}` : ''}
            {localVersion && remoteVersion ? ' → ' : ''}
            {remoteVersion ? `Perlu ${remoteVersion}` : ''}
          </AppText>
        ) : null}
        {err ? <InlineBanner tone="error" message={err} onDismiss={() => setErr(null)} /> : null}
        <AppText variant="caption" color="textMuted" align="center" style={styles.linkHint}>
          {updateUrl}
        </AppText>
        <Button
          title="Perbarui Sekarang"
          size="large"
          onPress={open}
          loading={opening}
          icon={<Ionicons name="open-outline" size={22} color={colors.onPrimary} />}
        />
        {onRetry ? (
          <Button
            title="Coba Lagi"
            variant="outline"
            onPress={onRetry}
            icon={<Ionicons name="refresh" size={22} color={colors.primaryText} />}
          />
        ) : null}
        <AppText variant="caption" color="textMuted" align="center">
          Setelah mengunduh, pasang APK-nya lalu buka kembali Secaling.
        </AppText>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 420,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  msg: {
    maxWidth: 340,
  },
  linkHint: {
    maxWidth: 340,
  },
});
