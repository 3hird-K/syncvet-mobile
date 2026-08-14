import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@theme';

export default function ServiceDetailScreen() {
  const router = useRouter();
  const { id, pet } = useLocalSearchParams<{ id: string; pet?: string }>();

  useEffect(() => {
    router.replace({
      pathname: '/appointments/new',
      params: {
        serviceId: id || 'consultation',
        petId: pet || undefined,
      },
    } as never);
  }, [id, pet, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
