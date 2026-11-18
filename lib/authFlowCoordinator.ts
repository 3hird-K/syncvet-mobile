/**
 * Google SSO resolves in two places at once in a native build:
 *   1. the `startSSOFlow()` promise on the onboarding screen, and
 *   2. the `syncvet://sso-callback` route opened by the browser redirect.
 *
 * Both must not write the local session and navigate. Whichever arrives first
 * claims the session id; the other one backs off.
 */
let claimedSessionId: string | null = null;

export function resetPostAuthRouting(): void {
  claimedSessionId = null;
}

export function claimPostAuthRouting(sessionId: string | null | undefined): boolean {
  if (!sessionId) return true;
  if (claimedSessionId === sessionId) return false;
  claimedSessionId = sessionId;
  return true;
}

export function releasePostAuthRouting(sessionId: string | null | undefined): void {
  if (!sessionId) return;
  if (claimedSessionId === sessionId) claimedSessionId = null;
}
