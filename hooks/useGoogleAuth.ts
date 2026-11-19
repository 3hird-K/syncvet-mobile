import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { useAuth, useClerk, useSSO, useUser } from '@clerk/expo';
import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';

import { haptic } from '@lib/haptics';
import { withTimeout } from '@lib/asyncUtils';
import {
  claimPostAuthRouting,
  releasePostAuthRouting,
  resetPostAuthRouting,
} from '@lib/authFlowCoordinator';
import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { supabase } from '@lib/supabase';
import { isRestrictedStaffRole } from '@services/auth/types';

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

const NATIVE_GOOGLE_MODULE_UNAVAILABLE = 'NATIVE_GOOGLE_MODULE_UNAVAILABLE';

type NativeGoogleCredentialResponse =
  | { type: 'success'; data: { idToken: string; user?: unknown } }
  | { type: 'cancelled' | 'noSavedCredentialFound'; data: null };

type NativeGoogleSignInModule = {
  configure(params: { webClientId: string; autoSelectEnabled?: boolean }): void;
  presentExplicitSignIn(params: {
    nonce: string;
  }): Promise<NativeGoogleCredentialResponse>;
};

function getGoogleWebClientId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID
  );
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
  if (error?.message === NATIVE_GOOGLE_MODULE_UNAVAILABLE) {
    return 'Google sign-in is not available in this build. Please reinstall the app.';
  }

  const code = String(error?.code || error?.errors?.[0]?.code || '');
  const message =
    error?.errors?.[0]?.longMessage ||
    error?.errors?.[0]?.message ||
    error?.message ||
    'Could not sign in with Google. Please try again.';

  return code && !String(message).includes(code) ? `${message} (${code})` : String(message);
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
 * Native builds use Clerk's native Google One Tap flow, which does not depend
 * on a web browser or an app-switching redirect. The browser-based SSO flow is
 * kept as a fallback for web and for devices where the native module is absent.
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const router = useRouter();
  const { isLoaded: clerkLoaded } = useAuth();
  const { setActive, client } = useClerk() as any;
  // Use the same legacy client resources Clerk's native Google hook uses.
  // The Core 3 `useSignIn()`/`useSignUp()` hooks do not support
  // `strategy: 'google_one_tap'`.
  const signInResource = client?.signIn;
  const signUpResource = client?.signUp;
  const { startSSOFlow } = useSSO();
  const { user: clerkUser } = useUser();

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | undefined>();

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
          const fullUser = {
            id: liveDbUser.id,
            fullName: liveDbUser.full_name || clerkName,
            firstName: liveDbUser.first_name || firstName,
            lastName: liveDbUser.last_name || lastName,
            email: liveDbUser.email || clerkEmail,
            mobileNumber: liveDbUser.phone_number || '',
            address: liveDbUser.address || '',
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

  /**
   * Runs the native Google account picker directly instead of going through a
   * browser redirect. Keeping the picker and the Clerk token exchange separate
   * lets us report exactly which step failed.
   */
  const getNativeGoogleIdToken = useCallback(async (): Promise<string | null> => {
    const nativeModule =
      requireOptionalNativeModule<NativeGoogleSignInModule>('ClerkGoogleSignIn');

    if (!nativeModule) {
      throw new Error(NATIVE_GOOGLE_MODULE_UNAVAILABLE);
    }

    const webClientId = getGoogleWebClientId();
    if (!webClientId) {
      throw new Error(
        'Google Sign-In is missing its web client ID. Rebuild the app after configuring Clerk.',
      );
    }

    nativeModule.configure({ webClientId, autoSelectEnabled: false });
    const nonce = Crypto.randomUUID();

    console.log('[useGoogleAuth] Native Google picker opening');

    try {
      const response = await withTimeout(
        nativeModule.presentExplicitSignIn({ nonce }),
        60000,
        'Google sign-in was not completed. Choose an account and continue.',
      );

      console.log('[useGoogleAuth] Native Google picker result:', response?.type);

      if (response?.type === 'success' && response.data?.idToken) {
        return response.data.idToken;
      }

      if (
        response?.type === 'cancelled' ||
        response?.type === 'noSavedCredentialFound'
      ) {
        return null;
      }

      throw new Error('Google sign-in did not return an account.');
    } catch (pickerError: any) {
      if (isCancellationError(pickerError)) return null;

      console.error('[useGoogleAuth] Native Google picker failed:', pickerError);
      throw pickerError;
    }
  }, []);

  const exchangeGoogleTokenWithClerk = useCallback(
    async (idToken: string) => {
      if (!signInResource || !signUpResource) {
        throw new Error('Clerk sign-in is still preparing. Please try again.');
      }

      let createdSessionId: string | null = null;

      try {
        console.log('[useGoogleAuth] Exchanging Google token with Clerk');
        await withTimeout(
          signInResource.create({ strategy: 'google_one_tap', token: idToken }),
          20000,
          'Google account verification timed out. Please try again.',
        );

        if (signInResource.firstFactorVerification?.status === 'transferable') {
          console.log('[useGoogleAuth] Transferring Google account to sign-up');
          await withTimeout(
            signUpResource.create({ transfer: true }),
            20000,
            'Google account transfer timed out. Please try again.',
          );
          createdSessionId = signUpResource.createdSessionId ?? null;
        } else {
          createdSessionId = signInResource.createdSessionId ?? null;
        }
      } catch (clerkError: any) {
        const isNewAccount = Boolean(
          (Array.isArray(clerkError?.errors) &&
            clerkError.errors.some(
              (item: any) => item?.code === 'external_account_not_found',
            )) ||
            clerkError?.code === 'external_account_not_found',
        );

        if (!isNewAccount) {
          console.error('[useGoogleAuth] Clerk Google token exchange failed:', clerkError);
          throw clerkError;
        }

        console.log('[useGoogleAuth] Creating a new Clerk user from Google account');
        await withTimeout(
          signUpResource.create({ strategy: 'google_one_tap', token: idToken }),
          20000,
          'Google account registration timed out. Please try again.',
        );
        createdSessionId = signUpResource.createdSessionId ?? null;
      }

      if (!createdSessionId) {
        throw new Error('Clerk did not create a session for this Google account.');
      }

      return { createdSessionId, signIn: signInResource, signUp: signUpResource };
    },
    [signInResource, signUpResource],
  );

  const handleGoogleSignIn = useCallback(async (): Promise<boolean> => {
    resetPostAuthRouting();

    if (!clerkLoaded) {
      setError('Google sign-in is still preparing. Please try again in a moment.');
      return false;
    }

    try {
      haptic.medium();
      setConnecting(true);
      useAuthStore.getState().setAuthLoading(true);
      setError(undefined);

      let authResult: any = undefined;
      let usedBrowserSSO = false;

      // Native builds: run the in-app Google account picker, then exchange the
      // returned ID token with Clerk. Once the picker opens, never silently
      // switch to the browser flow — that hid the real failure behind the old
      // "took too long to open" timeout.
      if (Platform.OS !== 'web') {
        try {
          const idToken = await getNativeGoogleIdToken();

          // A null token means the chooser was dismissed or no account was
          // selected. That is a user cancellation, not an error.
          if (!idToken) return false;

          authResult = {
            ...(await exchangeGoogleTokenWithClerk(idToken)),
            setActive,
          };
        } catch (nativeError: any) {
          // Only fall back if the native module is genuinely missing (Expo Go,
          // web, or an old build). Any error after the picker opened is real
          // and is surfaced to the user and the logs.
          if (nativeError?.message !== NATIVE_GOOGLE_MODULE_UNAVAILABLE) {
            throw nativeError;
          }
          authResult = undefined;
        }
      }

      // Web, Expo Go, or devices without the native Google module.
      if (!authResult?.createdSessionId) {
        usedBrowserSSO = true;
        await Promise.resolve(WebBrowser.warmUpAsync()).catch(() => {});
        try {
          authResult = await withTimeout(
            startSSOFlow({
              strategy: 'oauth_google',
              redirectUrl: buildOAuthRedirectUrl(),
            }),
            25000,
            'Google browser sign-in timed out. Please try again.',
          );
        } finally {
          await Promise.resolve(WebBrowser.coolDownAsync()).catch(() => {});
        }
      }

      const { createdSessionId, signIn, signUp } = authResult ?? {};
      const authSetActive = authResult?.setActive ?? setActive;
      const sessionId =
        createdSessionId || signIn?.createdSessionId || signUp?.createdSessionId;

      if (sessionId && authSetActive) {
        await withTimeout(
          authSetActive({ session: sessionId }),
          12000,
          'Clerk session activation timed out',
        );

        // Only the browser SSO flow opens a web session. The native Google
        // picker has nothing to dismiss, and dismissAuthSession() throws on
        // Android — so this cleanup must never break a completed login.
        if (usedBrowserSSO) {
          dismissBrowserAuthSession();
        }

        haptic.success();
        await handlePostAuthRouting(signUp, signIn, clerkUser);
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('[useGoogleAuth] Google authentication failed:', err);

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
  }, [
    clerkLoaded,
    getNativeGoogleIdToken,
    exchangeGoogleTokenWithClerk,
    setActive,
    startSSOFlow,
    handlePostAuthRouting,
    clerkUser,
  ]);

  return {
    handleGoogleSignIn,
    connecting,
    error,
    setError,
  };
}
