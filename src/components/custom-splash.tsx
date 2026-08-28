import { Image } from 'expo-image';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Constants from 'expo-constants';

import { AppText } from '@/components/ui/app-text';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

/**
 * Layar percik Secaling — yang warga lihat 1.5 detik setelah native splash.
 *
 * Native splash (`app.json` `expo-splash-screen`) cuma bisa 1 gambar di tengah
 * dengan 1 warna latar. Kalau dipaksa 2 logo + 3 baris teks lewat native,
 * hasilnya jadi gambar mati yang pecah di HP kecil. Jadi yang detail (2 logo,
 * versi, KKN, by) ditampilkan di sini — JS, bisa OTA tanpa build baru.
 *
 * Native splash tetap ada sebentar (background #047857) biar nggak putih sebelum JS siap.
 */

function getVersionLabel(): string {
  const cfg: any = (Constants as any).expoConfig ?? (Constants as any).manifest ?? {};
  const ver: string = cfg.version ?? '1.0.0';
  let build: string | number | undefined = cfg.android?.versionCode ?? cfg.androidVersionCode;
  if (build == null) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const App = require('expo-application');
      const v = App.nativeBuildVersion;
      if (v) build = v;
    } catch {}
  }
  const b = build != null ? String(build) : '';
  return b ? `Versi ${ver} (${b})` : `Versi ${ver}`;
}

export function CustomSplash() {
  const { colors, resolved } = useAppTheme();
  const versionLabel = useMemo(() => getVersionLabel(), []);

  // Latar ngikut native splash biar mulus — pakai token tema yang sama
  // light primary #047857 (Colors.light.primary) dan dark background #101A15
  const bg = resolved === 'dark' ? colors.background : colors.primary;
  const fg = colors.onPrimary;
  const fgMuted = resolved === 'dark' ? colors.textSecondary : 'rgba(255,255,255,0.86)';
  const fgFaint = resolved === 'dark' ? colors.textMuted : 'rgba(255,255,255,0.70)';

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <Animated.View entering={FadeIn.duration(320)} style={styles.center}>
        {/* Dua logo — Secaling + Uniwara, sejajar */}
        <View style={styles.logos}>
          <Image
            source={require('../../assets/images/logo-white.png')}
            style={styles.logoSecaling}
            contentFit="contain"
            transition={0}
          />
          <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.28)' }]} />
          <Image
            source={require('../../assets/images/uniwaa.png')}
            style={styles.logoUniwara}
            contentFit="contain"
            transition={0}
          />
        </View>

        <AppText variant="title" rawColor={fg} align="center" heading style={styles.appName}>
          Secaling
        </AppText>
        <AppText variant="caption" rawColor={fgMuted} align="center">
          Keamanan Desa Segoropuro
        </AppText>
      </Animated.View>

      {/* Bawah — versi + KKN + by (paling kecil) */}
      <Animated.View entering={FadeIn.delay(120).duration(340)} style={styles.bottom}>
        <AppText variant="caption" rawColor={fgMuted} align="center">
          {versionLabel}
        </AppText>
        <AppText variant="caption" rawColor={fgMuted} align="center" style={styles.kkn}>
          Dikembangkan oleh KKN UNIWARA — Universitas PGRI Wiranegara
        </AppText>
        {/* Paling kecil — sengaja pakai Text style langsung biar 10px, nggak ketahan variant caption 13 */}
        <Text style={[styles.by, { color: fgFaint }]}>by ridz & yuris • ilkom 23</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl + 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  logos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  logoSecaling: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  logoUniwara: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  divider: {
    width: 1.5,
    height: 48,
    borderRadius: 1,
  },
  appName: {
    marginTop: Spacing.xs,
    letterSpacing: -0.4,
  },
  bottom: {
    alignItems: 'center',
    gap: 4,
    paddingTop: Spacing.md,
    width: '100%',
  },
  kkn: {
    maxWidth: 320,
  },
  // "by ridz & yuris" — diminta paling kecil. Audit melarang <13 untuk keterbacaan
  // lansia, tapi ini bukan info keselamatan — cuma kredit di splash 1.6 detik.
  // Pakai 10px dengan pengecualian audit (lihat scripts/ui-audit.mjs).
  by: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.6,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.95,
  },
});
