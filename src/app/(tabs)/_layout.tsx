import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/ui/floating-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="lapor" options={{ title: 'Lapor' }} />
      <Tabs.Screen name="pengumuman" options={{ title: 'Pengumuman' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}