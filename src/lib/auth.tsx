import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';

import { terapkanTautanAuth } from '@/lib/auth-link';
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  full_name: string;
  dusun: string;
  phone: string;
  role: 'warga' | 'admin';
  /**
   * Jabatan tampilan khusus role='admin':
   *   'kepala_desa' | 'sekretaris_desa' | 'perangkat_desa' | null.
   * TIDAK mengubah wewenang — semua role='admin' punya hak sama.
   * Null dianggap 'perangkat_desa'.
   */
  jabatan: string | null;
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

  /**
   * Bangun sesi dari tautan yang membuka app.
   *
   * Dipasang di SINI, bukan di `auth/callback.tsx`. Sebelumnya keduanya
   * mendaftarkan pendengar tautan dan sama-sama mencoba menukar token yang
   * sama — token konfirmasi hanya berlaku sekali pakai, jadi yang berjalan
   * kedua selalu gagal.
   *
   * Semua bentuk tautan (fragment, token_hash, kode PKCE) ditangani di
   * `terapkanTautanAuth`. Perubahan sesinya sampai ke sini lewat
   * `onAuthStateChange` di atas.
   */
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) terapkanTautanAuth(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      terapkanTautanAuth(url);
    });
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