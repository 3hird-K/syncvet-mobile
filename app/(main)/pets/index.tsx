import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/expo';

import { colors, spacing } from '@theme';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { PetsScreenSkeleton } from '@components/ui/Skeleton';
import {
  PetsHeader,
  PetsDashboard,
  PetsSearchFilter,
  PetPassportCard,
  PetsEmptyState,
  type PetFilterCategory,
} from '@components/pets';
import type { Pet } from '@services/data';

export default function PetsScreen() {
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const { loading, loaded } = useResidentData();

  const [activeFilter, setActiveFilter] = useState<PetFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract resident's pets directly from Clerk user unsafeMetadata
  const allPets: Pet[] = useMemo(() => {
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];

    return metaPets.map((p, idx) => ({
      id: p.id || `clerk-pet-${idx}`,
      ownerId: p.ownerId || user?.id || 'resident-owner',
      name: p.name || 'My Pet',
      species: p.species || 'dog',
      breed: p.breed || '',
      gender: p.gender || 'male',
      birthYear: p.birthYear,
      isVaccinated: Boolean(p.isVaccinated),
      isSpayedNeutered: Boolean(p.isSpayedNeutered),
      weightCategory: p.weightCategory,
      notes: p.notes,
      avatarId: p.avatarId,
      photoUrl: p.photoUrl,
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
    }));
  }, [clerkUser?.unsafeMetadata, user?.id]);

  // Real-time search & filter
  const filteredPets = useMemo(() => {
    return allPets.filter((pet) => {
      // Category filter
      if (activeFilter === 'dog' && pet.species?.toLowerCase() !== 'dog') return false;
      if (activeFilter === 'cat' && pet.species?.toLowerCase() !== 'cat') return false;
      if (activeFilter === 'needs_vaccine' && pet.isVaccinated) return false;

      // Text search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = pet.name.toLowerCase().includes(query);
        const matchesBreed = (pet.breed || '').toLowerCase().includes(query);
        const matchesSpecies = (pet.species || '').toLowerCase().includes(query);
        return matchesName || matchesBreed || matchesSpecies;
      }

      return true;
    });
  }, [allPets, activeFilter, searchQuery]);

  // Statistics
  const dogCount = allPets.filter((p) => p.species?.toLowerCase() === 'dog').length;
  const catCount = allPets.filter((p) => p.species?.toLowerCase() === 'cat').length;
  const needsVaccineCount = allPets.filter((p) => !p.isVaccinated).length;

  const handleRefresh = useCallback(async () => {
    haptic.light();
    try {
      await clerkUser?.reload();
      if (user?.id) {
        await useDataStore.getState().loadAll(user.id);
      }
    } catch (e) {
      console.log('Pets refresh error:', e);
    }
  }, [clerkUser, user?.id]);

  if (loading && !loaded && allPets.length === 0) {
    return (
      <AnimatedScreen animation="zoom">
        <PetsScreenSkeleton />
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen animation="zoom">
      <Screen scroll onRefresh={handleRefresh} contentContainerStyle={styles.scrollContent}>
        {/* 1. Header with Title & "+ Add Pet" Button */}
        <PetsHeader petsCount={allPets.length} />

        {/* 2. Municipal Anti-Rabies Compliance & Metrics Dashboard */}
        <PetsDashboard
          totalCount={allPets.length}
          dogCount={dogCount}
          catCount={catCount}
          needsVaccineCount={needsVaccineCount}
        />

        {/* 3. Search Bar & Filter Chips */}
        {allPets.length > 0 ? (
          <PetsSearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            totalCount={allPets.length}
            dogCount={dogCount}
            catCount={catCount}
            needsVaccineCount={needsVaccineCount}
          />
        ) : null}

        {/* 4. Pet Passport Cards or Empty States */}
        {allPets.length === 0 ? (
          <PetsEmptyState type="no_pets" />
        ) : filteredPets.length === 0 ? (
          <PetsEmptyState
            type="no_results"
            onClearFilter={() => {
              setSearchQuery('');
              setActiveFilter('all');
            }}
          />
        ) : (
          <View style={styles.petsList}>
            {filteredPets.map((pet, idx) => (
              <PetPassportCard key={pet.id} pet={pet} index={idx} />
            ))}
          </View>
        )}
      </Screen>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    backgroundColor: colors.background,
  },
  petsList: {
    gap: 0,
  },
});
