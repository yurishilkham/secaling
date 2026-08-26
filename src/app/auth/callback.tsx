import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

/**
 * Callback handler untuk Google OAuth (PKCE).
 * Supabase akan redirect ke secaling://auth/callback?code=... (native) atau https://.../auth/callback?code=... (web).
 * File ini menukar `code` menjadi session via `exchangeCodeForSession`.
 *
 * Di web dengan `detectSessionInUrl: true`, Supabase JS sudah otomatis handle, tapi kita tetap tangani manual sebagai fallback.
 * Berlaku untuk warga maupun admin — role tetap dari tabel profiles.
 */
export default function AuthCallbackScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Untuk web-popup flow, coba selesaikan session via WebBrowser
    WebBrowser.maybeCompleteAuthSession();

    const handle = async (rawUrl: string) => {
      try {
        const parsed = new URL(rawUrl);
        const code = parsed.searchParams.get('code');
        const flowId = parsed.searchParams.get('sb_flow_id') || undefined;
        const tokenHash = parsed.searchParams.get('token_hash');
        const type = parsed.searchParams.get('type') as any;

        // Handle email_change / recovery via token_hash (non-PKCE fallback)
        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (verifyError) {
            setError(verifyError.message);
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
          if (data.session) router.replace('/(tabs)');
          else router.replace('/auth/login');
          return;
        }

        const { error: exError } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined as any);
        if (exError) {
          setError(exError.message);
          return;
        }
        // bersihkan query param di web
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          parsed.searchParams.delete('code');
          parsed.searchParams.delete('sb_flow_id');
          window.history.replaceState({}, '', parsed.toString());
        }
        router.replace('/(tabs)');
      } catch (e: any) {
        setError(e?.message ?? 'Gagal menyelesaikan login');
      }
    };

    // Web: cek window.location.href
    if (typeof window !== 'undefined' && window.location?.href) {
      handle(window.location.href);
      return;
    }

    // Native: cek deep link awal
    Linking.getInitialURL().then((url) => {
      if (url) handle(url);
      else {
        // tidak ada code, cek session
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) router.replace('/(tabs)');
          else router.replace('/auth/login');
        });
      }
    });
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [router]);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three }}>
        {error ? (
          <Text style={{ color: theme.danger, textAlign: 'center' }}>{error}</Text>
        ) : (
          <>
            <ActivityIndicator color={theme.primary} />
            <Text style={{ color: theme.textMuted, textAlign: 'center' }}>Menyelesaikan autentikasi…</Text>
          </>
        )}
      </View>
    </Screen>
  );
}
