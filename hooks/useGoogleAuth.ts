import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { useAuth, useSSO, useUser } from '@clerk/expo';
import { useSignInWithGoogle } from '@clerk/expo/google';
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
  const { startSSOFlow } = useSSO();
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
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

      // Native builds: use Clerk's native Google One Tap flow. No browser, no
      // app switching, and no sso-callback redirect to get stuck on.
      if (Platform.OS !== 'web') {
        try {
          authResult = await withTimeout(
            startGoogleAuthenticationFlow(),
            20000,
            'Google sign-in took too long to open.',
          );

          // A null result here means the Google account dialog was dismissed.
          if (!authResult?.createdSessionId) return false;
        } catch (nativeError: any) {
          const nativeMessage = String(nativeError?.message || '');
          const isCancellation =
            nativeMessage.toLowerCase().includes('cancel') ||
            nativeError?.code === 'SIGN_IN_CANCELLED' ||
            nativeError?.code === '-5';

          if (isCancellation) throw nativeError;

          console.warn(
            '[useGoogleAuth] Native Google flow unavailable; falling back to browser flow.',
            nativeError,
          );
          authResult = undefined;
        }
      }

      // Web, Expo Go, or devices without the native Google module.
      if (!authResult?.createdSessionId) {
        await Promise.resolve(WebBrowser.warmUpAsync()).catch(() => {});
        try {
          authResult = await withTimeout(
            startSSOFlow({
              strategy: 'oauth_google',
              redirectUrl: buildOAuthRedirectUrl(),
            }),
            25000,
            'Google sign-in took too long to open.',
          );
        } finally {
          await Promise.resolve(WebBrowser.coolDownAsync()).catch(() => {});
        }
      }

      const { createdSessionId, setActive, signIn, signUp } = authResult ?? {};
      const sessionId =
        createdSessionId || signIn?.createdSessionId || signUp?.createdSessionId;

      if (sessionId && setActive) {
        await withTimeout(
          setActive({ session: sessionId }),
          12000,
          'Clerk session activation timed out',
        );

        Promise.resolve(WebBrowser.dismissAuthSession()).catch(() => {});

        haptic.success();
        await handlePostAuthRouting(signUp, signIn, clerkUser);
        return true;
      }

      return false;
    } catch (err: any) {
      console.log('Google Authentication error:', err);

      const rawMsg =
        err?.errors?.[0]?.longMessage ||
        err?.message ||
        'Could not sign in with Google. Please try again.';

      const isCancellation =
        rawMsg.toLowerCase().includes('cancel') ||
        rawMsg.toLowerCase().includes('dismiss') ||
        rawMsg.toLowerCase().includes('closed') ||
        err?.code === 'SIGN_IN_CANCELLED' ||
        err?.code === '-5';

      if (!isCancellation) {
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
    startGoogleAuthenticationFlow,
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
