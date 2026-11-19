import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { useAuth, useClerk, useSSO, useUser } from '@clerk/expo';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { isRunningInExpoGo } from 'expo';

import { haptic } from '@lib/haptics';
import { withTimeout } from '@lib/asyncUtils';
import {
  claimPostAuthRouting,
  releasePostAuthRouting,
  resetPostAuthRouting,
} from '@lib/authFlowCoordinator';
import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import {
  clearClerkClientToken,
  clearSignedOut,
  clerkSignOutSafely,
  isSignedOutGate,
} from '@lib/sessionGate';
import { supabase } from '@lib/supabase';
import { isRestrictedStaffRole } from '@services/auth/types';

const CLERK_READY_TIMEOUT_MS = 12000;
const CLERK_READY_POLL_MS = 100;

function buildOAuthRedirectUrl(): string {
  let isExpoGo = false;
  try {
    isExpoGo = isRunningInExpoGo();
  } catch {
    isExpoGo = false;
  }

  if (isExpoGo) {
    const base =
      Constants.linkingUri ||
      `exp://${Platform.OS === 'android' ? '192.168.254.101' : 'localhost'}:8081`;
    return `${base.replace(/\/--\/.*$/, '').replace(/\/$/, '')}/--/sso-callback`;
  }

  return AuthSession.makeRedirectUri({
    scheme: 'syncvet',
    path: 'sso-callback',
  });
}

function isCancellationError(error: any): boolean {
  const message = String(error?.message || error?.errors?.[0]?.message || '').toLowerCase();
  const code = String(error?.code || error?.errors?.[0]?.code || '');

  return (
    code === 'SIGN_IN_CANCELLED' ||
    code === '-5' ||
    message.includes('cancel') ||
    message.includes('dismiss') ||
    message.includes('closed by user')
  );
}

function formatAuthError(error: any): string {
  const code = String(error?.code || error?.errors?.[0]?.code || '');
  const message =
    error?.errors?.[0]?.longMessage ||
    error?.errors?.[0]?.message ||
    error?.message ||
    'Could not sign in with Google. Please try again.';

  return code && !String(message).includes(code) ? `${message} (${code})` : String(message);
}

/** Clerk reports a stale client session as `session_exists` or an
 *  "already signed in" style message after an incomplete sign-out. */
function isAlreadySignedInError(error: any): boolean {
  const code = String(error?.code || error?.errors?.[0]?.code || '').toLowerCase();
  const message = String(
    error?.errors?.[0]?.longMessage ||
      error?.errors?.[0]?.message ||
      error?.message ||
      '',
  ).toLowerCase();

  return (
    code === 'session_exists' ||
    code.includes('already_signed_in') ||
    code.includes('already-signed-in') ||
    message.includes('already signed in') ||
    message.includes('already sign in')
  );
}

function logAuthError(error: any): void {
  console.error('[useGoogleAuth] Google authentication failed:', {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    errors: Array.isArray(error?.errors)
      ? error.errors.map((item: any) => ({
          code: item?.code,
          message: item?.message,
          longMessage: item?.longMessage,
        }))
      : undefined,
  });
}

/**
 * Best-effort cleanup of a browser SSO session.
 *
 * In expo-web-browser v58 `dismissAuthSession()` is only supported on iOS/web.
 * On Android it delegates to `dismissBrowser()`, which is iOS-only and throws a
 * synchronous `UnavailabilityError`. It must therefore be skipped on Android
 * and wrapped in try/catch so cleanup can never turn a successful sign-in into
 * a reported failure.
 */
function dismissBrowserAuthSession(): void {
  if (Platform.OS === 'android') return;

  try {
    if (typeof WebBrowser.dismissAuthSession === 'function') {
      WebBrowser.dismissAuthSession();
    }
  } catch (error) {
    console.warn('[useGoogleAuth] Auth session dismiss note:', error);
  }
}

export interface UseGoogleAuthReturn {
  handleGoogleSignIn: () => Promise<boolean>;
  connecting: boolean;
  error: string | undefined;
  setError: (err: string | undefined) => void;
}

/**
 * Google authentication for SyncVet.
 *
 * Uses Clerk's browser-based Google SSO on every platform. The native in-app
 * picker was removed because on Android it could show an account chooser and
 * then fail, producing a second browser chooser and a duplicated prompt.
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const router = useRouter();
  const { isLoaded: clerkLoaded, signOut: clerkSignOut } = useAuth();
  const clerk = useClerk() as any;
  const { startSSOFlow } = useSSO();
  const { isLoaded: signInLoaded } = useSignIn();
  const { isLoaded: signUpLoaded } = useSignUp();
  const { user: clerkUser } = useUser();

  // `startSSOFlow` closes over the isLoaded values from the render that created
  // it. Holding the latest function in a ref lets us wait for Clerk to finish
  // loading and still call a flow that knows sign-in/sign-up are ready.
  const startSSOFlowRef = useRef(startSSOFlow);
  startSSOFlowRef.current = startSSOFlow;
  const clerkSignOutRef = useRef(clerkSignOut);
  clerkSignOutRef.current = clerkSignOut;
  const setActiveRef = useRef(clerk?.setActive);
  setActiveRef.current = clerk?.setActive;
  const signInLoadedRef = useRef(signInLoaded);
  signInLoadedRef.current = signInLoaded;
  const signUpLoadedRef = useRef(signUpLoaded);
  signUpLoadedRef.current = signUpLoaded;

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const isClerkReady = useCallback(() => {
    const instanceReady = Boolean(clerk) && (clerk.loaded === true || clerkLoaded);
    return Boolean(
      instanceReady && signInLoadedRef.current && signUpLoadedRef.current,
    );
  }, [clerk, clerkLoaded]);

  const waitForClerkReady = useCallback(async () => {
    if (isClerkReady()) return;

    const startedAt = Date.now();
    while (Date.now() - startedAt < CLERK_READY_TIMEOUT_MS) {
      await new Promise<void>((resolve) => setTimeout(resolve, CLERK_READY_POLL_MS));
      if (isClerkReady()) return;
    }

    console.error('[useGoogleAuth] Clerk readiness timeout', {
      clerkLoaded,
      clerkInstanceLoaded: clerk?.loaded,
      signInLoaded: signInLoadedRef.current,
      signUpLoaded: signUpLoadedRef.current,
    });

    const notReadyError: any = new Error(
      'Sign-in services did not finish loading. Please reopen the app and try again.',
    );
    notReadyError.code = 'CLERK_NOT_READY';
    throw notReadyError;
  }, [clerk, clerkLoaded, isClerkReady]);

  const handlePostAuthRouting = useCallback(
    async (
      signUpFlow: any,
      signInFlow: any,
      clerkUser?: any,
    ) => {
      const userId =
        clerkUser?.id ||
        signInFlow?.createdUserId ||
        signUpFlow?.createdUserId ||
        signInFlow?.userData?.id;

      // The sso-callback route may already be handling this exact session.
      if (userId && !claimPostAuthRouting(userId)) {
        useAuthStore.getState().setAuthLoading(false);
        setConnecting(false);
        return;
      }

      try {
        useOnboardingStore.getState().setCompleted();

        const clerkEmail =
          signUpFlow?.emailAddress ??
          signInFlow?.identifier ??
          clerkUser?.primaryEmailAddress?.emailAddress ??
          '';

        const firstName =
          signUpFlow?.firstName ||
          signInFlow?.userData?.firstName ||
          clerkUser?.firstName ||
          '';
        const lastName =
          signUpFlow?.lastName ||
          signInFlow?.userData?.lastName ||
          clerkUser?.lastName ||
          '';

        const clerkName =
          firstName && lastName
            ? `${firstName} ${lastName}`.trim()
            : firstName || (clerkEmail ? clerkEmail.split('@')[0] : 'Resident');

        const photoUrl =
          signUpFlow?.imageUrl ||
          signInFlow?.userData?.imageUrl ||
          clerkUser?.imageUrl;

        await useAuthStore.getState().googleSignIn({
          id: userId,
          email: clerkEmail || 'user@syncvet.app',
          fullName: clerkName || 'SyncVet Resident',
          photoUrl,
        });

        // Profile enrichment is best-effort. A slow Supabase/Clerk lookup must
        // never be the reason the paw loader stays on screen.
        let liveDbUser: any = null;
        if (userId) {
          try {
            await withTimeout(
              async () => {
                const { data } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', userId)
                  .maybeSingle();
                liveDbUser = data;

                if (!liveDbUser) {
                  const { data: insertedUser } = await supabase
                    .from('users')
                    .insert({
                      id: userId,
                      email: clerkEmail || `${userId}@resident.syncvet.app`,
                      full_name: clerkName,
                      first_name: firstName || null,
                      last_name: lastName || null,
                      avatar_url: photoUrl || null,
                      role: 'Pet Owner',
                      profile_completed: false,
                      updated_at: new Date().toISOString(),
                    })
                    .select('*')
                    .maybeSingle();
                  liveDbUser = insertedUser;
                }
              },
              4000,
              'Supabase profile lookup timed out',
            );
          } catch (err) {
            console.warn('[useGoogleAuth] Supabase profile sync note:', err);
          }
        }

        if (liveDbUser) {
          // Keep the values hydrated by googleSignIn() when the DB columns are
          // empty (older rows store phone/address in raw_user_meta_data).
          // Wiping them here would make a completed resident look incomplete
          // and flash the registration screen before the redirect to main.
          const dbMeta = (liveDbUser.raw_user_meta_data as any) || {};
          const hydratedUser = useAuthStore.getState().user;
          const fullUser = {
            id: liveDbUser.id,
            fullName: liveDbUser.full_name || clerkName,
            firstName: liveDbUser.first_name || firstName,
            lastName: liveDbUser.last_name || lastName,
            email: liveDbUser.email || clerkEmail,
            mobileNumber:
              liveDbUser.phone_number ||
              dbMeta.phoneNumber ||
              dbMeta.mobileNumber ||
              hydratedUser?.mobileNumber ||
              '',
            address:
              liveDbUser.address || dbMeta.address || hydratedUser?.address || '',
            photoUrl: liveDbUser.avatar_url || photoUrl,
            authProvider: 'google' as const,
            profileCompleted: Boolean(liveDbUser.profile_completed),
            role: liveDbUser.role || 'resident',
            rawUserMetaData: liveDbUser.raw_user_meta_data || undefined,
            createdAt: liveDbUser.created_at || new Date().toISOString(),
            updatedAt: liveDbUser.updated_at || new Date().toISOString(),
          };
          useAuthStore.setState({
            status: 'authenticated',
            user: fullUser,
            token: `token_${fullUser.id}`,
          });
        } else if (clerkUser) {
          await withTimeout(
            useAuthStore.getState().syncUserFromClerk(clerkUser),
            4000,
            'Clerk profile sync timed out',
          ).catch(() => {});
        }

        const currentUser = useAuthStore.getState().user;

        // Clear the overlay before navigating; the paw loader should never
        // outlive the work it is covering.
        useAuthStore.getState().setAuthLoading(false);
        setConnecting(false);

        if (isRestrictedStaffRole(currentUser?.role)) {
          router.replace('/unauthorized-role');
          return;
        }

        const hasCompletedProfile = Boolean(
          currentUser?.profileCompleted &&
          currentUser?.mobileNumber &&
          currentUser?.address,
        );

        router.replace(hasCompletedProfile ? '/(main)' : '/(register)/owner');
      } catch (err) {
        if (userId) releasePostAuthRouting(userId);
        useAuthStore.getState().setAuthLoading(false);
        setConnecting(false);
        throw err;
      }
    },
    [router],
  );

  const handleGoogleSignIn = useCallback(async (): Promise<boolean> => {
    resetPostAuthRouting();

    try {
      haptic.medium();
      setConnecting(true);
      useAuthStore.getState().setAuthLoading(true);
      setError(undefined);

      // The onboarding screen can be shown before Clerk finishes loading in a
      // preview build. Keep the paw overlay up while we wait instead of failing
      // the tap immediately.
      await waitForClerkReady();

      let authResult: any;

      // If the user signed out in this build, Clerk may still hold the old
      // client in memory even though the local session is gone. Clear it before
      // starting a new browser flow; the deadline keeps the button responsive.
      if (isSignedOutGate()) {
        await clerkSignOutSafely(clerkSignOutRef.current, 2500);
      }

      // Always use Clerk's browser Google SSO. The native in-app picker is
      // intentionally disabled: on Android it could show an account chooser and
      // then fail, causing a second browser chooser to appear.
      await Promise.resolve(WebBrowser.warmUpAsync()).catch(() => {});
      try {
        const ssoParams = {
          strategy: 'oauth_google' as const,
          redirectUrl: buildOAuthRedirectUrl(),
        };

        const startFreshSsoFlow = async () => {
          // A client JWT left over from a previous session is the main cause of
          // "already signed in" / `session_exists` after logout on Expo.
          await clearClerkClientToken().catch(() => {});
          return withTimeout(
            startSSOFlowRef.current(ssoParams),
            25000,
            'Google browser sign-in timed out. Please try again.',
          );
        };

        try {
          authResult = await startFreshSsoFlow();
        } catch (err: any) {
          if (!isAlreadySignedInError(err)) throw err;

          console.warn(
            '[useGoogleAuth] Stale Clerk session detected. Clearing it and retrying once.',
            { code: err?.code, message: err?.message },
          );

          await clerkSignOutSafely(clerkSignOutRef.current);
          await clearClerkClientToken().catch(() => {});
          authResult = await startFreshSsoFlow();
        }
      } finally {
        await Promise.resolve(WebBrowser.coolDownAsync()).catch(() => {});
      }

      const { createdSessionId, signIn, signUp } = authResult ?? {};
      const authSetActive = authResult?.setActive ?? setActiveRef.current;
      const sessionId =
        createdSessionId || signIn?.createdSessionId || signUp?.createdSessionId;

      if (sessionId && authSetActive) {
        await withTimeout(
          authSetActive({ session: sessionId }),
          12000,
          'Clerk session activation timed out',
        );

        // dismissAuthSession() is skipped internally on Android (it throws
        // there), so this cleanup can never break a completed login.
        dismissBrowserAuthSession();

        // A fresh Clerk session supersedes the logout gate.
        clearSignedOut();
        haptic.success();
        await handlePostAuthRouting(signUp, signIn, clerkUser);
        return true;
      }

      return false;
    } catch (err: any) {
      logAuthError(err);

      const rawMsg = formatAuthError(err);

      if (!isCancellationError(err)) {
        setError(rawMsg);
        haptic.error();
      }

      return false;
    } finally {
      // Guarantee the paw overlay is removed on success, cancel, error or timeout.
      setConnecting(false);
      useAuthStore.getState().setAuthLoading(false);
    }
  }, [waitForClerkReady, handlePostAuthRouting, clerkUser]);

  return {
    handleGoogleSignIn,
    connecting,
    error,
    setError,
  };
}
