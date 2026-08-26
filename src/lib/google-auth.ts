import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function getNativeRedirectUri() {
  return makeRedirectUri({
    scheme: 'secaling',
    // Expo Router akan menangani secaling://auth/callback
    path: 'auth/callback',
  });
}

function getWebRedirectUri() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    // Expo Router web: /auth/callback akan di-handle oleh src/app/auth/callback.tsx
    // Jika prefer origin saja, bisa pakai window.location.origin; tapi pakai /auth/callback lebih eksplisit
    return `${window.location.origin}/auth/callback`;
  }
  // fallback untuk SSR / build time
  return getNativeRedirectUri();
}

export function getRedirectUri() {
  return Platform.OS === 'web' ? getWebRedirectUri() : getNativeRedirectUri();
}

/**
 * Login dengan Google untuk user maupun admin.
 * - Web: redirect via Supabase OAuth (detectSessionInUrl akan menangani code exchange otomatis)
 * - Native (Android/iOS): buka via WebBrowser, lalu exchange code secara manual
 *
 * Role (admin/warga) ditentukan dari tabel `profiles.role`.
 * User baru via Google otomatis dibuatkan profile dengan role 'warga' (via trigger DB atau fallback client).
 */
export async function signInWithGoogle() {
  const redirectTo = getRedirectUri();

  if (Platform.OS === 'web') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
    // di web, Supabase akan redirect halaman otomatis ke redirectTo?code=...
    // dengan detectSessionInUrl: true, session akan terdeteksi otomatis
    return data;
  }

  // Native: gunakan PKCE + WebBrowser
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Gagal mendapatkan URL login Google');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !('url' in result) || !result.url) {
    if ((result as any).type === 'cancel' || (result as any).type === 'dismiss') {
      throw new Error('Login Google dibatalkan');
    }
    throw new Error('Gagal menyelesaikan login Google');
  }

  // result.url contoh: secaling://auth/callback?code=xxx&sb_flow_id=yyy
  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  if (!code) {
    const err = url.searchParams.get('error_description') || url.searchParams.get('error') || 'Kode autentikasi tidak ditemukan';
    throw new Error(err);
  }
  const flowId = url.searchParams.get('sb_flow_id') || url.searchParams.get('flowId') || undefined;

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined as any);
  if (exchangeError) throw exchangeError;
}
