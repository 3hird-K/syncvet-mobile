import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/expo';

import { colors, spacing } from '@theme';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { PetsScreenSkeleton } from '@components/ui/Skeleton';
import { PetQrTagModal } from '@components/ui/PetQrTagModal';
import { PetQrScannerModal } from '@components/ui/PetQrScannerModal';
import {
  PetsHeader,
  PetsSearchFilter,
  PetPassportCard,
  PetsEmptyState,
  type PetFilterCategory,
} from '@components/pets';
import type { Pet } from '@services/data';

export default function PetsScreen() {
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const { pets: storePets, loading, loaded, syncNow } = useResidentData();

  const [activeFilter, setActiveFilter] = useState<PetFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQrPet, setSelectedQrPet] = useState<Pet | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Pure Supabase source of truth
  const allPets: Pet[] = storePets || [];

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
      await syncNow();
    } catch (e) {
      console.log('Pets refresh error:', e);
    }
  }, [syncNow]);

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
        {/* 1. Header with Title & "+ Add Pet" Button & "Scan Tag" Button */}
        <PetsHeader
          petsCount={allPets.length}
          onScanPress={() => setScannerVisible(true)}
        />

        {/* 2. Search Bar & Filter Chips */}
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
              <PetPassportCard
                key={pet.id}
                pet={pet}
                index={idx}
                onQrPress={(p) => setSelectedQrPet(p)}
              />
            ))}
          </View>
        )}
      </Screen>

      {/* Official Digital Pet Tag Modal */}
      <PetQrTagModal
        visible={Boolean(selectedQrPet)}
        onClose={() => setSelectedQrPet(null)}
        pet={selectedQrPet}
        owner={{
          id: user?.id || clerkUser?.id,
          fullName: user?.fullName || clerkUser?.fullName || 'SyncVet Resident',
          mobileNumber: user?.mobileNumber || clerkUser?.primaryPhoneNumber?.phoneNumber || '',
          address: user?.address || 'Cagayan de Oro City',
        }}
      />

      {/* Pet Tag Scanner Camera Modal */}
      <PetQrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
      />
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
