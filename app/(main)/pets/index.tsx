import React, { useMemo, useState } from 'react';
import {
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
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { ageFromBirthYear, formatAge } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { PetsScreenSkeleton } from '@components/ui/Skeleton';
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
      <AnimatedScreen animation="zoom">
        <PetsScreenSkeleton />
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen animation="zoom">
      <Screen scroll>
        {/* 1. Senior Executive Municipal Header */}
        <View style={styles.topHeader}>
          {/* Eyebrow badge */}
          <View style={styles.eyebrowBadge}>
            <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
            <Text style={styles.eyebrowText}>CITY VETERINARY OFFICE · CDO</Text>
          </View>

          {/* Title & Add Pet Button Row */}
          <View style={styles.headerTitleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.heroTitle}>Pet Registry</Text>
              <Text style={styles.heroSubtitle}>
                Official digital health passports & immunization records
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Register a new pet"
              onPress={() => {
                haptic.light();
                router.push('/pets/add' as never);
              }}
              hitSlop={6}
              style={({ pressed }) => [styles.addPetBtn, pressed && styles.addPetBtnPressed]}
            >
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={styles.addPetBtnText}>Register Pet</Text>
            </Pressable>
          </View>
        </View>

        {/* 2. Unified Health Registry Overview Dashboard */}
        {allPets.length > 0 ? (
          <View style={[styles.dashboardCard, shadows.sm]}>
            {/* Top compliance notice */}
            <View style={styles.complianceRow}>
              <View
                style={[
                  styles.complianceIconRing,
                  needsVaccineCount === 0 ? styles.complianceRingGreen : styles.complianceRingAmber,
                ]}
              >
                <Ionicons
                  name={needsVaccineCount === 0 ? 'shield-checkmark' : 'alert-circle'}
                  size={18}
                  color={needsVaccineCount === 0 ? colors.success : colors.warning}
                />
              </View>
              <View style={styles.complianceTextCol}>
                <Text style={styles.complianceTitle}>
                  {needsVaccineCount === 0
                    ? '100% Immunization Protected'
                    : `${needsVaccineCount} ${needsVaccineCount === 1 ? 'Pet Needs' : 'Pets Need'} Anti-Rabies`}
                </Text>
                <Text style={styles.complianceSub}>
                  {needsVaccineCount === 0
                    ? 'All registered pets have up-to-date rabies protection.'
                    : 'Free rabies vaccines available under City Ordinance.'}
                </Text>
              </View>
            </View>

            {/* Micro-Stats Segmented Grid */}
            <View style={styles.metricsRow}>
              <View style={styles.metricSegment}>
                <Text style={styles.metricNumber}>{allPets.length}</Text>
                <Text style={styles.metricLabel}>Total</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricSegment}>
                <Text style={styles.metricNumber}>{dogCount}</Text>
                <Text style={styles.metricLabel}>Dogs</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricSegment}>
                <Text style={styles.metricNumber}>{catCount}</Text>
                <Text style={styles.metricLabel}>Cats</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricSegment}>
                <Text
                  style={[
                    styles.metricNumber,
                    needsVaccineCount > 0 ? { color: colors.warning } : { color: colors.success },
                  ]}
                >
                  {needsVaccineCount > 0 ? needsVaccineCount : '0'}
                </Text>
                <Text style={styles.metricLabel}>Due</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* 3. Search & Filter Controls */}
        {allPets.length > 0 ? (
          <View style={styles.filterSection}>
            {/* Search Input Bar */}
            <View
              style={[
                styles.searchBar,
                isSearchFocused && styles.searchBarFocused,
              ]}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={isSearchFocused ? colors.primary : colors.textMuted}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search by pet name, breed, or species..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                clearButtonMode="while-editing"
              />
              {searchQuery ? (
                <Pressable
                  onPress={() => {
                    haptic.light();
                    setSearchQuery('');
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={17} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* Filter Pills Scroll */}
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
                style={[
                  styles.filterChip,
                  activeFilter === 'all' && styles.filterChipActive,
                ]}
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
                style={[
                  styles.filterChip,
                  activeFilter === 'dog' && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'dog' && styles.filterChipTextActive,
                  ]}
                >
                  Dogs ({dogCount})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  haptic.light();
                  setActiveFilter('cat');
                }}
                style={[
                  styles.filterChip,
                  activeFilter === 'cat' && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'cat' && styles.filterChipTextActive,
                  ]}
                >
                  Cats ({catCount})
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
                    Needs Shot ({needsVaccineCount})
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        ) : null}

        {/* 4. Empty States & Pet Passport Cards */}
        {allPets.length === 0 ? (
          <View style={[styles.emptyContainer, shadows.sm]}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="paw" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyHeading}>No pets registered yet</Text>
            <Text style={styles.emptyDescription}>
              Register your dog or cat with the City Veterinary Office to track vaccinations, generate official health passports, and schedule clinic checkups.
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
            <View style={styles.noResultsIconWrap}>
              <Ionicons name="search" size={24} color={colors.textMuted} />
            </View>
            <Text style={styles.noResultsTitle}>No matching pets found</Text>
            <Text style={styles.noResultsSubtitle}>Try searching with a different name, breed, or filter.</Text>
          </View>
        ) : (
          /* Staggered Animated Pet Passport List */
          <View style={styles.petsList}>
            {filteredPets.map((pet, idx) => {
              const isDog = pet.species?.toLowerCase() === 'dog';
              const ageText = pet.birthYear
                ? formatAge(ageFromBirthYear(pet.birthYear))
                : undefined;
              const genderLabel = pet.gender === 'male' ? 'Male ♂' : pet.gender === 'female' ? 'Female ♀' : undefined;

              return (
                <Animated.View
                  key={pet.id}
                  entering={FadeInDown.delay(idx * 40).duration(200)}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.passportCard,
                      shadows.sm,
                      pressed && styles.passportCardPressed,
                    ]}
                    onPress={() => {
                      haptic.light();
                      router.push(`/pets/${pet.id}` as never);
                    }}
                  >
                    {/* Header Row: 3D Avatar + Name + Tags + Chevron */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.avatarHolder}>
                        <PopoutPetAvatar
                          avatarId={pet.avatarId}
                          species={pet.species as any}
                          photoUrl={pet.photoUrl}
                          size={54}
                          scale={1.25}
                        />
                      </View>

                      <View style={styles.petIdentity}>
                        <View style={styles.nameRow}>
                          <Text style={styles.petName} numberOfLines={1}>
                            {pet.name}
                          </Text>
                          <View
                            style={[
                              styles.speciesBadge,
                              isDog ? styles.speciesBadgeDog : styles.speciesBadgeCat,
                            ]}
                          >
                            <Text
                              style={[
                                styles.speciesBadgeText,
                                isDog ? styles.speciesBadgeTextDog : styles.speciesBadgeTextCat,
                              ]}
                            >
                              {isDog ? 'Canine' : 'Feline'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.petBreed} numberOfLines={1}>
                          {pet.breed || (isDog ? 'Dog' : 'Cat')}
                          {genderLabel ? ` · ${genderLabel}` : ''}
                        </Text>
                      </View>

                      <View style={styles.chevronButton}>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                      </View>
                    </View>

                    {/* Immunization & Vital Status Row */}
                    <View style={styles.statusChipsRow}>
                      {/* Anti-Rabies Protection Status */}
                      {pet.isVaccinated ? (
                        <View style={styles.vaxBadgeGreen}>
                          <Ionicons name="shield-checkmark" size={13} color={colors.success} />
                          <Text style={styles.vaxBadgeTextGreen}>Anti-Rabies Protected</Text>
                        </View>
                      ) : (
                        <View style={styles.vaxBadgeAmber}>
                          <Ionicons name="alert-circle" size={13} color={colors.warning} />
                          <Text style={styles.vaxBadgeTextAmber}>Anti-Rabies Due · 0 Doses</Text>
                        </View>
                      )}

                      {/* Age Chip */}
                      {ageText ? (
                        <View style={styles.vitalChip}>
                          <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
                          <Text style={styles.vitalChipText}>{ageText}</Text>
                        </View>
                      ) : null}

                      {/* Spayed/Neutered Chip */}
                      {pet.isSpayedNeutered ? (
                        <View style={styles.vitalChip}>
                          <Ionicons name="checkmark-done" size={11} color={colors.primary} />
                          <Text style={styles.vitalChipText}>Neutered</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Card Action Footer */}
                    <View style={styles.cardFooter}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.bookShortcutBtn,
                          pressed && styles.bookShortcutBtnPressed,
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          haptic.light();
                          router.push({
                            pathname: '/appointments/new',
                            params: { petId: pet.id, petName: pet.name },
                          } as never);
                        }}
                      >
                        <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                        <Text style={styles.bookShortcutText}>Book Visit</Text>
                      </Pressable>

                      <View style={styles.viewPassportLink}>
                        <Text style={styles.passportLinkText}>View Passport</Text>
                        <Ionicons name="arrow-forward" size={12} color={colors.primaryDark} />
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
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
    marginBottom: spacing.md,
    paddingTop: 4,
    gap: 6,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
  },
  eyebrowText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    ...typography.heading1,
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 16,
  },
  addPetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8.5,
    borderRadius: radius.pill,
    ...shadows.sm,
  },
  addPetBtnPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  addPetBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12.5,
  },
  dashboardCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 12,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  complianceIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  complianceRingGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  complianceRingAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  complianceTextCol: {
    flex: 1,
    gap: 1,
  },
  complianceTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  complianceSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(7, 30, 38, 0.02)',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.04)',
  },
  metricSegment: {
    alignItems: 'center',
    flex: 1,
    gap: 1,
  },
  metricNumber: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 20,
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
    borderWidth: 1.5,
    borderColor: 'rgba(7, 30, 38, 0.07)',
    gap: 8,
  },
  searchBarFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
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
    paddingVertical: 36,
    gap: 6,
  },
  noResultsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 11,
  },
  passportCardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    transform: [{ scale: 0.995 }],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarHolder: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petIdentity: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  petName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  speciesBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  speciesBadgeDog: {
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
  },
  speciesBadgeCat: {
    backgroundColor: 'rgba(219, 39, 119, 0.10)',
  },
  speciesBadgeText: {
    ...typography.captionBold,
    fontSize: 10.5,
  },
  speciesBadgeTextDog: {
    color: colors.primary,
  },
  speciesBadgeTextCat: {
    color: '#DB2777',
  },
  petBreed: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '500',
  },
  chevronButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vaxBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
  },
  vaxBadgeTextGreen: {
    ...typography.captionBold,
    color: colors.success,
    fontSize: 10.5,
  },
  vaxBadgeAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
  },
  vaxBadgeTextAmber: {
    ...typography.captionBold,
    color: colors.warning,
    fontSize: 10.5,
  },
  vitalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
  },
  vitalChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: 'rgba(7, 30, 38, 0.04)',
  },
  bookShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: radius.pill,
  },
  bookShortcutBtnPressed: {
    backgroundColor: 'rgba(0, 168, 150, 0.16)',
  },
  bookShortcutText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11.5,
  },
  viewPassportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  passportLinkText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 12,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});
