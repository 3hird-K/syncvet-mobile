import React, { useEffect } from 'react';
import { LogBox, Platform, StatusBar as RNStatusBar, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, ClerkLoaded } from '@clerk/expo';
import { resourceCache } from '@clerk/expo/resource-cache';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@theme';
import { bootstrapSession } from '@lib/sessionBootstrap';
import { tokenCache } from '@lib/tokenCache';
import { Toaster } from '@components/ui/Sonner';
import { NetworkToastListener } from '@components/ui/NetworkToastListener';
import { QueueCallAlert } from '@components/queue/QueueCallAlert';
import { EditProfileSheet } from '@components/profile/EditProfileSheet';
import { notificationService, notificationRouter } from '@services/notifications';

import { SupabaseAuthBridge } from '../components/auth/SupabaseAuthBridge';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@lib/queryClient';

// Silence Clerk dev keys notice and Supabase Realtime subscription logs in development
LogBox.ignoreLogs([
  'Clerk: Clerk has been loaded with development keys',
  'Clerk has been loaded with development keys',
  '[SupabaseRealtime]',
  'Subscribed to live updates',
]);

if (__DEV__) {
  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Clerk has been loaded with development keys') ||
        args[0].includes('Subscribed to live updates'))
    ) {
      return;
    }
    origWarn(...args);
  };

  const origLog = console.log;
  console.log = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Subscribed to live updates')
    ) {
      return;
    }
    origLog(...args);
  };
}

// ClerkProvider handles WebBrowser.maybeCompleteAuthSession() internally.

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

SplashScreen.preventAutoHideAsync().catch(() => { });

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS === 'android') {
      (RNStatusBar as any).setTranslucent?.(true);
      (RNStatusBar as any).setBackgroundColor?.('transparent');
    }

    // Initialize native notification channels and response routing listeners
    notificationService.init().catch(() => { });
    notificationRouter.setupListeners();

    return () => {
      notificationRouter.cleanup();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Wait for the single shared bootstrap instead of racing an arbitrary
      // 4s timer. Hiding the splash before the session read finished let the
      // index route see an empty store and show the login screen to users who
      // were already signed in.
      void bootstrapSession().finally(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
    }
  }, [fontsLoaded, fontError]);

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      __experimental_resourceCache={resourceCache}
    >
      {/* Static screens (onboarding, welcome, error pages) must render even when
          Clerk cannot initialize offline, so ClerkLoaded only guards the bridge. */}
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            {fontsLoaded || fontError ? (
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  contentStyle: { backgroundColor: colors.primaryLight },
                }}
              />
            ) : null}
            <Toaster />
            <NetworkToastListener />
            <QueueCallAlert />
            <EditProfileSheet />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
      <ClerkLoaded>
        <SupabaseAuthBridge />
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
