import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  notificationService,
  reminderEngine,
  SafePermissionStatus,
} from '@services/notifications';
import { useDataStore } from '@store/useDataStore';
import { useAuthStore } from '@store/useAuthStore';
import { useUser } from '@clerk/expo';

const PREFS_STORAGE_KEY = 'syncvet.notification_preferences';

export function useNotificationPreferences() {
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((state) => state.user);
  const ownerId = authUser?.id || clerkUser?.id || 'resident';

  const pets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [permissionStatus, setPermissionStatus] = useState<SafePermissionStatus>(
    SafePermissionStatus.UNDETERMINED,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load preferences from AsyncStorage
  const loadPreferences = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        setPreferences({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...JSON.parse(raw),
        });
      }
    } catch {
      setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check current OS notification permission
  const checkPermissions = useCallback(async () => {
    const status = await notificationService.getPermissionStatus();
    setPermissionStatus(status);
  }, []);

  useEffect(() => {
    loadPreferences();
    checkPermissions();
  }, [loadPreferences, checkPermissions]);

  // Save updated preferences & trigger reconciliation
  const updatePreference = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      const updated = {
        ...preferences,
        [key]: value,
      };
      setPreferences(updated);
      await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));

      // Reconcile reminders with updated preferences
      await reminderEngine.reconcile(pets, appointments, updated, ownerId);
    },
    [preferences, pets, appointments, ownerId],
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermissions();
    await checkPermissions();
    if (granted) {
      await reminderEngine.reconcile(pets, appointments, preferences, ownerId);
    }
    return granted;
  }, [checkPermissions, pets, appointments, preferences, ownerId]);

  const reconcileReminders = useCallback(async () => {
    return await reminderEngine.reconcile(pets, appointments, preferences, ownerId);
  }, [pets, appointments, preferences, ownerId]);

  return {
    preferences,
    isLoading,
    permissionStatus,
    isGranted: permissionStatus === SafePermissionStatus.GRANTED,
    updatePreference,
    requestPermission,
    reconcileReminders,
  };
}
