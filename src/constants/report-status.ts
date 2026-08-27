import type { Ionicons } from '@expo/vector-icons';

import type { ReportStatus } from '@/lib/database.types';
import type { ThemeColors } from '@/constants/theme';

export type { ReportStatus };

export type StatusInfo = {
  key: ReportStatus;
  /** Tulisan di lencana. Sengaja pendek. */
  label: string;
  /** Penjelasan untuk warga, dipakai di halaman detail. */
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/**
 * Tiga keadaan laporan.
 *
 * Kata-katanya dipilih dari sudut pandang warga yang melapor, bukan dari sudut
 * pandang sistem. "Baru" berarti belum ada yang menanganinya — itu jujur, dan
 * lebih baik daripada menyembunyikannya.
 */
export const REPORT_STATUS: Record<ReportStatus, StatusInfo> = {
  baru: {
    key: 'baru',
    label: 'Laporan Baru',
    description: 'Laporan sudah masuk dan sedang menunggu ditindaklanjuti perangkat desa.',
    icon: 'ellipse-outline',
  },
  ditangani: {
    key: 'ditangani',
    label: 'Sedang Ditangani',
    description: 'Perangkat desa sudah membaca laporan ini dan sedang menanganinya.',
    icon: 'time',
  },
  selesai: {
    key: 'selesai',
    label: 'Sudah Selesai',
    description: 'Kejadian ini sudah ditangani dan dinyatakan selesai oleh perangkat desa.',
    icon: 'checkmark-circle',
  },
};

export const REPORT_STATUS_KEYS: ReportStatus[] = ['baru', 'ditangani', 'selesai'];

/**
 * Warna status.
 *
 * Sengaja TIDAK memakai hijau untuk "selesai" dan merah untuk "baru", walau itu
 * kebiasaan umum. Alasannya: hijau adalah warna utama aplikasi ini, dan merah
 * sudah dipakai untuk kategori kejadian serta pengumuman penting. Kalau status
 * memakai keduanya, warna kehilangan artinya.
 *
 * Jadi: abu-abu netral untuk baru, kuning untuk sedang ditangani, hijau hanya
 * untuk selesai — dan bentuk ikonnya berbeda, sehingga statusnya tetap bisa
 * dibedakan tanpa mengandalkan warna sama sekali.
 */
export function statusColors(status: ReportStatus, colors: ThemeColors) {
  switch (status) {
    case 'ditangani':
      return { color: colors.warning, soft: colors.warningSoft };
    case 'selesai':
      return { color: colors.success, soft: colors.successSoft };
    default:
      return { color: colors.textSecondary, soft: colors.background };
  }
}
