import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';

import { colors } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { MeltingBallTabBar } from '@components/navigation/MeltingBallTabBar';

/**
 * Guards the (main) group: only authenticated residents with a completed
 * profile may enter.
 */
export default function MainLayout() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace({ pathname: '/onboarding', params: { slide: '3' } });
    }
  }, [status, router]);

  return (
    <Tabs
      tabBar={(props) => <MeltingBallTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: 'Pets',
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Visits',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
