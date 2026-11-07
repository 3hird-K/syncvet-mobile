import React, { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { useSSO } from '@clerk/expo';
import { isRunningInExpoGo } from 'expo';

import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { supabase } from '@lib/supabase';
import { isRestrictedStaffRole } from '@services/auth/types';

WebBrowser.maybeCompleteAuthSession();

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

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handlePostAuthRouting = useCallback(
    async (
      signUpFlow: any,
      signInFlow: any,
      clerkUser?: any,
    ) => {
      try {
        void WebBrowser.dismissAuthSession();
        void WebBrowser.coolDownAsync();
      } catch {}

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
        email: clerkEmail || 'user@syncvet.app',
        fullName: clerkName || 'SyncVet Resident',
        photoUrl,
      });

      if (clerkUser) {
        await useAuthStore.getState().syncUserFromClerk(clerkUser);
      }
      const currentUser = useAuthStore.getState().user;

      // Restrict Veterinarian & Administrator accounts from continuing into pet owner app
      if (isRestrictedStaffRole(currentUser?.role)) {
        await new Promise((res) => setTimeout(res, 600));
        router.replace('/unauthorized-role');
        setTimeout(() => {
          useAuthStore.getState().setAuthLoading(false);
          setConnecting(false);
        }, 400);
        return;
      }

      const hasCompletedProfile = Boolean(
        currentUser?.profileCompleted &&
        currentUser?.mobileNumber &&
        currentUser?.address
      );

      // Provide a deliberate, smooth loading experience with PawLoading
      // so the user experiences the sleek PawFootprintLoader smoothly before landing
      await new Promise((res) => setTimeout(res, 1200));

      if (hasCompletedProfile) {
        router.replace('/(main)');
      } else {
        router.replace('/(register)/owner');
      }

      setTimeout(() => {
        useAuthStore.getState().setAuthLoading(false);
        setConnecting(false);
      }, 800);
    },
    [router],
  );

  const handleGoogleSignIn = useCallback(async (): Promise<boolean> => {
    try {
      haptic.medium();
      setConnecting(true);
      useAuthStore.getState().setAuthLoading(true);
      setError(undefined);

      // Dismiss any lingering browser sessions
      try {
        await WebBrowser.dismissAuthSession();
      } catch {}

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

      const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });

      const sessionId =
        createdSessionId || signIn?.createdSessionId || signUp?.createdSessionId;

      if (sessionId && setActive) {
        await setActive({ session: sessionId });
        try {
          await WebBrowser.dismissAuthSession();
          await WebBrowser.coolDownAsync();
        } catch {}

        haptic.success();
        await handlePostAuthRouting(signUp, signIn);
        return true;
      }

      // If user dismissed browser without signing in
      setConnecting(false);
      useAuthStore.getState().setAuthLoading(false);
      return false;
    } catch (err: any) {
      console.log('Google Authentication error:', err);
      setConnecting(false);
      useAuthStore.getState().setAuthLoading(false);

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
    }
  }, [
    startSSOFlow,
    handlePostAuthRouting,
  ]);

  return {
    handleGoogleSignIn,
    connecting,
    error,
    setError,
  };
}
