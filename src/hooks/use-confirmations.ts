import { useCallback, useEffect, useRef, useState } from 'react';

import { friendlyError, type FriendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

type State = {
  /** Jumlah pembenaran per laporan. */
  counts: Record<string, number>;
  /** Laporan mana yang sudah dibenarkan oleh warga yang sedang masuk. */
  mine: Set<string>;
};

const EMPTY: State = { counts: {}, mine: new Set() };

/**
 * Tombol "Saya Juga Lihat".
 *
 * Warga bisa membenarkan laporan tanpa mengetik apa pun. Ini penting karena
 * mengetik di HP adalah hambatan nyata bagi banyak warga lansia, sementara
 * informasi "3 warga lain juga melihat ini" sangat berguna: ia membedakan
 * kejadian yang benar-benar terjadi dari kesalahpahaman.
 *
 * Dua hal yang perlu diperhatikan di sini:
 *
 * 1. SATU PERMINTAAN UNTUK SEMUA LAPORAN. Beranda menampilkan sampai 30
 *    laporan. Menghitung satu per satu berarti 30 permintaan jaringan — di
 *    sambungan desa yang lambat itu sangat terasa. Fungsi `hitung_pembenaran`
 *    di basis data mengembalikan semuanya sekaligus.
 *
 * 2. TAMPILAN BERUBAH DULU, KIRIM KEMUDIAN. Angkanya diperbarui di layar
 *    seketika, lalu dikirim ke server. Kalau pengirimannya gagal, angkanya
 *    dikembalikan. Tanpa ini, warga menekan tombol lalu menunggu tanpa
 *    tanda apa pun — dan biasanya menekan lagi.
 */
export function useConfirmations(reportIds: string[], userId: string | null) {
  const [state, setState] = useState<State>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<FriendlyError | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Gabungkan daftar id jadi satu teks supaya `useEffect` tidak terpicu ulang
  // hanya karena arraynya objek baru dengan isi yang sama.
  const idKey = reportIds.join(',');

  const load = useCallback(async () => {
    const ids = idKey ? idKey.split(',') : [];
    if (ids.length === 0) {
      setState(EMPTY);
      return;
    }

    setLoading(true);

    const [countRes, mineRes] = await Promise.all([
      supabase.rpc('hitung_pembenaran', { daftar_id: ids }),
      userId
        ? supabase
            .from('report_confirmations')
            .select('report_id')
            .eq('user_id', userId)
            .in('report_id', ids)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (!mounted.current) return;
    setLoading(false);

    // Kegagalan di sini tidak ditampilkan sebagai kesalahan ke warga.
    // Jumlah pembenaran itu informasi tambahan; kalau gagal dimuat, laporannya
    // tetap bisa dibaca. Menampilkan pesan gagal hanya akan mengganggu.
    if (countRes.error) {
      console.warn('[secaling] gagal memuat jumlah pembenaran', countRes.error.message);
      return;
    }

    const counts: Record<string, number> = {};
    for (const row of countRes.data ?? []) {
      counts[row.report_id] = Number(row.jumlah);
    }

    const mine = new Set<string>();
    if (!mineRes.error) {
      for (const row of mineRes.data ?? []) mine.add(row.report_id);
    }

    setState({ counts, mine });
  }, [idKey, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (reportId: string): Promise<void> => {
      if (!userId || pendingId) return;

      const sudah = state.mine.has(reportId);
      const sebelum = state;

      // Perbarui tampilan lebih dulu.
      setState((prev) => {
        const mine = new Set(prev.mine);
        const counts = { ...prev.counts };
        const kini = counts[reportId] ?? 0;

        if (sudah) {
          mine.delete(reportId);
          counts[reportId] = Math.max(0, kini - 1);
        } else {
          mine.add(reportId);
          counts[reportId] = kini + 1;
        }
        return { counts, mine };
      });

      setPendingId(reportId);
      setFailure(null);

      const { error } = sudah
        ? await supabase
            .from('report_confirmations')
            .delete()
            .eq('report_id', reportId)
            .eq('user_id', userId)
        : await supabase.from('report_confirmations').insert({
            report_id: reportId,
            user_id: userId,
          });

      if (!mounted.current) return;
      setPendingId(null);

      if (error) {
        // Kembalikan angkanya, supaya yang terlihat di layar sama dengan yang
        // sebenarnya tersimpan.
        setState(sebelum);
        setFailure(friendlyError(error, 'toggleConfirmation'));
      }
    },
    [pendingId, state, userId],
  );

  return {
    counts: state.counts,
    mine: state.mine,
    toggle,
    pendingId,
    loadingConfirmations: loading,
    confirmationFailure: failure,
    clearConfirmationFailure: () => setFailure(null),
    reloadConfirmations: load,
  };
}
