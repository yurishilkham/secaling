import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Gerbang wajib update — Fase 1.
 *
 * Membaca `app_config` id=1 (force_update, minimum_version_code, update_url, message).
 * Kalau tabel belum ada / fetch gagal / offline → **fail-open** (nggak keblok).
 * Di Expo Go juga di-skip karena versionCode-nya bukan punya Secaling.
 *
 * Saklar remote di Supabase: `force_update` + `minimum_version_code` + `update_url`
 * (Drive). Versi/next URL diatur pemilik via dashboard — kode di sini cuma gate-nya.
 *
 * Cache: disimpan di AsyncStorage dengan TTL 24 jam supaya rollback `force_update`
 * tidak kekunci selamanya di HP offline. Lewat TTL dianggap kadaluarsa → fail-open.
 */

type RemoteConfig = {
  minimum_version_code: number;
  minimum_version: string;
  update_url: string;
  message: string;
  force_update: boolean;
};

type State = {
  loading: boolean;
  needsUpdate: boolean;
  updateUrl: string;
  message: string;
  remoteVersion: string;
  localVersion: string;
  localBuild: string;
  retry: () => void;
};

const CACHE_KEY = '@secaling/app_config_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam — lewat ini cache dianggap kadaluarsa (rollback aman)
const DEFAULT_URL = 'https://github.com/yurishilkham/secaling/releases';
const DEFAULT_MESSAGE =
  'Versi Secaling di HP Anda sudah kadaluarsa. Perbarui untuk tetap mendapat info keamanan desa.';

type CachedConfig = RemoteConfig & { _savedAt: number };

const Ctx = createContext<State>({
  loading: true,
  needsUpdate: false,
  updateUrl: DEFAULT_URL,
  message: DEFAULT_MESSAGE,
  remoteVersion: '',
  localVersion: '',
  localBuild: '',
  retry: () => {},
});

function getLocalVersion() {
  // expo-constants (SDK 57) — tersedia di APK maupun Expo Go
  const cfg: any = (Constants as any).expoConfig ?? (Constants as any).manifest ?? {};
  const version: string = cfg.version ?? cfg.android?.version ?? '1.0.0';
  // versionCode ada di Constants.expoConfig.android.versionCode (number) atau via expo-application
  let build: string | number | undefined = cfg.android?.versionCode ?? cfg.androidVersionCode;
  // fallback via expo-application kalau ada (nativeBuildVersion string "3" di Android)
  if (build == null) {
    try {
      // dynamic supaya tidak crash kalau modul belum ter-link di Expo Go lama
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const App = require('expo-application');
      const v = App.nativeBuildVersion;
      if (v) build = v;
    } catch {}
  }
  // Kalau tetap tidak ketemu, kembalikan '0' supaya `localCode > 0` gagal dan gate fail-open
  // (mencegah false-positive nge-blok APK baru karena parsing gagal).
  const buildStr = build != null ? String(build) : '0';
  const verStr = String(version);
  return { verStr, buildStr };
}

function isExpoGo(): boolean {
  try {
    return (Constants as any).executionEnvironment === 'storeClient';
  } catch {
    return false;
  }
}

async function fetchRemote(): Promise<RemoteConfig | null> {
  // Timeout 4s — kalau lewat, fail-open (jangan blok warga yang sinyal lemah)
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const p = supabase
      .from('app_config' as any)
      .select('minimum_version_code, minimum_version, update_url, message, force_update')
      .eq('id', 1)
      .maybeSingle();
    const withTimeout = new Promise<{ data: any; error: any }>((resolve) => {
      timeout = setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 4000);
      (p as unknown as Promise<any>)
        .then((r: any) => {
          if (timeout) clearTimeout(timeout);
          resolve(r as any);
        })
        .catch((e: any) => {
          if (timeout) clearTimeout(timeout);
          resolve({ data: null, error: e });
        });
    });
    const { data, error } = await withTimeout;
    if (error) return null;
    if (!data) return null;
    return data as RemoteConfig;
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function MandatoryUpdateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(() => {
    const { verStr, buildStr } = getLocalVersion();
    return {
      loading: true,
      needsUpdate: false,
      updateUrl: DEFAULT_URL,
      message: DEFAULT_MESSAGE,
      remoteVersion: '',
      localVersion: verStr,
      localBuild: buildStr,
      retry: () => {},
    };
  });
  const [tick, setTick] = useState(0);

  const retry = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { verStr, buildStr } = getLocalVersion();
      const localCode = parseInt(buildStr, 10) || 0;

      // Expo Go → skip (versionCode bukan punya kita)
      if (isExpoGo()) {
        if (!cancelled) {
          setState({
            loading: false,
            needsUpdate: false,
            updateUrl: DEFAULT_URL,
            message: DEFAULT_MESSAGE,
            remoteVersion: '',
            localVersion: verStr,
            localBuild: buildStr,
            retry,
          });
        }
        return;
      }

      // Coba cache dulu biar cepat, tapi tetap fetch fresh
      let cached: RemoteConfig | null = null;
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CachedConfig | RemoteConfig;
          // Dukung cache lama tanpa _savedAt sekaligus TTL baru
          const savedAt = (parsed as CachedConfig)._savedAt;
          if (savedAt && Date.now() - savedAt > CACHE_TTL_MS) {
            // Cache kadaluarsa → anggap tidak ada (rollback aman, fail-open)
            await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
            cached = null;
          } else {
            cached = parsed as RemoteConfig;
          }
        }
      } catch {}

      const remote = await fetchRemote();

      // fail-open: kalau fetch gagal dan nggak ada cache valid → jangan blok
      const effective = remote ?? cached;
      if (!effective) {
        if (!cancelled) {
          setState({
            loading: false,
            needsUpdate: false,
            updateUrl: DEFAULT_URL,
            message: DEFAULT_MESSAGE,
            remoteVersion: '',
            localVersion: verStr,
            localBuild: buildStr,
            retry,
          });
        }
        return;
      }

      // simpan cache kalau dapat fresh (sertakan timestamp)
      if (remote) {
        try {
          const toSave: CachedConfig = { ...remote, _savedAt: Date.now() };
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(toSave));
        } catch {}
      }

      const need =
        effective.force_update === true &&
        Number.isFinite(effective.minimum_version_code) &&
        localCode > 0 &&
        localCode < effective.minimum_version_code;

      if (!cancelled) {
        setState({
          loading: false,
          needsUpdate: !!need,
          updateUrl: effective.update_url || DEFAULT_URL,
          message: effective.message || DEFAULT_MESSAGE,
          remoteVersion: effective.minimum_version || '',
          localVersion: verStr,
          localBuild: buildStr,
          retry,
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [tick, retry]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useMandatoryUpdate() {
  return useContext(Ctx);
}
