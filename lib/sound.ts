import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { haptic } from './haptics';

let ringInterval: any = null;
let audioCtx: any = null;

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
  } catch (e) {
    // AudioContext blocked or unavailable
  }
}

/**
 * Triggers an immediate native notification with audible alert sound.
 */
async function triggerAudioNotification(petName: string, ticketNumber: string, room: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 NOW CALLING: ${petName}!`,
        body: `Ticket ${ticketNumber} is now being called! Please proceed to ${room || 'Consultation Desk 1'}.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  } catch {
    // Ignore notification errors in dev
  }
}

/**
 * Starts continuous ringing (vibration pattern + clinic chime sound) for when the pet is called.
 */
export function startQueueRing(
  petName: string,
  ticketNumber: string,
  room = 'Consultation Desk 1',
) {
  stopQueueRing();

  // 1. Initial haptic & notification
  haptic.success();
  void triggerAudioNotification(petName, ticketNumber, room);

  // 2. Play first chime
  playWebChime();

  // 3. Vibration pattern: [wait 0ms, vibrate 500ms, wait 250ms, vibrate 500ms, wait 250ms, vibrate 700ms]
  Vibration.vibrate([0, 500, 250, 500, 250, 700], true);

  // 4. Repeat chime every 2.4 seconds
  ringInterval = setInterval(() => {
    playWebChime();
    haptic.success();
  }, 2400);
}

/**
 * Silences and stops the ringing once acknowledged.
 */
export function stopQueueRing() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  Vibration.cancel();
}
