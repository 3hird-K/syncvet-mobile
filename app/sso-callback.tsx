import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';

import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { bootstrapSession } from '@lib/sessionBootstrap';
import { clearSignedOut, reconcileStaleSignedOutGate } from '@lib/sessionGate';
import { networkService } from '@services/network';
import { withTimeout } from '@lib/asyncUtils';
import { claimPostAuthRouting, releasePostAuthRouting } from '@lib/authFlowCoordinator';
import { isRestrictedStaffRole } from '@services/auth/types';
import { PawFootprintLoader } from '@components/ui/PawLoading';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';

export default function SSOCallbackScreen() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const routed = useRef(false);

  const finishRouting = useCallback(() => {
    if (routed.current) return;
    routed.current = true;

    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      router.replace({ pathname: '/onboarding', params: { slide: '3' } });
      return;
    }

    if (isRestrictedStaffRole(currentUser.role)) {
      router.replace('/unauthorized-role');
      return;
    }

    const hasCompletedProfile = Boolean(
      currentUser.profileCompleted && currentUser.mobileNumber && currentUser.address,
    );

    router.replace(hasCompletedProfile ? '/(main)' : '/(register)/owner');
  }, [router]);

  useEffect(() => {
    // Hard deadline: never strand the user on the paw loader just because
    // Clerk is still initializing or the profile lookup is slow.
    const timer = setTimeout(() => finishRouting(), 12000);
    return () => clearTimeout(timer);
  }, [finishRouting]);

  useEffect(() => {
    if (routed.current) return;
    let cancelled = false;

    void (async () => {
      await bootstrapSession();
      if (cancelled || routed.current) return;

      const authState = useAuthStore.getState();
      const hasLocalSession =
        authState.status === 'authenticated' && Boolean(authState.user);
      const isOffline = !networkService.isOnline();

      // An existing local session is authoritative on a cold start while offline.
      if (isOffline && hasLocalSession) {
        finishRouting();
        return;
      }

      if (!isLoaded) return;

      if (isSignedIn && clerkUser) {
        const userId = clerkUser.id;
        reconcileStaleSignedOutGate(userId, authState.user?.id);
        if (!claimPostAuthRouting(userId)) return;

        clearSignedOut();
        useOnboardingStore.getState().setCompleted();

        await withTimeout(
          (async () => {
            await useAuthStore.getState().googleSignIn({
              id: userId,
              email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
              fullName: clerkUser.fullName || clerkUser.firstName || 'Resident',
              photoUrl: clerkUser.imageUrl,
            });
            await useAuthStore.getState().syncUserFromClerk(clerkUser);
          })(),
          6000,
          'Session restore timed out',
        )
          .then(() => finishRouting())
          .catch((error) => {
            console.warn('[sso-callback] Session restore note:', error);
            releasePostAuthRouting(userId);
            // Keep any usable local session; otherwise fall back to onboarding.
            finishRouting();
          });
      } else if (!isSignedIn) {
        finishRouting();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, clerkUser, finishRouting]);

  return (
    <View style={styles.container}>
      <AnimatedBubbleBackground variant="splash" />
      <PawFootprintLoader showProgress label="Loading, please wait..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
