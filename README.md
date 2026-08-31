# Secaling — Keamanan Desa Segoropuro

Aplikasi mobile keamanan desa: warga dapat melapor kejadian (maling, kebakaran, kecelakaan, dsb.) secara real-time, menerima peringatan, dan melihat pengumuman resmi desa.

## Fitur

- **Feed peringatan real-time** — laporan & pengumuman terbaru muncul otomatis tanpa refresh (Supabase Realtime)
- **Form laporan kejadian** — kategori berwarna, deskripsi, titik lokasi di peta (tap peta / lokasi otomatis), nama lokasi/dusun
- **Detail laporan + peta** — lokasi kejadian tampil di Google Maps
- **Push notification** — semua perangkat warga mendapat notifikasi saat ada laporan/pengumuman baru
- **Pengumuman desa** — hanya admin/perangkat desa yang bisa menerbitkan, tanda "PENTING" untuk yang mendesak
- **Login opsional** — semua orang bisa membaca; login (email + kata sandi) untuk melapor; admin mengelola pengumuman

## Teknologi

- **Frontend:** React Native + Expo SDK 57 (expo-router)
- **Backend:** Supabase (Postgres + RLS, Auth, Realtime, Edge Functions)
- **Notifikasi:** Expo Push Service via Edge Function yang dipicu trigger database

## Struktur Database

| Tabel | Isi |
|---|---|
| `profiles` | Data warga: nama, dusun, no. HP, role (`warga`/`admin`) |
| `reports` | Laporan kejadian: kategori, judul, deskripsi, lokasi + koordinat |
| `announcements` | Pengumuman desa: judul, isi, tanda penting |
| `push_tokens` | Expo push token per perangkat |

Keamanan (RLS): baca publik, tulis hanya untuk pemilik/terautentikasi, pengumuman khusus admin.

## Menjalankan

```bash
npm install
npx expo start
```

Scan QR dengan aplikasi **Expo Go** (Android/iOS).

### Konfigurasi

1. Salin `.env` (sudah berisi kredensial project Supabase `vzigxwjgytbwhwtcrcxr`).
2. Jalankan `npx expo run:android` (development build) agar **push notification** berfungsi. Di Expo Go, push tidak tersedia untuk Android sejak SDK 53 — gunakan mode pengujian in-app (realtime) di Expo Go.

### Mengatur Admin Desa

Role admin diatur di tabel `profiles` (bukan dari aplikasi), misalnya di dashboard Supabase:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'email-pengguna');
```

**Jabatan (tampilan saja, wewenang sama).** Kolom `profiles.jabatan` mengatur
lencana di Profil: `kepala_desa`, `sekretaris_desa`, atau `perangkat_desa`
(NULL = Perangkat Desa). Role tetap `admin` untuk semua:

```sql
-- Contoh: King Mus sebagai Kepala Desa
update public.profiles
set jabatan = 'kepala_desa'
where id = (select id from auth.users where email = 'kingmus362@gmail.com');
```

Setelah itu pengguna tersebut mendapat menu "Tulis Pengumuman Desa".

## Arsitektur Notifikasi

```
Insert reports/announcements
        │
        ▼
Trigger DB (notify_new_record) ──► pg_net HTTP POST
        │
        ▼
Edge Function send-notification ──► Expo Push API ──► semua perangkat
```

Edge function divalidasi dengan secret internal (`notify_secret`), bukan JWT publik.

## Struktur Kode

```
src/
├── app/
│   ├── _layout.tsx            # Stack + AuthProvider + notifikasi
│   ├── (tabs)/                # Beranda, Lapor, Pengumuman, Profil
│   ├── laporan/[id].tsx       # Detail laporan + peta
│   ├── auth/login.tsx         # Masuk
│   ├── auth/register.tsx      # Daftar akun
│   └── admin/pengumuman-baru.tsx  # (admin) tulis pengumuman
├── components/                # Card, chip kategori, tombol, input, dll.
├── constants/                 # Tema & daftar kategori
└── lib/                       # supabase client, auth context, notifikasi, format
```

## Perintah

```bash
npm run lint      # ESLint
npx tsc --noEmit  # typecheck
```