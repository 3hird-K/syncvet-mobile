import { Platform } from 'react-native';
import type { ReminderPayload } from './types';
import {
  ExpoNotificationAdapter,
  SafePermissionStatus,
  type SafeNotificationRequest,
} from './ExpoNotificationAdapter';

export { SafePermissionStatus };

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initializes notification channels for Android and checks initial permissions.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }

    this.isInitialized = true;
  }

  /**
   * Creates categorized Android notification channels.
   */
  public async setupAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      await ExpoNotificationAdapter.setNotificationChannelAsync('appointments', {
        name: 'Appointment Reminders',
        description: 'Notifications for upcoming City Veterinary Office visits and bookings.',
        importance: 4, // HIGH
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00A896',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      await ExpoNotificationAdapter.setNotificationChannelAsync('pet-health', {
        name: 'Pet Health & Vaccines',
        description: 'Immunization due dates, booster shots, and clinical health milestones.',
        importance: 4, // HIGH
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00A896',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      await ExpoNotificationAdapter.setNotificationChannelAsync('system', {
        name: 'Data & Sync Alerts',
        description: 'Offline sync status and cloud data reconciliation notices.',
        importance: 3, // DEFAULT
        sound: 'default',
        showBadge: false,
      });

      await ExpoNotificationAdapter.setNotificationChannelAsync('general', {
        name: 'General Notices',
        description: 'Municipal announcements and community veterinary health campaigns.',
        importance: 3, // DEFAULT
        sound: 'default',
        showBadge: true,
      });
    } catch (error) {
      console.log('[NotificationService] Failed to set up Android channels:', error);
    }
  }

  /**
   * Checks current permission status.
   */
  public async getPermissionStatus(): Promise<SafePermissionStatus> {
    try {
      const settings = await ExpoNotificationAdapter.getPermissionsAsync();
      return settings.status;
    } catch {
      return SafePermissionStatus.UNDETERMINED;
    }
  }

  /**
   * Requests native notification permissions from the user.
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await ExpoNotificationAdapter.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      return status === SafePermissionStatus.GRANTED;
    } catch (error) {
      console.log('[NotificationService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Schedules a single deterministic reminder with the OS.
   * If scheduled time is in the past, scheduling is safely skipped.
   */
  public async scheduleReminder(reminder: ReminderPayload): Promise<string | null> {
    try {
      const triggerTime = new Date(reminder.scheduledAt).getTime();
      const now = Date.now();

      // Only schedule if scheduled date/time is in the future (at least 5s ahead)
      if (triggerTime <= now + 5000) {
        return null;
      }

      const status = await this.getPermissionStatus();
      if (status !== SafePermissionStatus.GRANTED) {
        return null;
      }

      const identifier = await ExpoNotificationAdapter.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: reminder.title,
          body: reminder.body,
          data: reminder.data,
          sound: 'default',
          badge: 1,
          categoryIdentifier: reminder.channelId,
          channelId: reminder.channelId,
        },
        trigger: {
          date: triggerTime,
        },
      });

      return identifier;
    } catch (error) {
      console.log(`[NotificationService] Error scheduling ${reminder.id}:`, error);
      return null;
    }
  }

  /**
   * Cancels a scheduled notification by its unique reminder identifier.
   */
  public async cancelReminder(reminderId: string): Promise<void> {
    try {
      await ExpoNotificationAdapter.cancelScheduledNotificationAsync(reminderId);
    } catch (error) {
      console.log(`[NotificationService] Error cancelling ${reminderId}:`, error);
    }
  }

  /**
   * Cancels all scheduled notifications associated with a specific entity (e.g. cancelled appointment or deleted pet).
   */
  public async cancelRemindersForEntity(entityId: string): Promise<void> {
    try {
      const allScheduled = await ExpoNotificationAdapter.getAllScheduledNotificationsAsync();
      const toCancel = allScheduled.filter((n) => {
        const data = n.content.data as Record<string, any> | undefined;
        return data?.sourceId === entityId || data?.petId === entityId;
      });

      await Promise.all(
        toCancel.map((n) =>
          ExpoNotificationAdapter.cancelScheduledNotificationAsync(n.identifier),
        ),
      );
    } catch (error) {
      console.log(`[NotificationService] Error cancelling for entity ${entityId}:`, error);
    }
  }

  /**
   * Retrieves all scheduled notifications from the operating system or persistent fallback.
   */
  public async getAllScheduled(): Promise<SafeNotificationRequest[]> {
    try {
      return await ExpoNotificationAdapter.getAllScheduledNotificationsAsync();
    } catch {
      return [];
    }
  }

  /**
   * Cancels all scheduled notifications.
   */
  public async cancelAll(): Promise<void> {
    try {
      await ExpoNotificationAdapter.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.log('[NotificationService] Error cancelling all notifications:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();
