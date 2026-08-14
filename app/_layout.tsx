import React, { useEffect } from 'react';
import { LogBox, Platform, StatusBar as RNStatusBar, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { ClerkProvider, ClerkLoaded } from '@clerk/expo';
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
import { useAuthStore } from '@store/useAuthStore';
import { tokenCache } from '@lib/tokenCache';
import { Toaster } from '@components/ui/Sonner';

// Silence Clerk development keys notice in development
LogBox.ignoreLogs([
  'Clerk: Clerk has been loaded with development keys',
  'Clerk has been loaded with development keys',
]);

if (__DEV__) {
  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Clerk has been loaded with development keys')
    ) {
      return;
    }
    origWarn(...args);
  };
}

WebBrowser.maybeCompleteAuthSession();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor('transparent');
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      restoreSession().finally(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
    }
  }, [fontsLoaded, fontError, restoreSession]);

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            {fontsLoaded || fontError ? (
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
            ) : null}
            <Toaster />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
