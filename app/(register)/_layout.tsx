import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';

import { useUser } from '@clerk/expo';
import { colors } from '@theme';
import { useAuthStore } from '@store/useAuthStore';

/**
 * Guards the first-run registration group: only authenticated residents with
 * an incomplete profile may enter. Everyone else is routed away.
 */
export default function RegisterLayout() {
  const router = useRouter();
  const segments = useSegments();
  const status = useAuthStore((state) => state.status);
  const { user: clerkUser } = useUser();
  const metadata = clerkUser?.unsafeMetadata;
  const clerkPets = Array.isArray(metadata?.pets) ? (metadata?.pets as any[]) : [];
  const hasCompletedProfile = Boolean(
    metadata?.profileCompleted &&
    metadata?.mobileNumber &&
    metadata?.address &&
    clerkPets.length > 0
  );

  const segmentPath = segments.join('/');
  const onSuccess = segmentPath.includes('success');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/(auth)');
      return;
    }
    if (status === 'authenticated' && hasCompletedProfile && !onSuccess) {
      router.replace('/(main)');
    }
  }, [status, hasCompletedProfile, router, onSuccess]);

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
