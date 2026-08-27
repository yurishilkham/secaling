import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  full_name: string;
  dusun: string;
  phone: string;
  role: 'warga' | 'admin';
  created_at: string;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Handle deep-link callback secaling://auth/callback?code=... untuk PKCE (native) + token_hash untuk email_change
  useEffect(() => {
    const handleUrl = async (url: string) => {
      try {
        const parsed = Linking.parse(url);
        // PKCE code flow
        const code = (parsed.queryParams?.code as string) || new URL(url).searchParams.get('code');
        const flowId = (parsed.queryParams?.sb_flow_id as string) || new URL(url).searchParams.get('sb_flow_id') || undefined;
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined as any);
          if (error) console.warn('exchangeCodeForSession error:', error.message);
          return;
        }
        // Fallback token_hash flow (email_change, recovery)
        const tokenHash = (parsed.queryParams?.token_hash as string) || new URL(url).searchParams.get('token_hash');
        const type = (parsed.queryParams?.type as string) || new URL(url).searchParams.get('type');
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
          if (error) console.warn('verifyOtp error:', error.message);
        }
      } catch (e) {
        console.warn('handleUrl error', e);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  async function refreshProfile() {
    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setProfile(data as Profile);
      return;
    }
    // Auto-create profile untuk user OAuth (Google) yang belum punya baris di profiles
    // Fallback client-side jika trigger DB belum ada. RLS: auth.uid() = id memperbolehkan insert.
    const meta: any = session.user.user_metadata ?? {};
    const fallbackName = meta.full_name || meta.name || meta.display_name || session.user.email?.split('@')[0] || '';
    // Coba insert, jika gagal karena trigger sudah membuatkan, abaikan
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      full_name: fallbackName,
      dusun: typeof meta.dusun === 'string' ? meta.dusun : '',
      phone: typeof meta.phone === 'string' ? meta.phone : '',
      // role default 'warga' dari DB
    });
    if (!insertError) {
      const { data: newData } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      setProfile((newData as Profile) ?? null);
      return;
    }
    // Jika insert gagal (mis. sudah ada karena race), coba fetch lagi
    const { data: retry } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((retry as Profile) ?? null);
  }

  useEffect(() => {
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}