import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const isNative = Platform.OS !== 'web';

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotificationsAsync(userId: string) {
  if (!isNative || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Peringatan & Pengumuman',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;

    const { data: existing } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('token', token)
      .maybeSingle();

    if (!existing) {
      await supabase.from('push_tokens').insert({ user_id: userId, token });
    }
    return token;
  } catch {
    return null;
  }
}

export async function unregisterPushNotifications(token: string | null) {
  if (!token) return;
  await supabase.from('push_tokens').delete().eq('token', token);
}

export function useNotificationTap(onTap: (url: string) => void) {
  useEffect(() => {
    if (!isNative) return;

    const response = Notifications.getLastNotificationResponse();
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string') {
      onTap(url);
    }

    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const dataUrl = resp.notification.request.content.data?.url;
      if (typeof dataUrl === 'string') {
        onTap(dataUrl);
      }
    });

    return () => sub.remove();
  }, [onTap]);
}