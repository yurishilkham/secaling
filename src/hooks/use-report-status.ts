import { useCallback, useEffect, useRef, useState } from 'react';

import type { ReportStatus } from '@/constants/report-status';
import { friendlyError, type FriendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

/**
 * Mengubah status laporan. Hanya berhasil untuk perangkat desa — dijaga oleh
 * kebijakan RLS di basis data, bukan hanya disembunyikan di tampilan.
 *
 * Kalau warga biasa entah bagaimana memicu ini, basis data mengembalikan 0 baris
 * dan kita perlakukan sebagai gagal.
 */
export function useReportStatus() {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [failure, setFailure] = useState<FriendlyError | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const changeStatus = useCallback(
    async (reportId: string, status: ReportStatus): Promise<boolean> => {
      setSavingId(reportId);
      setFailure(null);

      // `select()` dipakai supaya kita tahu berapa baris yang benar-benar
      // berubah. Tanpa itu, penolakan oleh RLS terlihat sama seperti sukses:
      // tidak ada error, tapi juga tidak ada yang berubah.
      const { data, error } = await supabase
        .from('reports')
        .update({ status })
        .eq('id', reportId)
        .select('id, status');

      if (!mounted.current) return false;
      setSavingId(null);

      if (error) {
        setFailure(friendlyError(error, 'changeReportStatus'));
        return false;
      }

      if (!data || data.length === 0) {
        setFailure({
          title: 'Tidak diizinkan',
          message:
            'Hanya perangkat desa yang bisa mengubah status laporan. Coba masuk ulang bila Anda memang perangkat desa.',
          retryable: false,
        });
        return false;
      }

      return true;
    },
    [],
  );

  return {
    changeStatus,
    savingId,
    statusFailure: failure,
    clearStatusFailure: () => setFailure(null),
  };
}
