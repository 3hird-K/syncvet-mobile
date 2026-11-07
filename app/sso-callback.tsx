import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth, useUser } from '@clerk/expo';

import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { supabase } from '@lib/supabase';
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
    if (!isLoaded || routed.current) return;

    if (isSignedIn && clerkUser) {
      routed.current = true;
      useOnboardingStore.getState().setCompleted();

      useAuthStore.getState().googleSignIn({
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        fullName: clerkUser.fullName || clerkUser.firstName || 'Resident',
        photoUrl: clerkUser.imageUrl,
      }).then(async () => {
        await useAuthStore.getState().syncUserFromClerk(clerkUser);
        const currentUser = useAuthStore.getState().user;

        // Redirect Veterinarians and Administrators away from pet owner mobile app
        if (isRestrictedStaffRole(currentUser?.role)) {
          router.replace('/unauthorized-role');
          return;
        }

        const hasCompletedProfile = Boolean(
          currentUser?.profileCompleted &&
          currentUser?.mobileNumber &&
          currentUser?.address
        );

        await new Promise((res) => setTimeout(res, 800));
        if (hasCompletedProfile) {
          router.replace('/(main)');
        } else {
          router.replace('/(register)/owner');
        }
      }).catch(() => {
        router.replace('/(register)/owner');
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
