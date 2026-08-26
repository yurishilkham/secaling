/**
 * Upload gambar ke imgBB
 * Docs: https://api.imgbb.com/
 *
 * ENV yang dibutuhkan:
 *   EXPO_PUBLIC_IMGBB_API_KEY=your_api_key_dari_https://api.imgbb.com/
 *
 * Jangan hardcode API key di kode. Gunakan .env
 */

const IMGBB_API_KEY = process.env.EXPO_PUBLIC_IMGBB_API_KEY;

export type ImgbbUploadResult = {
  url: string;
  display_url: string;
  delete_url: string;
  thumb_url?: string;
};

export async function uploadToImgBB(
  base64Image: string,
  options?: { name?: string; expiration?: number }
): Promise<ImgbbUploadResult> {
  if (!IMGBB_API_KEY) {
    throw new Error(
      'EXPO_PUBLIC_IMGBB_API_KEY belum diatur. Tambahkan ke file .env: EXPO_PUBLIC_IMGBB_API_KEY=your_key'
    );
  }

  // imgBB menerima base64 tanpa prefix data URI, tapi kita handle keduanya
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const form = new FormData();
  form.append('image', cleanBase64);
  if (options?.name) form.append('name', options.name);

  // expiration = detik (opsional). 0 = tidak pernah expired.
  const url = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}${
    options?.expiration ? `&expiration=${options.expiration}` : ''
  }`;

  const res = await fetch(url, {
    method: 'POST',
    body: form,
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? 'Gagal upload ke imgBB');
  }

  const data = json.data as ImgbbUploadResult & { image: { url: string } };
  return {
    url: data.url ?? data.display_url,
    display_url: data.display_url,
    delete_url: data.delete_url,
    thumb_url: (data as any).thumb?.url,
  };
}

/**
 * Helper untuk upload dari ImagePickerAsset (expo-image-picker)
 * Asset harus punya base64 (set base64:true saat pick)
 * Fallback: jika base64 tidak ada, fetch uri -> blob -> FileReader -> base64
 */
export async function uploadPickerAssetToImgBB(
  asset: { uri: string; base64?: string | null; fileName?: string | null }
): Promise<string> {
  let base64 = asset.base64 ?? null;

  if (!base64) {
    // Fallback untuk web / jika base64 tidak di-request
    // Convert uri -> base64
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // result = data:image/jpeg;base64,xxxx
        const b64 = result.split(',')[1] ?? result;
        resolve(b64);
      };
      reader.onerror = () => reject(new Error('Gagal konversi gambar ke base64'));
      reader.readAsDataURL(blob);
    });
  }

  const result = await uploadToImgBB(base64, {
    name: asset.fileName ?? `secaling-${Date.now()}`,
  });

  // Simpan display_url (kualitas original) ke DB
  return result.display_url ?? result.url;
}
