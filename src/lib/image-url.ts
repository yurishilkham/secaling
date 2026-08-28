/**
 * URL gambar yang tahan blokir operator.
 *
 * MASALAHNYA
 *   Foto bukti laporan disimpan di ImgBB, dan `i.ibb.co` diblokir operator
 *   seluler Indonesia di tingkat DNS. Di HP uji (XL/Axiata), `i.ibb.co`
 *   diarahkan ke `internetpositif.id` alih-alih ke server ImgBB. Server blokir
 *   itu menyerahkan sertifikat TLS untuk domain lain, jadi `expo-image` menolak
 *   koneksinya dan foto tidak pernah muncul.
 *
 *   Yang terblokir HANYA subdomain gambarnya. `api.imgbb.com` masih normal,
 *   jadi mengunggah tetap berhasil — laporan warga tersimpan lengkap dengan
 *   fotonya, hanya tidak bisa dilihat. Itu sebabnya gejalanya membingungkan:
 *   URL di database benar dan bisa dibuka di jaringan lain.
 *
 * KENAPA PROXY, BUKAN PINDAH PENYIMPANAN
 *   Mengubah tempat penyimpanan tidak menolong foto yang SUDAH diunggah warga.
 *   Membungkus URL saat ditampilkan menolong keduanya: foto lama dan baru.
 *
 * KENAPA wsrv.nl
 *   Layanan proxy gambar gratis tanpa akun, berjalan di Cloudflare. Diuji dari
 *   HP yang jaringannya memblokir ImgBB: 200, `image/jpeg`, ~0,17 detik, dan
 *   domainnya sendiri tidak dibajak DNS.
 *
 * KALAU SUATU HARI wsrv.nl JUGA DIBLOKIR
 *   Ganti `PROXY_GAMBAR` di bawah. Semua pemakaian melewati satu fungsi ini,
 *   jadi tidak perlu menyisir layar satu per satu.
 */

const PROXY_GAMBAR = 'https://wsrv.nl/?url=';

/**
 * Domain yang diketahui diblokir operator dan perlu diproksikan.
 *
 * Daftar putih, bukan "proksikan semuanya". Alasannya: URL yang tidak
 * bermasalah lebih baik diambil langsung — satu perantara lebih sedikit berarti
 * satu titik gagal lebih sedikit, dan lebih cepat.
 */
const DOMAIN_DIBLOKIR = ['i.ibb.co', 'image.ibb.co', 'thumb.ibb.co'];

/**
 * Ubah URL gambar menjadi bentuk yang bisa dibuka warga.
 *
 * Mengembalikan `undefined` untuk masukan kosong, bukan `null`, supaya bisa
 * langsung dipakai di `source={{ uri }}` milik `expo-image` — tipe `uri`
 * miliknya menerima `string | undefined` dan menolak `null`.
 */
export function urlGambar(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  const bersih = url.trim();
  if (!bersih) return undefined;

  // Berkas lokal dari galeri atau kamera, misalnya pratinjau sebelum kirim.
  // Tidak boleh diproksikan: servernya tidak bisa melihat berkas di HP warga.
  if (!bersih.startsWith('http://') && !bersih.startsWith('https://')) {
    return bersih;
  }

  let host: string;
  try {
    host = new URL(bersih).hostname.toLowerCase();
  } catch {
    // URL tidak bisa dibaca — serahkan apa adanya, biar `expo-image` yang
    // memutuskan. Membungkusnya hanya menambah lapisan pada masukan yang
    // sudah salah.
    return bersih;
  }

  if (!DOMAIN_DIBLOKIR.includes(host)) return bersih;

  // Proxy tidak menerima skema di parameternya.
  const tanpaSkema = bersih.replace(/^https?:\/\//, '');
  return `${PROXY_GAMBAR}${encodeURIComponent(tanpaSkema)}`;
}
