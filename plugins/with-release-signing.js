const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Plugin: penandatanganan APK release memakai keystore sendiri.
 *
 * MASALAH YANG DISELESAIKAN
 *   `expo prebuild` menghasilkan `android/app/build.gradle` dengan baris:
 *
 *       release {
 *           signingConfig signingConfigs.debug   // <- kunci debug!
 *       }
 *
 *   APK yang ditandatangani kunci debug tidak layak dibagikan: kunci itu sama
 *   untuk semua proyek React Native di dunia, jadi siapa pun bisa membuat
 *   "pembaruan" yang dianggap Android sebagai app yang sama.
 *
 *   Menyunting `build.gradle` dengan tangan tidak bertahan, karena folder
 *   `android/` dibuat ulang setiap prebuild dan diabaikan git. Plugin ini
 *   menerapkan perubahan itu otomatis di setiap prebuild.
 *
 * DI MANA KATA SANDI DISIMPAN
 *   BUKAN di berkas ini, dan bukan di dalam proyek. Nilainya dibaca dari
 *   properti Gradle yang ditaruh di `~/.gradle/gradle.properties` — di luar
 *   folder proyek, jadi mustahil ikut ter-commit walau `.gitignore` lupa
 *   diperbarui.
 *
 *   Properti yang dicari:
 *     SECALING_STORE_FILE      nama berkas keystore, mis. secaling.jks
 *     SECALING_STORE_PASSWORD
 *     SECALING_KEY_ALIAS
 *     SECALING_KEY_PASSWORD
 *
 * KALAU PROPERTI ITU BELUM ADA
 *   Build release tetap jalan memakai kunci debug, seperti perilaku bawaan
 *   Expo. Ini disengaja: pengembang lain yang menyalin proyek ini tidak
 *   langsung kena error yang membingungkan. Peringatan dicetak saat prebuild
 *   supaya tidak diam-diam terlewat.
 */

const BLOK_LAMA = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const CONFIG_BARU = `        // Ditambahkan oleh plugins/with-release-signing.js
        // Kata sandi dibaca dari ~/.gradle/gradle.properties, bukan dari proyek.
        release {
            if (project.hasProperty('SECALING_STORE_FILE')) {
                storeFile file(SECALING_STORE_FILE)
                storePassword SECALING_STORE_PASSWORD
                keyAlias SECALING_KEY_ALIAS
                keyPassword SECALING_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let isi = cfg.modResults.contents;

    // 1. Tambahkan signingConfigs.release di sebelah yang debug.
    if (!isi.includes('SECALING_STORE_FILE')) {
      const penanda = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

      if (!isi.includes(penanda)) {
        throw new Error(
          'with-release-signing: blok signingConfigs.debug tidak ditemukan di ' +
            'build.gradle. Kemungkinan format keluaran prebuild berubah — ' +
            'periksa plugin ini sebelum merilis.'
        );
      }

      isi = isi.replace(penanda, `${penanda}\n${CONFIG_BARU}`);
    }

    // 2. Arahkan buildTypes.release ke kunci sendiri, bukan kunci debug.
    if (!isi.includes(BLOK_LAMA)) {
      throw new Error(
        'with-release-signing: blok buildTypes.release yang diharapkan tidak ' +
          'ditemukan. Jangan rilis APK sebelum ini diperiksa — APK bisa ' +
          'tertandatangani kunci debug tanpa peringatan.'
      );
    }

    isi = isi.replace(
      BLOK_LAMA,
      `        release {
            // Pakai kunci sendiri kalau tersedia; kalau tidak, jatuh ke kunci
            // debug seperti perilaku bawaan Expo.
            signingConfig project.hasProperty('SECALING_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`
    );

    cfg.modResults.contents = isi;
    return cfg;
  });
};
