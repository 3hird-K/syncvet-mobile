import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors, radius, spacing } from '@theme';
import { useDataStore } from '@store/useDataStore';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { BackButton } from '@components/ui/BackButton';
import { EmptyState } from '@components/ui/EmptyState';
import { PetPassportView } from '@components/pets';

export default function PetProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pets = useDataStore((state) => state.pets);

  const pet = useMemo(
    () => pets.find((p) => p.id === id),
    [pets, id],
  );

  if (!pet) {
    return (
      <Screen scroll>
        <View style={styles.headerRow}>
          <BackButton to="/pets" />
        </View>
        <EmptyState
          icon="paw-outline"
          title="Pet not found"
          message="This pet may have been removed or updated."
          actionLabel="Back to My Pets"
          onAction={() => router.replace('/pets' as never)}
        />
      </Screen>
    );
  }

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/pets' as never);
    }
  };

  return (
    <AnimatedScreen animation="zoom">
      <View style={styles.screen}>
        <PetPassportView
          pet={pet}
          onClose={handleClose}
          isCard={false}
          onSelectPet={(targetPet) => router.replace(`/pets/${targetPet.id}` as never)}
        />
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  headerRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
