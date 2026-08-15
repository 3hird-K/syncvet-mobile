import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export enum SafePermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNDETERMINED = 'undetermined',
}

export interface SafeNotificationRequest {
  identifier: string;
  content: {
    title: string;
    body: string;
    data?: Record<string, any>;
    sound?: string | boolean;
    badge?: number;
    categoryIdentifier?: string;
  };
  trigger: {
    type: string;
    date: number;
  };
}

const LOCAL_SCHEDULE_STORAGE_KEY = 'syncvet.scheduled_notifications_fallback';

let nativeNotifications: typeof import('expo-notifications') | null = null;
let isExpoGoAndroid = false;

try {
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === 'expo';

  if (isExpoGo && Platform.OS === 'android') {
    isExpoGoAndroid = true;
    console.log(
      '[ExpoNotificationAdapter] Running in Android Expo Go: Using resilient local reminder scheduler fallback.',
    );
  } else {
    nativeNotifications = require('expo-notifications');
    if (nativeNotifications?.setNotificationHandler) {
      nativeNotifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  }
} catch (error) {
  console.log('[ExpoNotificationAdapter] Native expo-notifications not loaded, using fallback:', error);
  nativeNotifications = null;
}

export const ExpoNotificationAdapter = {
  isNativeAvailable(): boolean {
    return nativeNotifications !== null && !isExpoGoAndroid;
  },

  async setNotificationChannelAsync(
    channelId: string,
    channelOptions: any,
  ): Promise<any | null> {
    if (nativeNotifications && !isExpoGoAndroid && Platform.OS === 'android') {
      try {
        return await nativeNotifications.setNotificationChannelAsync(channelId, channelOptions);
      } catch (e) {
        console.log('[ExpoNotificationAdapter] setNotificationChannelAsync error:', e);
      }
    }
    return null;
  },

  async getPermissionsAsync(): Promise<{ status: SafePermissionStatus }> {
    if (nativeNotifications && !isExpoGoAndroid) {
      try {
        const res = await nativeNotifications.getPermissionsAsync();
        return { status: res.status as unknown as SafePermissionStatus };
      } catch (e) {
        console.log('[ExpoNotificationAdapter] getPermissionsAsync error:', e);
      }
    }
    // In Expo Go fallback, default to granted for smooth local testing
    return { status: SafePermissionStatus.GRANTED };
  },

  async requestPermissionsAsync(options?: any): Promise<{ status: SafePermissionStatus }> {
    if (nativeNotifications && !isExpoGoAndroid) {
      try {
        const res = await nativeNotifications.requestPermissionsAsync(options);
        return { status: res.status as unknown as SafePermissionStatus };
      } catch (e) {
        console.log('[ExpoNotificationAdapter] requestPermissionsAsync error:', e);
      }
    }
    return { status: SafePermissionStatus.GRANTED };
  },

  async scheduleNotificationAsync(request: {
    identifier: string;
    content: {
      title: string;
      body: string;
      data?: Record<string, any>;
      sound?: string | boolean;
      badge?: number;
      categoryIdentifier?: string;
      channelId?: string;
    };
    trigger: {
      type?: any;
      date: number;
    };
  }): Promise<string> {
    if (nativeNotifications && !isExpoGoAndroid) {
      try {
        return await nativeNotifications.scheduleNotificationAsync({
          identifier: request.identifier,
          content: request.content,
          trigger: {
            type: nativeNotifications.SchedulableTriggerInputTypes.DATE,
            date: request.trigger.date,
          },
        });
      } catch (e) {
        console.log('[ExpoNotificationAdapter] Native schedule failed, falling back:', e);
      }
    }

    // Persistent fallback scheduler for Expo Go & environments without native notification service
    try {
      const raw = await AsyncStorage.getItem(LOCAL_SCHEDULE_STORAGE_KEY);
      const list: SafeNotificationRequest[] = raw ? JSON.parse(raw) : [];
      const updated = list.filter((item) => item.identifier !== request.identifier);
      updated.push({
        identifier: request.identifier,
        content: request.content,
        trigger: {
          type: 'date',
          date: request.trigger.date,
        },
      });
      await AsyncStorage.setItem(LOCAL_SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    return request.identifier;
  },

  async cancelScheduledNotificationAsync(identifier: string): Promise<void> {
    if (nativeNotifications && !isExpoGoAndroid) {
      try {
        await nativeNotifications.cancelScheduledNotificationAsync(identifier);
      } catch (e) {
        console.log('[ExpoNotificationAdapter] cancelScheduledNotificationAsync error:', e);
      }
    }

    try {
      const raw = await AsyncStorage.getItem(LOCAL_SCHEDULE_STORAGE_KEY);
      if (raw) {
        const list: SafeNotificationRequest[] = JSON.parse(raw);
        const updated = list.filter((item) => item.identifier !== identifier);
        await AsyncStorage.setItem(LOCAL_SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  async getAllScheduledNotificationsAsync(): Promise<SafeNotificationRequest[]> {
    if (nativeNotifications && !isExpoGoAndroid) {
      try {
        const list = await nativeNotifications.getAllScheduledNotificationsAsync();
        return list.map((item: any) => ({
          identifier: item.identifier,
          content: {
            title: item.content?.title || '',
            body: item.content?.body || '',
            data: item.content?.data,
            sound: item.content?.sound,
            badge: item.content?.badge,
            categoryIdentifier: item.content?.categoryIdentifier,
          },
          trigger: {
            type: 'date',
            date: typeof item.trigger?.value === 'number' ? item.trigger.value : Date.now(),
          },
        }));
      } catch (e) {
        console.log('[ExpoNotificationAdapter] getAllScheduledNotificationsAsync error:', e);
      }
    }

    try {
      const raw = await AsyncStorage.getItem(LOCAL_SCHEDULE_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as SafeNotificationRequest[];
      }
    } catch {}

    return [];
  },

  async cancelAllScheduledNotificationsAsync(): Promise<void> {
    if (nativeNotifications && !isExpoGoAndroid) {
      try {
        await nativeNotifications.cancelAllScheduledNotificationsAsync();
      } catch (e) {
        console.log('[ExpoNotificationAdapter] cancelAllScheduledNotificationsAsync error:', e);
      }
    }

    try {
      await AsyncStorage.removeItem(LOCAL_SCHEDULE_STORAGE_KEY);
    } catch {}
  },

  addNotificationResponseReceivedListener(listener: (response: any) => void): { remove: () => void } {
    if (nativeNotifications && !isExpoGoAndroid) {
      try {
        return nativeNotifications.addNotificationResponseReceivedListener(listener);
      } catch (e) {
        console.log('[ExpoNotificationAdapter] addNotificationResponseReceivedListener error:', e);
      }
    }
    return { remove: () => {} };
  },

  addNotificationReceivedListener(listener: (notification: any) => void): { remove: () => void } {
    if (nativeNotifications && !isExpoGoAndroid) {
      try {
        return nativeNotifications.addNotificationReceivedListener(listener);
      } catch (e) {
        console.log('[ExpoNotificationAdapter] addNotificationReceivedListener error:', e);
      }
    }
    return { remove: () => {} };
  },

  async getLastNotificationResponseAsync(): Promise<any | null> {
    if (nativeNotifications && !isExpoGoAndroid) {
      try {
        return await nativeNotifications.getLastNotificationResponseAsync();
      } catch (e) {
        console.log('[ExpoNotificationAdapter] getLastNotificationResponseAsync error:', e);
      }
    }
    return null;
  },
};
