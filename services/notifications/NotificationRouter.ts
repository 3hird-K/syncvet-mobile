import { router } from 'expo-router';
import { ExpoNotificationAdapter } from './ExpoNotificationAdapter';

export class NotificationRouter {
  private static instance: NotificationRouter;
  private responseSubscription: { remove: () => void } | null = null;
  private receivedSubscription: { remove: () => void } | null = null;

  public static getInstance(): NotificationRouter {
    if (!NotificationRouter.instance) {
      NotificationRouter.instance = new NotificationRouter();
    }
    return NotificationRouter.instance;
  }

  /**
   * Sets up notification event listeners.
   */
  public setupListeners(): void {
    if (this.responseSubscription || this.receivedSubscription) {
      return;
    }

    // 1. User tapped on a notification
    this.responseSubscription = ExpoNotificationAdapter.addNotificationResponseReceivedListener(
      (response) => {
        this.handleNotificationTap(response);
      },
    );

    // 2. Notification received while app in foreground
    this.receivedSubscription = ExpoNotificationAdapter.addNotificationReceivedListener(
      (notification) => {
        console.log(
          '[NotificationRouter] Foreground notification received:',
          notification?.request?.content?.title || 'Notification',
        );
      },
    );

    // 3. Handle cold-boot if app opened from a notification
    ExpoNotificationAdapter.getLastNotificationResponseAsync()
      .then((lastResponse) => {
        if (lastResponse) {
          this.handleNotificationTap(lastResponse);
        }
      })
      .catch(() => {});
  }

  /**
   * Handles user tapping on a notification.
   */
  public handleNotificationTap(response: any): void {
    try {
      const data = response?.notification?.request?.content?.data as Record<string, any> | undefined;
      if (!data) return;

      const { pathname, params, petId } = data;

      if (pathname) {
        // Small delay to ensure router is ready
        setTimeout(() => {
          try {
            router.push({
              pathname,
              params: params || (petId ? { id: petId } : undefined),
            } as never);
          } catch (e) {
            console.log('[NotificationRouter] Navigation error:', e);
          }
        }, 150);
      }
    } catch (error) {
      console.log('[NotificationRouter] Error handling notification tap:', error);
    }
  }

  /**
   * Cleans up listeners.
   */
  public cleanup(): void {
    if (this.responseSubscription) {
      this.responseSubscription.remove();
      this.responseSubscription = null;
    }
    if (this.receivedSubscription) {
      this.receivedSubscription.remove();
      this.receivedSubscription = null;
    }
  }
}

export const notificationRouter = NotificationRouter.getInstance();
