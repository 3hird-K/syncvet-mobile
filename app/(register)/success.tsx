import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { SuccessMessage } from '@components/ui/SuccessMessage';
import { Button } from '@components/ui/Button';
import { BackgroundDecoration } from '@components/ui/BackgroundDecoration';

export default function RegistrationSuccessScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const markRegistrationComplete = useAuthStore((state) => state.markRegistrationComplete);
  const done = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!done.current) {
      done.current = true;
      markRegistrationComplete().catch(() => {});
      timer = setTimeout(() => {
        router.replace('/(main)');
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [markRegistrationComplete, router]);

  const goHome = () => {
    haptic.medium();
    router.replace('/(main)');
  };

  const petCount = useDataStore((state) => state.pets.length);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackgroundDecoration subtle />
      <View style={styles.container}>
        <SuccessMessage
          title="You’re all set!"
          message={
            user
              ? `Welcome to SyncVet, ${user.fullName.split(/\s+/)[0]}. Your ${
                  petCount === 1 ? 'pet is' : 'pets are'
                } registered with the City Veterinary Office.`
              : 'Your registration is complete.'
          }
        />

        <View style={styles.details}>
          <Text style={styles.detailText}>
            🎉 Your SyncVet account is ready — you can now book consultations,
            schedule vaccinations, and manage your pets’ health from your phone.
          </Text>
        </View>

        <View style={styles.bottom}>
          <Button title="Go to Home" size="lg" onPress={goHome} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  details: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  detailText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottom: {
    marginTop: spacing.xxxl,
  },
});
