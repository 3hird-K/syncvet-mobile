import React from 'react';
import { Stack } from 'expo-router';

import { colors } from '@theme';

export default function AppointmentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
