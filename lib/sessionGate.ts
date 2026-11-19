import { withTimeout } from './asyncUtils';
import { resetPostAuthRouting } from './authFlowCoordinator';
import { tokenCache } from './tokenCache';
import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';

/** Clerk's Expo client token key. A stale value here makes a fresh sign-in look
 *  like the previous session is still active ("already signed in" /
 *  `session_exists`) after a sign-out that never finished. */
const CLERK_CLIENT_JWT_KEY = '__clerk_client_jwt';

/**
 * Persisted "user intentionally signed out" gate.
 *
 * Clerk can remain signed in on a preview build if its sign-out call never
 * resolves (for example when Clerk never finishes loading). The onboarding and
 * root routes must not resurrect the local session from that stale Clerk state.
 * The flag is cleared only when a brand new session is activated.
 */

let hydrationPromise: Promise<void> | null = null;

/** Read the persisted flag once, before any auto-auth routing decision. */
export function waitForSessionGate(): Promise<void> {
  if (!hydrationPromise) {
    hydrationPromise = withTimeout(
      () => useOnboardingStore.persist.rehydrate(),
      1500,
      'Session gate hydration timed out',
    )
      .catch(() => {})
      .then(() => undefined);
  }
  return hydrationPromise;
}

export function isSignedOutGate(): boolean {
  return useOnboardingStore.getState().signedOut;
}

export function markSignedOut(): void {
  useOnboardingStore.getState().markSignedOut();
}

export function clearSignedOut(): void {
  useOnboardingStore.getState().clearSignedOut();
}

/** Remove Clerk's cached client JWT so the next OAuth flow starts with a new
 *  client instead of inheriting an old session. */
export async function clearClerkClientToken(): Promise<void> {
  if (!tokenCache?.clearToken) return;
  await tokenCache.clearToken(CLERK_CLIENT_JWT_KEY);
}

/**
 * Best-effort Clerk sign-out that never leaves a stale client JWT behind.
 * The token is cleared first so a hung sign-out cannot strand the next login.
 */
export async function clerkSignOutSafely(
  clerkSignOut?: () => Promise<unknown> | unknown,
  timeoutMs = 4000,
): Promise<void> {
  await clearClerkClientToken().catch(() => {});

  if (!clerkSignOut) return;

  try {
    await withTimeout(
      () => Promise.resolve().then(() => clerkSignOut()),
      timeoutMs,
      'Clerk sign-out timed out',
    );
  } catch (error) {
    console.warn('[sessionGate] Clerk sign-out note:', error);
  }
}

/**
 * Complete a sign-out without ever blocking the UI on Clerk.
 *
 * The local session is authoritative for navigation here, so it is cleared
 * first. Clerk sign-out is attempted in the background with a hard deadline;
 * a hung/unavailable Clerk instance must not leave the paw loader on screen or
 * keep the tab navigator mounted.
 */
export async function signOutEverywhere(
  clerkSignOut?: () => Promise<unknown> | unknown,
): Promise<void> {
  resetPostAuthRouting();
  markSignedOut();

  try {
    await useAuthStore.getState().signOut();
  } finally {
    void clerkSignOutSafely(clerkSignOut);
  }
}
