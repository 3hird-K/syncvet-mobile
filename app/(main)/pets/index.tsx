import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { haptic } from '@lib/haptics';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { PetCard } from '@components/ui/PetCard';
import { EmptyState } from '@components/ui/EmptyState';
import { LoadingState } from '@components/ui/LoadingState';

export default function PetsScreen() {
  const router = useRouter();
  const ownerId = useAuthStore((state) => state.user?.id);
  const { loading, loaded, error } = useResidentData();
  const pets = useDataStore((state) => state.pets);
  const loadAll = useDataStore((state) => state.loadAll);

  if (loading && !loaded) {
    return (
      <Screen>
        <LoadingState label="Loading your pets…" />
      </Screen>
    );
  }

  return (
    <AnimatedScreen animation="fade">
      <Screen scroll>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>My Pets</Text>
            {loaded && pets.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add a pet"
                onPress={() => {
                  haptic.light();
                  router.push('/pets/add' as never);
                }}
                hitSlop={8}
                style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
              >
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.subtitle}>
            Keep your pet records up to date for their visits.
          </Text>
        </View>

        {error && !loaded ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn’t load your pets"
            message={error}
            actionLabel="Try Again"
            onAction={() => {
              if (ownerId) loadAll(ownerId).catch(() => {});
            }}
          />
        ) : null}

        {loaded && pets.length === 0 ? (
          <EmptyState
            icon="paw-outline"
            title="No pets yet"
            message="Add a pet to start booking veterinary services."
            actionLabel="Add Your First Pet"
            onAction={() => {
              haptic.light();
              router.push('/pets/add' as never);
            }}
          />
        ) : (
          <View style={styles.grid}>
            {pets.map((pet) => (
              <View key={pet.id} style={styles.gridItem}>
                <PetCard
                  pet={pet}
                  onPress={() => router.push(`/pets/${pet.id}` as never)}
                />
              </View>
            ))}
          </View>
        )}
      </Screen>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.heading1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  addBtnPressed: {
    backgroundColor: colors.primaryStrong,
  },
  addBtnText: {
    ...typography.captionBold,
    color: colors.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
});
