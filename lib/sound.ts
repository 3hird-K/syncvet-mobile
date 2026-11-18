import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { haptic } from './haptics';

export const QUEUE_CALL_CHANNEL_ID = 'queue-calls';
export const QUEUE_CALL_CATEGORY_ID = 'queuecall';
export const QUEUE_CALL_CHIME_ACTION = 'queue_hear_chime';
export const QUEUE_CALL_ACKNOWLEDGE_ACTION = 'queue_acknowledge';

const CHIME_COUNT = 8;
const CHIME_GAP_MS = 900;

let ringInterval: ReturnType<typeof setInterval> | null = null;
let chimeTimers: ReturnType<typeof setTimeout>[] = [];
let scheduledNotificationIds: string[] = [];
let audioCtx: any = null;
let queueCallSetup: Promise<void> | null = null;

/**
 * Synthesizes an audible clinic queue chime using Web Audio API when available.
 */
export function playWebChime() {
  if (Platform.OS !== 'web' && typeof window === 'undefined') return;

  try {
    const AudioContextClass =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // First Ding (high bell 784 Hz - G5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second Dong (sweet chime 1046 Hz - C6)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.22);
    gain2.gain.setValueAtTime(0.4, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.22);
    osc2.stop(now + 0.9);
  } catch {
    // AudioContext blocked or unavailable
  }
}

function ensureQueueCallSetup(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();

  if (!queueCallSetup) {
    queueCallSetup = (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(QUEUE_CALL_CHANNEL_ID, {
            name: 'Clinic Call Alerts',
            description: 'High-priority alerts when your pet is called at the clinic.',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
            enableVibrate: true,
            vibrationPattern: [0, 500, 250, 500, 250, 700],
            lightColor: '#EA580C',
            showBadge: true,
            bypassDnd: true,
          });
        }

        // No dashes in the category identifier — required by expo-notifications.
        await Notifications.setNotificationCategoryAsync(QUEUE_CALL_CATEGORY_ID, [
          {
            identifier: QUEUE_CALL_CHIME_ACTION,
            buttonTitle: 'Hear Chime',
            options: { opensAppToForeground: false },
          },
          {
            identifier: QUEUE_CALL_ACKNOWLEDGE_ACTION,
            buttonTitle: "I'm Going In",
            options: { opensAppToForeground: true },
          },
        ]);
      } catch {
        // Notification channels/categories are best-effort on restricted runtimes.
      }
    })();
  }

  return queueCallSetup;
}

async function canShowNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const perms = await Notifications.getPermissionsAsync();
    return (
      perms.granted ||
      perms.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

function notificationTrigger(seconds: number) {
  return {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
    ...(Platform.OS === 'android' ? { channelId: QUEUE_CALL_CHANNEL_ID } : {}),
  } as any;
}

/** Schedules the 8 audible chimes required by the queue specification. */
async function scheduleQueueChimes(ticketNumber: string, count = CHIME_COUNT) {
  if (!(await canShowNotifications())) return;
  await ensureQueueCallSetup();

  for (let index = 0; index < count; index += 1) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Clinic call chime',
          body: `Ticket ${ticketNumber} is being called.`,
          sound: 'default',
          data: { kind: 'queue-call-chime', ticketNumber },
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: notificationTrigger(index + 1),
      });
      scheduledNotificationIds.push(id);
    } catch {
      // Ignore individual chime scheduling failures.
    }
  }
}

/** Presents the visible, high-priority call notification with replay actions. */
async function triggerQueueCallNotification(
  petName: string,
  ticketNumber: string,
  room: string,
) {
  if (!(await canShowNotifications())) return;
  await ensureQueueCallSetup();

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `NOW CALLING: ${petName}!`,
        body: `Ticket ${ticketNumber} is now being called! Please proceed to ${room || 'Consultation Desk 1'}.`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: QUEUE_CALL_CATEGORY_ID,
        data: {
          kind: 'queue-call',
          ticketNumber,
          petName,
          pathname: '/(main)/appointments',
        },
      },
      trigger: notificationTrigger(1),
    });
    scheduledNotificationIds.push(id);
  } catch {
    // Ignore notification errors in restricted runtimes.
  }
}

/**
 * Starts the queue call alert: 8 chimes, vibration, and a high-priority
 * notification. Call stopQueueRing() when the owner acknowledges.
 */
export function startQueueRing(
  petName: string,
  ticketNumber: string,
  room = 'Consultation Desk 1',
) {
  stopQueueRing();

  haptic.success();
  void triggerQueueCallNotification(petName, ticketNumber, room);
  void scheduleQueueChimes(ticketNumber);

  // Web has no native notification sound channel, so play the chimes here.
  if (Platform.OS === 'web') {
    playWebChime();
    for (let index = 1; index < CHIME_COUNT; index += 1) {
      chimeTimers.push(setTimeout(() => playWebChime(), index * CHIME_GAP_MS));
    }
  }

  Vibration.vibrate([0, 500, 250, 500, 250, 700], true);

  ringInterval = setInterval(() => {
    haptic.success();
    if (Platform.OS === 'web') playWebChime();
  }, 2400);
}

/** Replays a single chime from a toast or notification action. */
export function replayQueueCallChime(ticketNumber = 'Q-001') {
  playWebChime();
  if (Platform.OS !== 'web') {
    void scheduleQueueChimes(ticketNumber, 1);
  }
}

/** Silences and stops the ringing once acknowledged. */
export function stopQueueRing() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }

  chimeTimers.forEach((timer) => clearTimeout(timer));
  chimeTimers = [];

  scheduledNotificationIds.forEach((id) => {
    void Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  });
  scheduledNotificationIds = [];

  Vibration.cancel();
}
