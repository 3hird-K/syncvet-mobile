import { withTimeout } from './asyncUtils';
import { waitForSessionGate } from './sessionGate';
import { useAuthStore } from '@store/useAuthStore';
import { networkService } from '@services/network';

/**
 * One-time cold-start bootstrap.
 *
 * The root layout, the index redirect and the onboarding auto-login check all
 * need the same answer to "does this device already have a session?". If each
 * screen reads the Zustand store at a different moment, a resident with a
 * perfectly valid local session can be sent to the sign-in slide simply because
 * the SecureStore read had not finished yet.
 *
 * Every caller awaits this same promise, so routing decisions are made only
 * after the persisted session gate and the local session have settled.
 */

const RESTORE_TIMEOUT_MS = 5000;
const NETWORK_READY_TIMEOUT_MS = 2500;

let bootstrapPromise: Promise<void> | null = null;

export function bootstrapSession(): Promise<void> {
  if (!bootstrapPromise) {
    const restoreLocalSession = async () => {
      const current = useAuthStore.getState();

      // A login that resolved while we were booting already owns the session.
      if (current.status === 'authenticated' && current.user) return;

      try {
        await withTimeout(
          () => useAuthStore.getState().restoreSession(),
          RESTORE_TIMEOUT_MS,
          'Local session restore timed out',
        );
      } catch (error) {
        console.warn('[sessionBootstrap] Local session restore note:', error);
        const state = useAuthStore.getState();
        if (state.status === 'restoring') {
          useAuthStore.setState({
            status: state.user ? 'authenticated' : 'unauthenticated',
          });
        }
      }
    };

    const waitForNetwork = () =>
      withTimeout(
        () => networkService.waitUntilReady(),
        NETWORK_READY_TIMEOUT_MS,
        'Network check timed out',
      ).catch(() => {});

    bootstrapPromise = Promise.all([
      waitForSessionGate(),
      restoreLocalSession(),
      waitForNetwork(),
    ]).then(() => undefined);
  }

  return bootstrapPromise;
}
