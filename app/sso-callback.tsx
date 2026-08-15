import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth, useUser } from '@clerk/expo';

import { colors } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { PawLoadingOverlay } from '@components/ui/PawLoading';

WebBrowser.maybeCompleteAuthSession();

export default function SSOCallbackScreen() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user: clerkUser } = useUser();

  useEffect(() => {
    try {
      WebBrowser.maybeCompleteAuthSession();
      void WebBrowser.dismissAuthSession();
      void WebBrowser.coolDownAsync();
    } catch {}
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && clerkUser) {
      useOnboardingStore.getState().setCompleted();
      const metadata = clerkUser.unsafeMetadata || {};
      const mobileNumber = (metadata.mobileNumber as string) || '';
      const address = (metadata.address as string) || '';
      const profileCompleted = Boolean(metadata.profileCompleted);
      const clerkPets = Array.isArray(metadata.pets) ? (metadata.pets as any[]) : [];
      const hasCompletedProfile = Boolean(
        profileCompleted &&
        mobileNumber &&
        address &&
        clerkPets.length > 0
      );

      useAuthStore.getState().googleSignIn({
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        fullName: clerkUser.fullName || clerkUser.firstName || 'Resident',
        photoUrl: clerkUser.imageUrl,
      }).then(async () => {
        if (mobileNumber || address) {
          await useAuthStore.getState().saveOwnerProfile(mobileNumber, address);
        }
        if (profileCompleted) {
          await useAuthStore.getState().markRegistrationComplete();
        }
        if (hasCompletedProfile) {
          router.replace('/(main)');
        } else {
          router.replace('/(register)/owner');
        }
      }).catch(() => {
        router.replace('/(main)');
      });
    } else if (!isSignedIn) {
      router.replace({ pathname: '/onboarding', params: { slide: '3' } });
    }
  }, [isLoaded, isSignedIn, clerkUser, router]);

  return (
    <View style={styles.container}>
      <PawLoadingOverlay visible />
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
