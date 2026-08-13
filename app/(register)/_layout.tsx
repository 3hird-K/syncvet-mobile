import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';

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
  const profileCompleted = useAuthStore((state) => state.user?.profileCompleted);

  const segmentPath = segments.join('/');
  const onSuccess = segmentPath.includes('success');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/(auth)');
      return;
    }
    if (status === 'authenticated' && profileCompleted && !onSuccess) {
      router.replace('/(main)');
    }
  }, [status, profileCompleted, router, onSuccess]);

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
