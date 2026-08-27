import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { CATEGORIES, type CategoryKey } from '@/constants/categories';
import { formatDateTime } from '@/lib/format';

/**
 * Membagikan laporan dan pengumuman ke WhatsApp.
 *
 * Kenapa WhatsApp secara khusus: di desa, itulah cara informasi benar-benar
 * menyebar — lewat grup RT, grup ronda, grup keluarga. Menyediakan lembar
 * "bagikan" bawaan sistem saja membuat warga harus mencari WhatsApp di daftar
 * panjang aplikasi, jadi kita sediakan jalan langsung.
 *
 * Kalau WhatsApp tidak terpasang, otomatis jatuh ke lembar bagikan bawaan
 * sistem — jadi tombolnya tidak pernah mati.
 */

const APP_NAME = 'Secaling';
const VILLAGE = 'Desa Segoropuro';

/** Membatasi panjang teks agar pesan WhatsApp tidak jadi dinding kata. */
function clamp(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export type ShareReportInput = {
  category: CategoryKey;
  title: string;
  description: string;
  locationName?: string | null;
  createdAt: string;
  reporterName?: string | null;
};

/**
 * Menyusun pesan laporan.
 *
 * Sengaja dibuat rapi dan mudah dibaca sekali lihat, karena pesan ini akan
 * dibaca di daftar obrolan WhatsApp yang penuh — bukan di dalam app.
 */
export function buildReportMessage(r: ShareReportInput): string {
  const cat = CATEGORIES[r.category] ?? CATEGORIES.lainnya;
  const lines = [
    `*${cat.label.toUpperCase()} — ${VILLAGE}*`,
    '',
    `*${clamp(r.title, 90)}*`,
    clamp(r.description, 400),
  ];

  if (r.locationName) lines.push('', `Lokasi: ${clamp(r.locationName, 80)}`);
  lines.push(`Waktu: ${formatDateTime(r.createdAt)}`);
  if (r.reporterName) lines.push(`Dilaporkan: ${clamp(r.reporterName, 50)}`);

  lines.push('', `Dikirim lewat aplikasi ${APP_NAME}`);
  return lines.join('\n');
}

export type ShareAnnouncementInput = {
  title: string;
  body: string;
  isImportant: boolean;
  createdAt: string;
  authorName?: string | null;
};

export function buildAnnouncementMessage(a: ShareAnnouncementInput): string {
  const lines = [
    a.isImportant
      ? `*PENGUMUMAN PENTING — ${VILLAGE}*`
      : `*PENGUMUMAN — ${VILLAGE}*`,
    '',
    `*${clamp(a.title, 90)}*`,
    clamp(a.body, 700),
    '',
    `Waktu: ${formatDateTime(a.createdAt)}`,
  ];

  if (a.authorName) lines.push(`Dari: ${clamp(a.authorName, 50)}`);
  lines.push('', `Dikirim lewat aplikasi ${APP_NAME}`);
  return lines.join('\n');
}

export type ShareResult = 'shared' | 'dismissed' | 'failed';

/**
 * Membuka WhatsApp dengan pesan sudah terisi. Jatuh ke lembar bagikan bawaan
 * sistem kalau WhatsApp tidak ada.
 *
 * Catatan: `canOpenURL` di Android butuh skema terdaftar di `queries` pada
 * AndroidManifest, jadi hasilnya tidak selalu bisa dipercaya. Karena itu kita
 * langsung mencoba membuka dan menangkap kegagalannya — lebih andal daripada
 * menanyakan dulu.
 */
export async function shareToWhatsApp(message: string): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    return shareWithSystem(message);
  }

  const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

  try {
    await Linking.openURL(url);
    return 'shared';
  } catch {
    // WhatsApp tidak terpasang, atau skemanya diblokir.
    return shareWithSystem(message);
  }
}

/** Lembar bagikan bawaan sistem — bisa ke SMS, email, aplikasi lain. */
export async function shareWithSystem(message: string): Promise<ShareResult> {
  try {
    const result = await Share.share({ message });
    if (result.action === Share.dismissedAction) return 'dismissed';
    return 'shared';
  } catch {
    return 'failed';
  }
}
