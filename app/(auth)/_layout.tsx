import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';

import { colors } from '@theme';
import { useAuthStore } from '@store/useAuthStore';

/**
 * Guards the (auth) group: authenticated users are sent to the profile check —
 * straight into the main app if registration is complete, or the first-run
 * registration flow otherwise.
 */
export default function AuthLayout() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (user?.profileCompleted) {
      router.replace('/(main)');
    } else {
      router.replace('/owner');
    }
  }, [status, user?.profileCompleted, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="google" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
