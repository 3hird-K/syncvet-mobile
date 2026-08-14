import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@theme';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';
import { PawFootprintLoader } from '@components/ui/PawLoading';

export default function RegistrationSuccessScreen() {
  const router = useRouter();
  const markRegistrationComplete = useAuthStore((state) => state.markRegistrationComplete);
  const done = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (!done.current) {
      done.current = true;
      markRegistrationComplete().catch(() => {});
      haptic.success();

      // Smooth transition to main after 2.4s
      timer = setTimeout(() => {
        router.replace('/(main)');
      }, 2400);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [markRegistrationComplete, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AnimatedBubbleBackground variant="default" />
      <PawFootprintLoader showProgress={true} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
