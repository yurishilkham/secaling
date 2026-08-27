import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { supabase } from '@/lib/supabase';

/**
 * Layar transisi setelah warga menekan tautan dari email atau menyelesaikan
 * masuk dengan Google.
 *
 * Perubahan: pesan gagal dulu menampilkan `error.message` mentah dari Supabase
 * — teks bahasa Inggris seperti "invalid flow state, no valid flow state found"
 * di tengah layar. Sekarang lewat `ErrorState` yang menerjemahkannya, dan ada
 * tombol menuju halaman masuk supaya warga tidak terjebak di sini.
 */
export default function AuthCallbackScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();

    const handle = async (rawUrl: string) => {
      try {
        const parsed = new URL(rawUrl);
        const code = parsed.searchParams.get('code');
        const flowId = parsed.searchParams.get('sb_flow_id') || undefined;
        const tokenHash = parsed.searchParams.get('token_hash');
        const type = parsed.searchParams.get('type');

        // Jalur ganti email dan pemulihan kata sandi.
        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as never,
          });
          if (verifyError) {
            setError(verifyError);
            return;
          }
          if (typeof window !== 'undefined' && window.history?.replaceState) {
            parsed.searchParams.delete('token_hash');
            parsed.searchParams.delete('type');
            window.history.replaceState({}, '', parsed.toString());
          }
          router.replace('/(tabs)');
          return;
        }

        if (!code) {
          const { data } = await supabase.auth.getSession();
          router.replace(data.session ? '/(tabs)' : '/auth/login');
          return;
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          code,
          flowId ? { flowId } : (undefined as never),
        );
        if (exchangeError) {
          setError(exchangeError);
          return;
        }

        // Bersihkan potongan tautan di web supaya kode tidak tertinggal di
        // riwayat peramban.
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          parsed.searchParams.delete('code');
          parsed.searchParams.delete('sb_flow_id');
          window.history.replaceState({}, '', parsed.toString());
        }
        router.replace('/(tabs)');
      } catch (e) {
        setError(e);
      }
    };

    if (typeof window !== 'undefined' && window.location?.href) {
      handle(window.location.href);
      return;
    }

    Linking.getInitialURL().then((url) => {
      if (url) {
        handle(url);
        return;
      }
      supabase.auth.getSession().then(({ data }) => {
        router.replace(data.session ? '/(tabs)' : '/auth/login');
      });
    });

    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [router]);

  if (error) {
    return (
      <Screen noTabBar center>
        <ErrorState
          error={error}
          title="Tautan tidak berhasil dibuka"
          message="Tautan ini mungkin sudah kedaluwarsa atau sudah pernah dipakai. Coba masuk seperti biasa."
        />
        <Button
          title="Ke Halaman Masuk"
          size="large"
          onPress={() => router.replace('/auth/login')}
          style={styles.button}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} center noTabBar>
      <View style={styles.wrap}>
        <BrandLogo size={80} />
        <ActivityIndicator size="large" color={colors.primaryText} />
        <AppText variant="body" color="textSecondary" align="center">
          Mohon tunggu sebentar…
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  button: {
    marginTop: Spacing.md,
  },
});
