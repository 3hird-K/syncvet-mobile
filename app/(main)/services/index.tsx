import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { SERVICES, SERVICE_LOCATION, type ServiceDef } from '@lib/services';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { PopoutPetAvatar } from '@components/ui/PopoutPetAvatar';
import { ServicesScreenSkeleton } from '@components/ui/Skeleton';

const SERVICE_TAGS: Record<string, { label: string; bg: string; color: string }> = {
  vaccination: { label: 'Free City Program', bg: 'rgba(16, 185, 129, 0.12)', color: colors.success },
  'spay-neuter': { label: 'Free Kapon Initiative', bg: 'rgba(37, 99, 235, 0.12)', color: '#2563EB' },
  consultation: { label: 'General Wellness', bg: 'rgba(0, 168, 150, 0.12)', color: colors.primary },
  deworming: { label: 'Parasite Control', bg: 'rgba(245, 158, 11, 0.12)', color: colors.warning },
  'pet-registration': { label: 'Official Passport', bg: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' },
  other: { label: 'Municipal Care', bg: 'rgba(7, 30, 38, 0.08)', color: colors.textSecondary },
};

export default function ServicesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pet?: string }>();
  const { user: clerkUser } = useUser();
  const { loading, loaded } = useResidentData();
  const ownerId = useAuthStore((state) => state.user?.id) || 'cdo-resident-user';
  const localPets = useDataStore((state) => state.pets);

  // Load strictly user's real registered pets from Clerk metadata
  const userPets = useMemo(() => {
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];
    return metaPets.map((p: any, idx: number) => ({
      id: p.id || `clerk-pet-${idx}`,
      ownerId,
      name: p.name || 'My Pet',
      species: p.species || 'dog',
      breed: p.breed || '',
      avatarId: p.avatarId,
      photoUrl: p.photoUrl,
      isVaccinated: Boolean(p.isVaccinated),
    }));
  }, [clerkUser?.unsafeMetadata, ownerId]);

  const [selectedPetId, setSelectedPetId] = useState<string | undefined>(
    params.pet || (userPets.length > 0 ? userPets[0].id : undefined),
  );

  const selectedPet = useMemo(
    () => userPets.find((p) => p.id === selectedPetId),
    [userPets, selectedPetId],
  );

  const handleBookService = (serviceId: string) => {
    haptic.light();
    router.push({
      pathname: '/appointments/new',
      params: {
        serviceId,
        petId: selectedPetId || undefined,
        petName: selectedPet?.name || undefined,
      },
    } as never);
  };

  if (loading && !loaded && userPets.length === 0) {
    return (
      <AnimatedScreen animation="zoom">
        <ServicesScreenSkeleton />
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

          {/* Title & Book Visit Action Row */}
          <View style={styles.headerTitleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.heroTitle}>Services</Text>
              <Text style={styles.heroSubtitle}>
                Official municipal pet health, immunization, and clinical programs
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Book new visit"
              onPress={() => {
                haptic.light();
                router.push({
                  pathname: '/appointments/new',
                  params: {
                    petId: selectedPetId || undefined,
                    petName: selectedPet?.name || undefined,
                  },
                } as never);
              }}
              hitSlop={6}
              style={({ pressed }) => [styles.headerCtaBtn, pressed && styles.headerCtaBtnPressed]}
            >
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={styles.headerCtaBtnText}>Book Visit</Text>
            </Pressable>
          </View>
        </View>

        {/* 2. Registered Patient Selector Carousel */}
        {userPets.length > 0 && (
          <View style={styles.patientSelectorSection}>
            <View style={styles.patientSelectorHeader}>
              <Text style={styles.patientSelectorTitle}>Select Patient</Text>
              {selectedPet && (
                <Pressable
                  onPress={() => {
                    haptic.light();
                    setSelectedPetId(undefined);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.clearSelectionText}>Clear selection</Text>
                </Pressable>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storiesScroll}
            >
              {userPets.map((pet) => {
                const isSelected = pet.id === selectedPetId;
                const isDog = pet.species?.toLowerCase() === 'dog';
                const frameColor = isDog ? colors.primary : '#DB2777';

                return (
                  <Pressable
                    key={pet.id}
                    onPress={() => {
                      haptic.light();
                      setSelectedPetId(isSelected ? undefined : pet.id);
                    }}
                    style={[
                      styles.patientPill,
                      isSelected && styles.patientPillActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.avatarWrap,
                        isSelected && styles.avatarWrapActive,
                      ]}
                    >
                      <PopoutPetAvatar
                        avatarId={pet.avatarId}
                        species={pet.species}
                        photoUrl={pet.photoUrl}
                        size={52}
                        scale={1.35}
                      />
                      {isSelected && (
                        <View
                          style={[
                            styles.activeCheckmarkBadge,
                            { backgroundColor: frameColor },
                          ]}
                        >
                          <Ionicons name="checkmark" size={11} color={colors.white} />
                        </View>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.storyPetName,
                        isSelected && { color: frameColor, fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {pet.name}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Add Pet Story Shortcut */}
              <Pressable
                onPress={() => {
                  haptic.light();
                  router.push('/pets/add' as never);
                }}
                style={styles.addPatientPill}
              >
                <View style={styles.addStoryCircle}>
                  <Ionicons name="add" size={20} color={colors.primary} />
                </View>
                <Text style={styles.addStoryName}>Add Pet</Text>
              </Pressable>
            </ScrollView>

            {/* Selected Patient Banner Hint */}
            {selectedPet && (
              <View style={styles.selectedPatientBanner}>
                <Text style={styles.selectedPatientBannerText}>
                  Booking for <Text style={styles.selectedPatientHighlight}>{selectedPet.name}</Text> ({selectedPet.breed || (selectedPet.species === 'dog' ? 'Canine' : 'Feline')})
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 3. Modern Municipal Ordinance Highlight Banner */}
        <View style={[styles.modernOrdinanceCard, shadows.sm]}>
          <View style={styles.ordinanceTagRow}>
            <View style={styles.ordinanceTagPill}>
              <Text style={styles.ordinanceTagText}>MUNICIPAL HEALTH ORDINANCE</Text>
            </View>
            <Text style={styles.ordinanceCityText}>CDO City Vet</Text>
          </View>

          <Text style={styles.ordinanceTitle}>Free Anti-Rabies & Kapon Programs</Text>
          <Text style={styles.ordinanceDesc}>
            Available year-round for all registered dogs and cats at the City Veterinary Office.
          </Text>
        </View>

        {/* Services List */}
        <View style={styles.servicesContainer}>
          <Text style={styles.sectionLabel}>Available Clinical Services</Text>

          {SERVICES.map((service) => {
            const tag = SERVICE_TAGS[service.id] || SERVICE_TAGS.other;
            return (
              <Pressable
                key={service.id}
                onPress={() => handleBookService(service.id)}
                style={({ pressed }) => [
                  styles.serviceCard,
                  shadows.sm,
                  pressed && styles.serviceCardPressed,
                ]}
              >
                {/* Card Top Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.serviceIconWrap, { backgroundColor: service.bg }]}>
                    <Ionicons name={service.icon} size={22} color={service.color} />
                  </View>

                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                  </View>

                  <View style={[styles.badgePill, { backgroundColor: tag.bg }]}>
                    <Text style={[styles.badgePillText, { color: tag.color }]}>
                      {tag.label}
                    </Text>
                  </View>
                </View>

                {/* Subtitle Tagline */}
                <Text style={styles.serviceTagline}>{service.tagline}</Text>

                {/* Service Description */}
                <Text style={styles.serviceDescription}>
                  {service.description}
                </Text>

                {/* Bottom Action Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.locationMeta}>
                    <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.locationMetaText}>{SERVICE_LOCATION}</Text>
                  </View>

                  <View style={styles.bookActionRow}>
                    <Text style={styles.bookActionText}>
                      {selectedPet ? `Book for ${selectedPet.name}` : service.cta}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Official Clinic Contact Information Hub */}
        <View style={[styles.infoHubCard, shadows.sm]}>
          <View style={styles.infoHubHeader}>
            <Ionicons name="business" size={18} color={colors.primary} />
            <Text style={styles.infoHubTitle}>City Veterinary Office Station</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.infoText}>Monday to Friday · 8:00 AM – 5:00 PM</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="map-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.infoText}>CVO Compound, Cagayan de Oro City</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.infoText}>Municipal Veterinary Hotline: (088) 857-4100</Text>
          </View>
        </View>
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
  headerCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8.5,
    borderRadius: radius.pill,
    ...shadows.sm,
  },
  headerCtaBtnPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  headerCtaBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12.5,
  },
  patientSelectorSection: {
    marginBottom: spacing.md,
    gap: 8,
  },
  patientSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientSelectorTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  clearSelectionText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  storiesScroll: {
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  patientPill: {
    alignItems: 'center',
    gap: 5,
    width: 64,
  },
  patientPillActive: {
    transform: [{ scale: 1.04 }],
  },
  addPatientPill: {
    alignItems: 'center',
    gap: 5,
    width: 64,
  },
  avatarWrap: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarWrapActive: {
    transform: [{ scale: 1.06 }],
  },
  activeCheckmarkBadge: {
    position: 'absolute',
    bottom: -1,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  storyPetName: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 11.5,
    textAlign: 'center',
  },
  addStoryCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 168, 150, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStoryName: {
    ...typography.small,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedPatientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 168, 150, 0.07)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.15)',
    marginTop: 2,
  },
  selectedPatientBannerText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 12,
  },
  selectedPatientHighlight: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  modernOrdinanceCard: {
    backgroundColor: '#F0FAF7',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.18)',
    marginBottom: spacing.lg,
    gap: 6,
  },
  ordinanceTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ordinanceTagPill: {
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  ordinanceTagText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  ordinanceCityText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  ordinanceTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  ordinanceDesc: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  servicesContainer: {
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    gap: 10,
  },
  serviceCardPressed: {
    backgroundColor: '#F8FCFB',
    transform: [{ scale: 0.99 }],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  serviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: {
    flex: 1,
  },
  serviceName: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  serviceTagline: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 13,
    marginTop: -2,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgePillText: {
    ...typography.captionBold,
    fontSize: 10,
    fontWeight: '700',
  },
  serviceDescription: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: -4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(7, 30, 38, 0.08)',
  },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationMetaText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  bookActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookActionText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  infoHubCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    gap: 8,
  },
  infoHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  infoHubTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
  },
});
