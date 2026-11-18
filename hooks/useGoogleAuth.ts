import React, { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { useSSO, useUser } from '@clerk/expo';
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

function useWarmUpBrowser() {
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export interface UseGoogleAuthReturn {
  handleGoogleSignIn: () => Promise<boolean>;
  connecting: boolean;
  error: string | undefined;
  setError: (err: string | undefined) => void;
}

/**
 * Production-ready Google Authentication hook for SyncVet.
 * Uses standard Clerk OAuth SSO flow for reliable 1-step Google authentication.
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  useWarmUpBrowser();
  const router = useRouter();
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

  const handleGoogleSignIn = useCallback(async (): Promise<boolean> => {
    resetPostAuthRouting();

    try {
      haptic.medium();
      setConnecting(true);
      useAuthStore.getState().setAuthLoading(true);
      setError(undefined);

      let isExpoGo = false;
      try {
        isExpoGo = isRunningInExpoGo();
      } catch {
        isExpoGo = false;
      }

      // In Expo Go on Android, Android OS only recognises the exp:// scheme to return to the Expo Go client.
      // Custom schemes like syncvet:// only work in standalone / custom dev builds.
      let redirectUrl = 'syncvet://sso-callback';
      if (isExpoGo) {
        const base =
          Constants.linkingUri ||
          `exp://${Platform.OS === 'android' ? '192.168.254.101' : 'localhost'}:8081`;
        const cleanBase = base.replace(/\/--\/.*$/, '').replace(/\/$/, '');
        redirectUrl = `${cleanBase}/--/sso-callback`;
      } else {
        redirectUrl = AuthSession.makeRedirectUri({
          scheme: 'syncvet',
          path: 'sso-callback',
        });
      }

      console.log('[useGoogleAuth] OAuth Redirect URL:', redirectUrl);

      const { createdSessionId, setActive, signIn, signUp } = await withTimeout(
        startSSOFlow({
          strategy: 'oauth_google',
          redirectUrl,
        }),
        25000,
        'Google sign-in took too long. Please try again.',
      );

      const sessionId =
        createdSessionId || signIn?.createdSessionId || signUp?.createdSessionId;

      if (sessionId && setActive) {
        await withTimeout(
          setActive({ session: sessionId }),
          12000,
          'Clerk session activation timed out',
        );

        // Fire-and-forget: these cleanup calls must never race with or block
        // the browser handshake that just completed.
        Promise.resolve(WebBrowser.dismissAuthSession()).catch(() => {});
        Promise.resolve(WebBrowser.coolDownAsync()).catch(() => {});

        haptic.success();
        await handlePostAuthRouting(signUp, signIn, clerkUser);
        return true;
      }

      // Browser was dismissed without a completed sign-in.
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
