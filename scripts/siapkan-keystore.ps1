# Menyiapkan kunci penandatanganan APK Secaling.
#
# Jalankan sekali saja:
#   pwsh scripts/siapkan-keystore.ps1
#
# APA YANG DILAKUKAN
#   1. Membuat berkas kunci `secaling.jks` di folder proyek
#   2. Mendaftarkan kata sandinya di ~/.gradle/gradle.properties
#   3. Mengingatkan untuk membuat salinan cadangan
#
# KENAPA KATA SANDI DIMINTA DI SINI, BUKAN DITULIS DI BERKAS
#   Kata sandi diketik langsung oleh pemilik proyek dan tidak pernah tampil di
#   layar, tidak masuk riwayat terminal, dan tidak ada di dalam repo. Yang
#   tersimpan hanya di ~/.gradle/gradle.properties — di luar folder proyek, jadi
#   mustahil ikut ter-commit walau .gitignore lupa diperbarui.
#
# KENAPA BERKAS INI PENTING DIJAGA
#   Android memakai kunci ini untuk memastikan pembaruan app berasal dari orang
#   yang sama. Kalau `secaling.jks` hilang, TIDAK ADA cara mengirim pembaruan ke
#   HP warga yang sudah memasang Secaling — mereka harus menghapus dan memasang
#   ulang. Kunci ini tidak bisa dibuat ulang.

$ErrorActionPreference = 'Stop'

$akarProyek = Split-Path -Parent $PSScriptRoot
$berkasKunci = Join-Path $akarProyek 'secaling.jks'
$aliasKunci = 'secaling'
$gradleDir = Join-Path $HOME '.gradle'
$gradleProps = Join-Path $gradleDir 'gradle.properties'

Write-Host ''
Write-Host '=== Menyiapkan kunci penandatanganan Secaling ===' -ForegroundColor Cyan
Write-Host ''

# --- 1. Pastikan keytool ada -------------------------------------------------
$keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
if (-not (Test-Path -LiteralPath $keytool)) {
    $cmd = Get-Command keytool -ErrorAction SilentlyContinue
    if ($cmd) {
        $keytool = $cmd.Source
    }
    else {
        Write-Host 'GAGAL: keytool tidak ditemukan.' -ForegroundColor Red
        Write-Host 'keytool ikut terpasang bersama Android Studio. Pastikan Android Studio'
        Write-Host 'sudah terpasang, lalu jalankan ulang skrip ini.'
        exit 1
    }
}

# --- 2. Jangan pernah menimpa kunci yang sudah ada ---------------------------
#
# Menimpa kunci lama sama dengan kehilangannya. Semua APK yang sudah beredar
# jadi tidak bisa diperbarui. Jadi berhenti di sini, bukan bertanya.
if (Test-Path -LiteralPath $berkasKunci) {
    Write-Host 'Kunci sudah ada, tidak dibuat ulang:' -ForegroundColor Yellow
    Write-Host "  $berkasKunci"
    Write-Host ''
    Write-Host 'Ini disengaja. Membuat kunci baru akan membuat APK yang sudah dibagikan'
    Write-Host 'ke warga tidak bisa diperbarui lagi.'
    Write-Host ''
    Write-Host 'Kalau memang ingin mulai dari nol, pindahkan berkas itu dulu ke tempat'
    Write-Host 'lain (jangan dihapus), baru jalankan skrip ini lagi.'
    exit 0
}

# --- 3. Minta kata sandi -----------------------------------------------------
Write-Host 'Buat kata sandi untuk kunci ini.'
Write-Host 'Ketikan tidak akan terlihat di layar. Catat di tempat aman —'
Write-Host 'kata sandi ini tidak bisa dipulihkan kalau lupa.'
Write-Host ''

$sandi1 = Read-Host -AsSecureString 'Kata sandi (minimal 6 karakter)'
$sandi2 = Read-Host -AsSecureString 'Ulangi kata sandi'

$teks1 = [System.Net.NetworkCredential]::new('', $sandi1).Password
$teks2 = [System.Net.NetworkCredential]::new('', $sandi2).Password

if ($teks1 -ne $teks2) {
    Write-Host ''
    Write-Host 'GAGAL: kedua kata sandi tidak sama. Coba lagi.' -ForegroundColor Red
    exit 1
}

# Batas 6 karakter datang dari keytool sendiri, bukan aturan tambahan.
if ($teks1.Length -lt 6) {
    Write-Host ''
    Write-Host 'GAGAL: kata sandi kurang dari 6 karakter. keytool menolaknya.' -ForegroundColor Red
    exit 1
}

# --- 4. Buat kunci -----------------------------------------------------------
#
# `-dname` diisi di sini supaya keytool tidak bertanya satu per satu soal nama,
# organisasi, dan kota. Isinya tidak pernah dilihat warga.
Write-Host ''
Write-Host 'Membuat kunci...' -ForegroundColor Cyan

$dname = 'CN=Secaling, OU=Keamanan Desa, O=Desa Segoropuro, L=Pasuruan, ST=Jawa Timur, C=ID'

& $keytool -genkeypair `
    -storetype JKS `
    -keystore $berkasKunci `
    -alias $aliasKunci `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -dname $dname `
    -storepass $teks1 `
    -keypass $teks1 2>&1 | Out-Null

if (-not (Test-Path -LiteralPath $berkasKunci)) {
    Write-Host 'GAGAL: kunci tidak terbuat. Coba jalankan ulang.' -ForegroundColor Red
    exit 1
}

Write-Host 'Kunci dibuat.' -ForegroundColor Green

# --- 5. Daftarkan kata sandi di luar folder proyek ---------------------------
if (-not (Test-Path -LiteralPath $gradleDir)) {
    New-Item -ItemType Directory -Path $gradleDir -Force | Out-Null
}

# Gradle butuh garis miring maju, walau di Windows.
$jalurUntukGradle = $berkasKunci.Replace('\', '/')

$barisBaru = @(
    '',
    '# Kunci penandatanganan APK Secaling.',
    '# Ditulis oleh scripts/siapkan-keystore.ps1',
    '# Sengaja di luar folder proyek supaya tidak ikut ter-commit ke git.',
    "SECALING_STORE_FILE=$jalurUntukGradle",
    "SECALING_STORE_PASSWORD=$teks1",
    "SECALING_KEY_ALIAS=$aliasKunci",
    "SECALING_KEY_PASSWORD=$teks1"
)

# Kalau sudah pernah didaftarkan, buang yang lama supaya tidak dobel.
if (Test-Path -LiteralPath $gradleProps) {
    $isiLama = Get-Content -LiteralPath $gradleProps
    $isiBersih = $isiLama | Where-Object { $_ -notmatch '^SECALING_' -and $_ -notmatch 'siapkan-keystore\.ps1' -and $_ -notmatch '^# Kunci penandatanganan APK Secaling' -and $_ -notmatch '^# Sengaja di luar folder proyek' }
    Set-Content -LiteralPath $gradleProps -Value $isiBersih -Encoding utf8
}

Add-Content -LiteralPath $gradleProps -Value $barisBaru -Encoding utf8

Write-Host 'Kata sandi didaftarkan di:' -ForegroundColor Green
Write-Host "  $gradleProps"

# --- 6. Pengingat cadangan ---------------------------------------------------
Write-Host ''
Write-Host '=== WAJIB DIBACA ===' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Salin DUA hal ini ke Google Drive atau flashdisk sekarang:'
Write-Host ''
Write-Host "  1. Berkas : $berkasKunci"
Write-Host '  2. Kata sandi yang baru saja diketik'
Write-Host ''
Write-Host 'Kalau laptop rusak dan tidak ada salinan, APK Secaling yang sudah'
Write-Host 'terpasang di HP warga TIDAK BISA diperbarui lagi. Mereka harus'
Write-Host 'menghapus dan memasang ulang dari awal.'
Write-Host ''
Write-Host 'Setelah itu, buat APK dengan:' -ForegroundColor Cyan
Write-Host '  npm run apk'
Write-Host ''
