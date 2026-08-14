import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { ageFromBirthYear, formatAge } from '@lib/format';
import { haptic } from '@lib/haptics';
import { getPetAvatarSource } from '@lib/petAvatars';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { LoadingState } from '@components/ui/LoadingState';
import { PopoutPetAvatar } from '@components/ui/PopoutPetAvatar';

interface DisplayPet {
  id: string;
  name: string;
  species: 'dog' | 'cat' | string;
  breed?: string;
  gender?: 'male' | 'female' | string;
  birthYear?: number;
  isVaccinated?: boolean;
  isSpayedNeutered?: boolean;
  weightCategory?: string;
  notes?: string;
  avatarId?: string;
  photoUrl?: string;
}

type FilterCategory = 'all' | 'dog' | 'cat' | 'needs_vaccine';

export default function PetsScreen() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const ownerId = useAuthStore((state) => state.user?.id);
  const { loading, loaded } = useResidentData();
  const localPets = useDataStore((state) => state.pets);

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract pets from Clerk metadata + local data store
  const allPets: DisplayPet[] = useMemo(() => {
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];

    if (metaPets.length > 0) {
      return metaPets.map((p, idx) => ({
        id: p.id || `clerk-pet-${idx}`,
        name: p.name || 'My Pet',
        species: p.species || 'dog',
        breed: p.breed || '',
        gender: p.gender || '',
        birthYear: p.birthYear,
        isVaccinated: Boolean(p.isVaccinated),
        isSpayedNeutered: Boolean(p.isSpayedNeutered),
        weightCategory: p.weightCategory,
        notes: p.notes,
        avatarId: p.avatarId,
        photoUrl: p.photoUrl,
      }));
    }

    if (localPets && localPets.length > 0) {
      return localPets.map((p) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        breed: p.breed,
        gender: p.gender,
        birthYear: p.birthYear,
        isVaccinated: true,
        isSpayedNeutered: false,
      }));
    }

    return [];
  }, [clerkUser?.unsafeMetadata, localPets]);

  // Filter & search
  const filteredPets = useMemo(() => {
    return allPets.filter((pet) => {
      // Filter by category
      if (activeFilter === 'dog' && pet.species?.toLowerCase() !== 'dog') return false;
      if (activeFilter === 'cat' && pet.species?.toLowerCase() !== 'cat') return false;
      if (activeFilter === 'needs_vaccine' && pet.isVaccinated) return false;

      // Filter by query
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

  if (loading && !loaded && allPets.length === 0) {
    return (
      <Screen>
        <LoadingState label="Loading pet health passports…" />
      </Screen>
    );
  }

  return (
    <AnimatedScreen animation="fade">
      <Screen scroll>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.screenTitle}>My Pets</Text>
            <Text style={styles.screenSubtitle}>City Veterinary Health Passports</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Register a new pet"
            onPress={() => {
              haptic.light();
              router.push('/pets/add' as never);
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.addPetBtn, pressed && styles.addPetBtnPressed]}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.addPetBtnText}>Register Pet</Text>
          </Pressable>
        </View>

        {/* Quick Stats Summary Banner */}
        {allPets.length > 0 ? (
          <View style={[styles.statsBanner, shadows.sm]}>
            <View style={styles.statSegment}>
              <Text style={styles.statNumber}>{dogCount}</Text>
              <Text style={styles.statLabel}>🐶 Dogs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statSegment}>
              <Text style={styles.statNumber}>{catCount}</Text>
              <Text style={styles.statLabel}>🐱 Cats</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statSegment}>
              <Text
                style={[
                  styles.statNumber,
                  needsVaccineCount > 0 ? { color: colors.warning } : { color: colors.success },
                ]}
              >
                {needsVaccineCount > 0 ? `${needsVaccineCount} Due` : '100%'}
              </Text>
              <Text style={styles.statLabel}>Anti-Rabies</Text>
            </View>
          </View>
        ) : null}

        {/* Search & Filter Bar */}
        {allPets.length > 0 ? (
          <View style={styles.filterSection}>
            {/* Search Input */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name, breed, or species..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                clearButtonMode="while-editing"
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsRow}
            >
              <Pressable
                onPress={() => {
                  haptic.light();
                  setActiveFilter('all');
                }}
                style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'all' && styles.filterChipTextActive,
                  ]}
                >
                  All ({allPets.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  haptic.light();
                  setActiveFilter('dog');
                }}
                style={[styles.filterChip, activeFilter === 'dog' && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'dog' && styles.filterChipTextActive,
                  ]}
                >
                  🐶 Dogs ({dogCount})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  haptic.light();
                  setActiveFilter('cat');
                }}
                style={[styles.filterChip, activeFilter === 'cat' && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'cat' && styles.filterChipTextActive,
                  ]}
                >
                  🐱 Cats ({catCount})
                </Text>
              </Pressable>

              {needsVaccineCount > 0 ? (
                <Pressable
                  onPress={() => {
                    haptic.light();
                    setActiveFilter('needs_vaccine');
                  }}
                  style={[
                    styles.filterChip,
                    activeFilter === 'needs_vaccine' && styles.filterChipActiveAmber,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      activeFilter === 'needs_vaccine' && styles.filterChipTextActiveAmber,
                    ]}
                  >
                    💉 Needs Shot ({needsVaccineCount})
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        ) : null}

        {/* Empty State */}
        {allPets.length === 0 ? (
          <View style={[styles.emptyContainer, shadows.sm]}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="paw" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyHeading}>No pets registered yet</Text>
            <Text style={styles.emptyDescription}>
              Register your dog or cat with the City Veterinary Office to track vaccinations, generate official health passports, and book checkups.
            </Text>
            <Pressable
              onPress={() => {
                haptic.light();
                router.push('/pets/add' as never);
              }}
              style={styles.emptyActionBtn}
            >
              <Ionicons name="add-circle" size={18} color={colors.white} />
              <Text style={styles.emptyActionBtnText}>Register Your First Pet</Text>
            </Pressable>
          </View>
        ) : filteredPets.length === 0 ? (
          <View style={styles.noResultsBox}>
            <Ionicons name="search" size={28} color={colors.textMuted} />
            <Text style={styles.noResultsTitle}>No matching pets</Text>
            <Text style={styles.noResultsSubtitle}>Try searching with a different name or filter.</Text>
          </View>
        ) : (
          /* Pets Passport List */
          <View style={styles.petsList}>
            {filteredPets.map((pet) => {
              const isDog = pet.species?.toLowerCase() === 'dog';
              const ageText = pet.birthYear
                ? formatAge(ageFromBirthYear(pet.birthYear))
                : undefined;

              return (
                <Pressable
                  key={pet.id}
                  style={[styles.passportCard, shadows.sm]}
                  onPress={() => {
                    haptic.light();
                    if (pet.id.startsWith('clerk-pet-')) {
                      // Navigate to general pet records or book
                      router.push('/appointments/new' as never);
                    } else {
                      router.push(`/pets/${pet.id}` as never);
                    }
                  }}
                >
                  {/* Card Header Row */}
                  <View style={styles.cardHeaderRow}>
                    <PopoutPetAvatar
                      avatarId={pet.avatarId}
                      species={pet.species as any}
                      photoUrl={pet.photoUrl}
                      size={60}
                    />

                    <View style={styles.petIdentity}>
                      <View style={styles.nameRow}>
                        <Text style={styles.petName} numberOfLines={1}>
                          {pet.name}
                        </Text>
                        <View style={styles.speciesPill}>
                          <Text style={styles.speciesPillText}>
                            {isDog ? 'Canine' : 'Feline'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.petBreed} numberOfLines={1}>
                        {pet.breed || (isDog ? 'Dog' : 'Cat')}
                        {pet.gender
                          ? ` · ${pet.gender === 'male' ? 'Male ♂' : 'Female ♀'}`
                          : ''}
                      </Text>
                    </View>

                    <View style={styles.arrowButton}>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  </View>

                  {/* Status Badges Row */}
                  <View style={styles.badgesRow}>
                    {/* Anti-Rabies Status */}
                    {pet.isVaccinated ? (
                      <View style={styles.vaccineBadgeGreen}>
                        <Ionicons name="shield-checkmark" size={13} color={colors.success} />
                        <Text style={styles.vaccineBadgeTextGreen}>Anti-Rabies Up-to-Date</Text>
                      </View>
                    ) : (
                      <View style={styles.vaccineBadgeAmber}>
                        <Ionicons name="alert-circle" size={13} color={colors.warning} />
                        <Text style={styles.vaccineBadgeTextAmber}>Needs Anti-Rabies Shot</Text>
                      </View>
                    )}

                    {/* Age Badge */}
                    {ageText ? (
                      <View style={styles.metaBadge}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                        <Text style={styles.metaBadgeText}>{ageText}</Text>
                      </View>
                    ) : null}

                    {/* Weight / Status Badge */}
                    {pet.isSpayedNeutered ? (
                      <View style={styles.metaBadge}>
                        <Ionicons name="cut-outline" size={12} color={colors.info} />
                        <Text style={styles.metaBadgeText}>Spayed/Neutered</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Card Quick Action Footer */}
                  <View style={styles.cardFooter}>
                    <Pressable
                      style={styles.bookShortcutBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        haptic.light();
                        router.push({
                          pathname: '/appointments/new',
                          params: { petId: pet.id, petName: pet.name },
                        } as never);
                      }}
                    >
                      <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                      <Text style={styles.bookShortcutText}>Book Clinic Visit</Text>
                    </Pressable>

                    <Text style={styles.passportLinkText}>View Passport →</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </Screen>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: 4,
  },
  titleWrap: {
    flex: 1,
  },
  screenTitle: {
    ...typography.heading1,
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  screenSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    marginTop: 2,
  },
  addPetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  addPetBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  addPetBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12.5,
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statSegment: {
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(7, 30, 38, 0.08)',
  },
  filterSection: {
    marginBottom: spacing.md,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 10,
  },
  filterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipActiveAmber: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  filterChipText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 12,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  filterChipTextActiveAmber: {
    color: colors.white,
    fontWeight: '700',
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyHeading: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    marginTop: 8,
  },
  emptyActionBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 13,
  },
  noResultsBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  noResultsTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  noResultsSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
  },
  petsList: {
    gap: 12,
  },
  passportCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  petIdentity: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  speciesPill: {
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  speciesPillText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 10,
  },
  petBreed: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
  },
  arrowButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vaccineBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  vaccineBadgeTextGreen: {
    ...typography.captionBold,
    color: colors.success,
    fontSize: 10.5,
  },
  vaccineBadgeAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  vaccineBadgeTextAmber: {
    ...typography.captionBold,
    color: colors.warning,
    fontSize: 10.5,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  metaBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(7, 30, 38, 0.04)',
    marginTop: 2,
  },
  bookShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  bookShortcutText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
  },
  passportLinkText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 11.5,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});
