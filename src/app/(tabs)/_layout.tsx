import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/ui/floating-tab-bar';

/**
 * Tiga tab, bukan empat.
 *
 * "Lapor" sudah dipindah keluar dari kelompok tab menjadi halaman penuh
 * (`app/lapor.tsx`). Alasannya: menulis laporan butuh layar seluas mungkin, dan
 * bilah tab di bawah memakan ruang tepat ketika papan tombol sudah menutupi
 * separuh layar. Tombol tengah di bilah tab tetap ada — sekarang ia menavigasi
 * ke halaman itu, bukan berpindah tab.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
      /**
       * `backBehavior: 'initialRoute'` membuat tombol kembali HP dari tab mana
       * pun kembali ke Beranda dulu, baru keluar app kalau ditekan lagi di
       * Beranda. Ini pola yang dipakai WhatsApp dan Instagram, jadi warga sudah
       * terbiasa. Bawaannya `firstRoute` yang perilakunya mirip, tapi ditulis
       * tegas di sini supaya tidak berubah kalau bawaan pustaka berubah.
       */
      backBehavior="initialRoute"
      tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="pengumuman" options={{ title: 'Pengumuman' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
