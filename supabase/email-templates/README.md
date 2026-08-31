# Email Templates Secaling — Endpoint Verify (anti-blokir Gmail)

Semua link email pakai **`{{ .ConfirmationURL }}`** — link yang dibangun GoTrue sendiri, murni https, 303 langsung ke APK. Hasil render di email kira-kira:

```
https://vzigxwjgytbwhwtcrcxr.supabase.co/auth/v1/verify?token=<token>&type=signup&redirect_to=secaling://auth/callback
```

Kenapa bukan `secaling://` langsung? **Gmail (web & app) menolak link scheme custom di email** (anti-phishing, hanya izinkan `https`/`mailto`) — link jadi tidak bisa diklik sama sekali. Endpoint verify = https (Gmail izinkan), server Supabase mengonsumsi token, lalu **303 → APK**. Tanpa halaman perantara.

- App tetap kirim `emailRedirectTo: secaling://auth/callback` (untuk validasi Supabase):
  - `src/app/auth/register.tsx:127` (daftar)
  - `src/app/auth/login.tsx:136` (resend)
  - `src/hooks/use-auth-forms.ts:154` (ganti email)
  - `src/lib/google-auth.ts:10` (`makeRedirectUri({scheme:'secaling', path:'auth/callback'})`)
- Template email **TIDAK memakai** `{{ .RedirectTo }}` (nilainya `secaling://` = diblok Gmail), melainkan hardcode URL verify di atas.
- **WAJIB `{{ .ConfirmationURL }}`, JANGAN rakit URL verify manual** — kedua cara manual SUDAH DITES GAGAL:
  - `{{ .Token }}` (raw) → selalu 403 "Email link is invalid or has expired" — raw token tidak cocok dengan bentuk token yang tersimpan GoTrue untuk signup klasik (supabase-js `signUp` tidak memakai PKCE, tokennya disimpan terenkripsi).
  - `{{ .TokenHash }}` → ke-render KOSONG di email flow klasik → 400 "Verify requires a token or a token hash".
  - `{{ .ConfirmationURL }}` memakai bentuk token yang GoTrue sendiri validasi + otomatis menyertakan `redirect_to=secaling://auth/callback` (dari `emailRedirectTo` yang dikirim app).
- Sesi/code yang dilempar ke APK (`#access_token=...` / `?code=...`) sudah di-handle `src/lib/auth-link.ts`.
- Catatan: Supabase **Edge Function tidak bisa serve HTML** (GET `text/html` ditulis ulang jadi `text/plain` + CSP `sandbox` oleh gateway) — makanya jangan coba pendekatan halaman-jembatan di sana.

### Cara pasang di Supabase Dashboard

1. Buka **Supabase Dashboard > Authentication > Email Templates**
2. Untuk tiap template (Confirm signup, Change Email, Recovery, Magic Link, Invite):
   - Copy **seluruh isi** file HTML yang sesuai di folder ini
   - Paste ke editor template di dashboard (tab **HTML**)
   - Sesuaikan **Subject** sesuai komentar di baris pertama file
   - **Save**
3. Pastikan **Authentication > URL Configuration**:
   - Site URL: bebas (mis. `https://vzigxwjgytbwhwtcrcxr.supabase.co` atau Drive URL) — jangan pakai `secaling://`
   - **Additional Redirect URLs** harus ada:
     - `secaling://auth/callback`
     - `secaling://`
   - Kalau kosong, Supabase fallback ke Site URL dan deep-link gagal (gejala klik link tidak terjadi apa-apa / buka localhost).

### Daftar file

| File | Template Dashboard | `type=` |
|------|-------------------|---------|
| `01-confirm-signup.html` | Confirm signup | `signup` |
| `02-change-email.html` | Change Email Address | `email_change` |
| `03-recovery.html` | Reset Password | `recovery` |
| `04-magic-link.html` | Magic Link | `magiclink` |
| `05-invite-user.html` | Invite User | `invite` |

Contoh baris kunci di HTML:
```html
<a href="{{ .ConfirmationURL }}">Konfirmasi Email</a>
```
Ganti `type=` sesuai tabel.

### Ganti Email 1-klik (tanpa ribet 2 email)

Supabase default `Secure email change = ON` → kirim 2 email (lama+baru) dan butuh 2 klik. Biar cukup 1 klik di email baru saja:

1. Buka **Supabase Dashboard > Authentication > Configuration > Email**
2. Cari toggle **"Secure email change"** / **"Double confirm email changes"** → **MATIKAN (OFF)**
3. Save. Sekarang `02-change-email.html` cuma kirim ke email baru, 1 klik langsung berganti.

Kalau toggle dibiarkan ON, warga harus klik di kedua kotak masuk (lama & baru) baru ganti. Template sudah di-update untuk mode 1-klik.

### Verifikasi

- Kirim test signUp → cek Gmail di HP → ketuk tombol → APK terbuka langsung (303 dari endpoint verify, tanpa halaman perantara) → sesi/code di-handle `src/lib/auth-link.ts` → `auth/callback.tsx` → masuk Beranda.
- Tes endpoint langsung (tanpa token asli): `curl -i "https://vzigxwjgytbwhwtcrcxr.supabase.co/auth/v1/verify?token=123456&type=signup&redirect_to=secaling://auth/callback"` → harus **303** dengan `Location: secaling://auth/callback#...` (bukti allowlist + custom scheme lolos).
- Jika APK tidak terbuka, cek `adb logcat | grep "secaling.*tautan-auth"` dan pastikan intent-filter ada (`android/app/src/main/AndroidManifest.xml` + `app.json:android.intentFilters`).

### Warna & brand

- Primary `#047857` (hijau Secaling), background `#ECF2EE`, card putih `#FFFFFF`.
- Kalau mau ganti, edit `background`/`color` inline di HTML.
