import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@theme';
import { PawLoadingOverlay } from '@components/ui/PawLoading';

export default function ForgotPasswordRedirectScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace({ pathname: '/onboarding', params: { slide: '3' } });
  }, [router]);

  return (
    <View style={styles.container}>
      <PawLoadingOverlay visible />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
