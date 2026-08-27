import { Image } from 'expo-image';
import { View, type ViewStyle } from 'react-native';

import { Radius, Shadows } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

// Dibuat oleh `node scripts/build-icons.mjs` dari logo perisai induk.
const LOGO_DARK = require('../../../assets/images/logo.png');
const LOGO_WHITE = require('../../../assets/images/logo-white.png');

type Props = {
  size?: number;
  /** `onColor` untuk logo putih di atas hijau, `plain` untuk logo hijau apa adanya. */
  tone?: 'card' | 'onColor' | 'plain';
  style?: ViewStyle;
};

/**
 * Logo Secaling yang sebenarnya.
 *
 * Sebelumnya seluruh app memakai ikon `shield-checkmark` bawaan Ionicons
 * sebagai pengganti logo — di hero Beranda, di halaman masuk, dan di kartu
 * pembatas akses. Logo perisai Secaling sendiri hanya dipakai sebagai ikon app
 * dan tidak pernah muncul di dalam app.
 *
 * Memakai `expo-image` supaya ada cache memori/disk, jadi logo tidak
 * didekode ulang setiap kali layar dibuka.
 */
export function BrandLogo({ size = 72, tone = 'card', style }: Props) {
  const { colors } = useAppTheme();

  const source = tone === 'onColor' ? LOGO_WHITE : LOGO_DARK;

  const containerStyle: ViewStyle =
    tone === 'plain'
      ? { width: size, height: size }
      : {
          width: size,
          height: size,
          borderRadius: Radius.xl,
          backgroundColor: tone === 'onColor' ? 'rgba(255,255,255,0.16)' : colors.primarySoft,
          borderWidth: 2,
          borderColor: tone === 'onColor' ? 'rgba(255,255,255,0.30)' : colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        };

  return (
    <View
      style={[containerStyle, tone === 'card' ? (Shadows.sm as ViewStyle) : null, style]}
      // Logo bersifat hiasan di sini: nama "Secaling" selalu tertulis di
      // sebelahnya, jadi kalau ikut diucapkan pembaca layar malah dobel.
      accessible={false}
      importantForAccessibility="no">
      <Image
        source={source}
        style={{ width: size * 0.74, height: size * 0.74 }}
        contentFit="contain"
        // Logo di-bundel bersama app, jadi tidak perlu efek muncul perlahan.
        transition={0}
      />
    </View>
  );
}

