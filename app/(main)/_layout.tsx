import React, { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';

import { colors } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { MeltingBallTabBar } from '@components/navigation/MeltingBallTabBar';
import { isRestrictedStaffRole } from '@services/auth/types';
import { notificationService, SafePermissionStatus } from '@services/notifications';

/**
 * Guards the (main) group: only authenticated residents with a completed
 * profile may enter.
 */
export default function MainLayout() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const userRole = useAuthStore((state) => state.user?.role);
  const promptedNotificationsRef = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || promptedNotificationsRef.current) return;
    promptedNotificationsRef.current = true;

    notificationService
      .getPermissionStatus()
      .then((permStatus) => {
        if (permStatus === SafePermissionStatus.UNDETERMINED) {
          return notificationService.requestPermissions();
        }
        return false;
      })
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    if (isRestrictedStaffRole(userRole)) {
      router.replace('/unauthorized-role');
      return;
    }
    if (status === 'unauthenticated') {
      router.replace({ pathname: '/onboarding', params: { slide: '3' } });
    }
  }, [status, userRole, router]);

  return (
    <Tabs
      backBehavior="none"
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
        name="messages"
        options={{
          title: 'Messenger',
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
      <Tabs.Screen
        name="services"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
