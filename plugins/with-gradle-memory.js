const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Plugin: setelan memori Gradle untuk laptop dengan RAM terbatas.
 *
 * MASALAH YANG DISELESAIKAN
 *   Build release gagal dengan `Metaspace` pada beberapa tugas sekaligus.
 *   Metaspace adalah bagian memori JVM tempat definisi kelas Java disimpan —
 *   berbeda dari heap yang diatur `-Xmx`. Menaikkan `-Xmx` tidak menolong
 *   sedikit pun kalau yang habis adalah Metaspace.
 *
 *   Nilai bawaan Expo `MaxMetaspaceSize=512m` cukup untuk build debug, tapi
 *   build release memuat jauh lebih banyak kelas: R8/ProGuard, lint, dan
 *   pemroses anotasi berjalan bersamaan. Proyek ini punya 25 paket dengan kode
 *   Android, jadi jumlah kelasnya besar.
 *
 * KENAPA `parallel` DIMATIKAN
 *   `org.gradle.parallel=true` menjalankan beberapa modul sekaligus, dan tiap
 *   pekerja meminta Metaspace sendiri. Di laptop 8 GB itu justru mempercepat
 *   kehabisan memori. Build jadi lebih lambat tapi selesai — lebih baik
 *   daripada cepat tapi gagal di menit ke-11.
 *
 * KENAPA `lintVital` DIMATIKAN
 *   Tiga tugas `lintVitalAnalyzeRelease` ikut gagal karena Metaspace. Tugas itu
 *   memeriksa pustaka pihak ketiga (`react-native-safe-area-context`,
 *   `async-storage`, `masked-view`) — kode yang bukan milik kita dan tidak bisa
 *   kita perbaiki. Melewatinya tidak mengurangi pemeriksaan atas kode sendiri,
 *   yang sudah ditangani `npm run periksa`.
 *
 * KALAU NANTI PINDAH KE LAPTOP DENGAN RAM LEBIH BESAR
 *   Nyalakan kembali `org.gradle.parallel` untuk build yang lebih cepat.
 *   Setelan Metaspace sebaiknya tetap.
 */

/** Nilai yang ingin dipastikan ada di android/gradle.properties. */
const SETELAN = [
  {
    kunci: 'org.gradle.jvmargs',
    nilai: '-Xmx3072m -XX:MaxMetaspaceSize=1536m -XX:+UseG1GC',
    catatan:
      'Metaspace dinaikkan ke 1536m: build release memuat R8, lint, dan pemroses ' +
      'anotasi sekaligus, dan 512m bawaan tidak cukup untuk 25 paket native.',
  },
  {
    kunci: 'org.gradle.parallel',
    nilai: 'false',
    catatan:
      'Dimatikan supaya tiap modul tidak meminta Metaspace sendiri. Lebih lambat, ' +
      'tapi tidak kehabisan memori di laptop 8 GB.',
  },
  {
    kunci: 'org.gradle.daemon',
    nilai: 'false',
    catatan:
      'Daemon menyimpan kelas dari build sebelumnya dan membuat Metaspace menumpuk ' +
      'antar build. Untuk build sesekali, mematikannya lebih andal.',
  },
  {
    kunci: 'android.lintVitalRelease.enabled',
    nilai: 'false',
    catatan:
      'Lint atas pustaka pihak ketiga dilewati — bukan kode kita dan ikut kehabisan ' +
      'Metaspace. Kode sendiri tetap diperiksa lewat `npm run periksa`.',
  },
];

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    let props = cfg.modResults;

    for (const { kunci, nilai, catatan } of SETELAN) {
      // Buang nilai lama supaya tidak ada dua baris dengan kunci sama —
      // Gradle memakai yang terakhir, jadi duplikat bikin bingung saat dibaca.
      props = props.filter((item) => !(item.type === 'property' && item.key === kunci));

      props.push({ type: 'empty' });
      props.push({ type: 'comment', value: ` ${catatan}` });
      props.push({ type: 'property', key: kunci, value: nilai });
    }

    cfg.modResults = props;
    return cfg;
  });
};
