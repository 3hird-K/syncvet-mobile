import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors, spacing, typography } from '@theme';
import { useAuthStore } from '@store/useAuthStore';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  activeName,
  color,
  focused,
}: {
  name: IoniconName;
  activeName: IoniconName;
  color: ColorValue;
  focused: boolean;
}) {
  return <Ionicons name={focused ? activeName : name} size={22} color={color} />;
}

/**
 * Guards the (main) group: only authenticated residents with a completed
 * profile may enter.
 */
export default function MainLayout() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const profileCompleted = useAuthStore((state) => state.user?.profileCompleted);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/(auth)');
    } else if (status === 'authenticated' && !profileCompleted) {
      router.replace('/owner');
    }
  }, [status, profileCompleted, router]);

  if (status !== 'authenticated' || !profileCompleted) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          ...typography.small,
          fontFamily: typography.font.semibold,
          fontSize: 11,
          paddingBottom: 6,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" activeName="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="grid-outline" activeName="grid" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: 'Pets',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="paw-outline" activeName="paw" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar-outline" activeName="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" activeName="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
