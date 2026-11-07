import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';

import { useAuth, useUser } from '@clerk/expo';
import { colors } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { isRestrictedStaffRole } from '@services/auth/types';

/**
 * Guards the first-run registration group: only authenticated residents with
 * an incomplete profile may enter. Everyone else is routed away.
 */
export default function RegisterLayout() {
  const router = useRouter();
  const segments = useSegments();
  const status = useAuthStore((state) => state.status);
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const currentUser = useAuthStore((state) => state.user);
  const hasCompletedProfile = Boolean(
    currentUser?.profileCompleted &&
    currentUser?.mobileNumber &&
    currentUser?.address
  );

  const segmentPath = segments.join('/');
  const onSuccess = segmentPath.includes('success');

  const isAuth = (status === 'authenticated' && !!currentUser) || (clerkLoaded && isSignedIn);

  useEffect(() => {
    // Redirect Veterinarians and Administrators away from pet owner registration
    if (isRestrictedStaffRole(currentUser?.role)) {
      router.replace('/unauthorized-role');
      return;
    }

    // Only redirect away to onboarding if both Clerk and local auth confirm the user is not signed in
    if (clerkLoaded && !isAuth) {
      router.replace({ pathname: '/onboarding', params: { slide: '3' } });
      return;
    }
    if (isAuth && hasCompletedProfile && !onSuccess) {
      router.replace('/(main)');
    }
  }, [clerkLoaded, isAuth, hasCompletedProfile, currentUser?.role, router, onSuccess]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="owner" />
      <Stack.Screen name="pet" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
