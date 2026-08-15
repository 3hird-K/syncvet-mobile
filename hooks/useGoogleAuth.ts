import React, { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSignInWithGoogle } from '@clerk/expo/google';
import { useSSO } from '@clerk/expo';

import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';

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
 * Uses Clerk's native Google Sign-In with Credential Manager on iOS/Android,
 * with graceful fallback to browser SSO on web or unsupported environments.
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  useWarmUpBrowser();
  const router = useRouter();
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
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

      const currentUser = useAuthStore.getState().user;
      const metadata = (
        signUpFlow?.unsafeMetadata ||
        (signInFlow?.userData as any)?.unsafeMetadata ||
        clerkUser?.unsafeMetadata ||
        {}
      ) as Record<string, any>;

      const mobileNumber = (metadata?.mobileNumber as string) || '';
      const address = (metadata?.address as string) || '';
      const profileCompleted = Boolean(metadata?.profileCompleted);
      const clerkPets = Array.isArray(metadata?.pets) ? (metadata?.pets as any[]) : [];

      const hasCompletedProfile = Boolean(
        profileCompleted &&
        mobileNumber &&
        address &&
        clerkPets.length > 0
      );

      if (mobileNumber || address) {
        await useAuthStore.getState().saveOwnerProfile(
          mobileNumber || currentUser?.mobileNumber || '',
          address || currentUser?.address || '',
        );
      }

      if (profileCompleted) {
        await useAuthStore.getState().markRegistrationComplete();
      }

      // Provide a deliberate, smooth loading experience with PawLoading
      // so the user experiences the sleek PawFootprintLoader smoothly before landing
      await new Promise((res) => setTimeout(res, 1200));

      if (hasCompletedProfile) {
        router.replace('/(main)');
      } else {
        router.replace('/(register)/owner');
      }
    },
    [router],
  );

  const handleGoogleSignIn = useCallback(async (): Promise<boolean> => {
    try {
      haptic.medium();
      setConnecting(true);
      setError(undefined);

      // Dismiss any lingering browser sessions
      try {
        await WebBrowser.dismissAuthSession();
      } catch {}

      // 1. Attempt Native Google Authentication flow first on iOS and Android
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        try {
          const result = await startGoogleAuthenticationFlow();
          const nativeSessionId =
            result?.createdSessionId ||
            result?.signIn?.createdSessionId ||
            result?.signUp?.createdSessionId;

          if (nativeSessionId && result?.setActive) {
            await result.setActive({ session: nativeSessionId });
            haptic.success();
            await handlePostAuthRouting(result.signUp, result.signIn);
            return true;
          }

          console.log('Native Google flow did not return session, proceeding to SSO flow');
        } catch (nativeErr: any) {
          if (
            nativeErr?.code === 'SIGN_IN_CANCELLED' ||
            nativeErr?.code === '-5' ||
            nativeErr?.message?.toLowerCase().includes('cancel') ||
            nativeErr?.message?.toLowerCase().includes('dismiss')
          ) {
            setConnecting(false);
            return false;
          }
          console.log('Native Google flow fallback to browser SSO:', nativeErr?.message);
        }
      }

      // 2. Fallback to browser SSO flow (for Web or non-prebuilt runtime)
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'syncvet',
        path: 'sso-callback',
      });

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
      return false;
    } catch (err: any) {
      console.log('Google Authentication error:', err);
      setConnecting(false);

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
    startGoogleAuthenticationFlow,
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
