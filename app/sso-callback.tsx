import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth, useUser } from '@clerk/expo';

import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { networkService } from '@services/network';
import { isRestrictedStaffRole } from '@services/auth/types';
import { PawFootprintLoader } from '@components/ui/PawLoading';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';

WebBrowser.maybeCompleteAuthSession();

export default function SSOCallbackScreen() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const routed = useRef(false);

  useEffect(() => {
    try {
      WebBrowser.maybeCompleteAuthSession();
      void WebBrowser.dismissAuthSession();
      void WebBrowser.coolDownAsync();
    } catch {}
  }, []);

  useEffect(() => {
    if (routed.current) return;

    const finishRouting = (delay = false) => {
      if (routed.current) return;
      routed.current = true;

      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        router.replace({ pathname: '/onboarding', params: { slide: '3' } });
        return;
      }

      // Redirect Veterinarians and Administrators away from pet owner mobile app
      if (isRestrictedStaffRole(currentUser.role)) {
        router.replace('/unauthorized-role');
        return;
      }

      const hasCompletedProfile = Boolean(
        currentUser.profileCompleted &&
        currentUser.mobileNumber &&
        currentUser.address
      );

      const navigate = () => {
        router.replace(hasCompletedProfile ? '/(main)' : '/(register)/owner');
      };

      if (delay) {
        setTimeout(navigate, 800);
      } else {
        navigate();
      }
    };

    const authState = useAuthStore.getState();
    const hasLocalSession =
      authState.status === 'authenticated' && Boolean(authState.user);
    const isOffline = !networkService.isOnline();

    // An existing local session is authoritative on a cold start while offline.
    // Clerk may still be initializing, and waiting for it can strand the user
    // on this callback screen or send them back to online-only authentication.
    if (isOffline && hasLocalSession) {
      finishRouting();
      return;
    }

    if (!isLoaded) return;

    if (isSignedIn && clerkUser) {
      useOnboardingStore.getState().setCompleted();

      useAuthStore.getState().googleSignIn({
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        fullName: clerkUser.fullName || clerkUser.firstName || 'Resident',
        photoUrl: clerkUser.imageUrl,
      }).then(async () => {
        await useAuthStore.getState().syncUserFromClerk(clerkUser);
        finishRouting(true);
      }).catch(() => {
        // A failed network lookup must not undo a usable local session.
        finishRouting();
      });
    } else if (!isSignedIn) {
      routed.current = true;
      router.replace({ pathname: '/onboarding', params: { slide: '3' } });
    }
  }, [isLoaded, isSignedIn, clerkUser, router]);

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
