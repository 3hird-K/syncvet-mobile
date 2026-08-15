import React, { useCallback, useMemo, useState } from 'react';
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
import { formatShortDate, formatWeekdayDate } from '@lib/format';
import { haptic } from '@lib/haptics';
import { toast } from '@components/ui/Sonner';
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
  const appointments = useDataStore((state) => state.appointments);

  // Load user's real registered pets with offline support
  const userPets = useMemo(() => {
    if (localPets && localPets.length > 0) {
      return localPets;
    }
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
      isSpayedNeutered: Boolean(p.isSpayedNeutered),
    }));
  }, [localPets, clerkUser?.unsafeMetadata, ownerId]);

  const [selectedPetId, setSelectedPetId] = useState<string | undefined>(
    params.pet || (userPets.length > 0 ? userPets[0].id : undefined),
  );

  const selectedPet = useMemo(
    () => userPets.find((p) => p.id === selectedPetId),
    [userPets, selectedPetId],
  );

  // Active appointments for the selected pet (status is not cancelled or completed)
  const activePetAppointments = useMemo(() => {
    if (!selectedPetId && !selectedPet?.name) return [];
    const pool = appointments && appointments.length > 0
      ? appointments
      : (((clerkUser?.unsafeMetadata as any)?.appointments || []) as any[]);

    return pool.filter((a) => {
      if (!a) return false;
      const isFinished = a.status === 'cancelled' || a.status === 'completed';
      if (isFinished) return false;
      const matchesId = a.petId === selectedPetId;
      const matchesName = selectedPet?.name
        ? (a.petName || '').toLowerCase().trim() === selectedPet.name.toLowerCase().trim()
        : false;
      return matchesId || matchesName;
    });
  }, [appointments, clerkUser?.unsafeMetadata, selectedPetId, selectedPet?.name]);

  // Map of serviceId -> active appointment for the selected pet
  const activeServiceAppointmentsMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const appt of activePetAppointments) {
      if (appt.serviceId) {
        map.set(appt.serviceId, appt);
      }
    }
    return map;
  }, [activePetAppointments]);

  const handleBookService = (serviceId: string) => {
    if (serviceId === 'spay-neuter' && selectedPet?.isSpayedNeutered) {
      haptic.warning();
      toast.info('Already Spayed / Neutered', {
        id: 'services-spay-disabled',
        description: `${selectedPet.name} is already recorded as spayed/neutered.`,
      });
      return;
    }

    const existingAppt = activeServiceAppointmentsMap.get(serviceId);
    if (existingAppt) {
      haptic.warning();
      const sDef = SERVICES.find((s) => s.id === serviceId);
      toast.info('Service Already Scheduled', {
        id: 'services-duplicate-disabled',
        description: `${selectedPet?.name || 'This pet'} already has an active ${sDef?.name || 'service'} appointment on ${existingAppt.date ? formatWeekdayDate(existingAppt.date) : 'file'}.`,
      });
      return;
    }

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

  const [scheduledExpanded, setScheduledExpanded] = useState(false);

  // Partition services into scheduled vs available for the active pet
  const scheduledServices = useMemo(() => {
    return SERVICES.filter((service) => activeServiceAppointmentsMap.has(service.id)).sort(
      (a, b) => {
        const dateA = activeServiceAppointmentsMap.get(a.id)?.date || '';
        const dateB = activeServiceAppointmentsMap.get(b.id)?.date || '';
        return dateA.localeCompare(dateB);
      },
    );
  }, [activeServiceAppointmentsMap]);

  const availableServices = useMemo(() => {
    return SERVICES.filter((service) => !activeServiceAppointmentsMap.has(service.id));
  }, [activeServiceAppointmentsMap]);

  const displayedScheduledServices = useMemo(() => {
    if (scheduledExpanded) return scheduledServices;
    return scheduledServices.slice(0, 2);
  }, [scheduledServices, scheduledExpanded]);

  const renderServiceCard = (service: ServiceDef) => {
    const tag = SERVICE_TAGS[service.id] || SERVICE_TAGS.other;
    const isSpayNeuterDisabled = Boolean(
      selectedPet?.isSpayedNeutered && service.id === 'spay-neuter',
    );
    const existingAppt = activeServiceAppointmentsMap.get(service.id);
    const isDuplicateScheduled = Boolean(existingAppt);
    const isDisabled = isSpayNeuterDisabled || isDuplicateScheduled;

    return (
      <Pressable
        key={service.id}
        onPress={() => handleBookService(service.id)}
        style={({ pressed }) => [
          styles.serviceCard,
          isDisabled && styles.serviceCardDisabled,
          shadows.sm,
          pressed && !isDisabled && styles.serviceCardPressed,
        ]}
      >
        {/* Card Top Row */}
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.serviceIconWrap,
              {
                backgroundColor: isSpayNeuterDisabled
                  ? '#F1F5F9'
                  : isDuplicateScheduled
                  ? 'rgba(14, 116, 144, 0.08)'
                  : service.bg,
              },
            ]}
          >
            <Ionicons
              name={
                isSpayNeuterDisabled
                  ? 'checkmark-circle'
                  : isDuplicateScheduled
                  ? 'calendar'
                  : service.icon
              }
              size={22}
              color={
                isSpayNeuterDisabled
                  ? colors.success
                  : isDuplicateScheduled
                  ? colors.info
                  : service.color
              }
            />
          </View>

          <View style={styles.cardTitleWrap}>
            <Text
              style={[
                styles.serviceName,
                isDisabled && styles.serviceNameDisabled,
              ]}
            >
              {service.name}
            </Text>
          </View>

          <View
            style={[
              styles.badgePill,
              {
                backgroundColor: isSpayNeuterDisabled
                  ? 'rgba(16, 185, 129, 0.12)'
                  : isDuplicateScheduled
                  ? 'rgba(14, 116, 144, 0.12)'
                  : tag.bg,
              },
            ]}
          >
            <Text
              style={[
                styles.badgePillText,
                {
                  color: isSpayNeuterDisabled
                    ? colors.success
                    : isDuplicateScheduled
                    ? colors.info
                    : tag.color,
                },
              ]}
            >
              {isSpayNeuterDisabled
                ? 'Kapon'
                : isDuplicateScheduled
                ? 'Scheduled'
                : tag.label}
            </Text>
          </View>
        </View>

        {/* Subtitle Tagline */}
        <Text style={styles.serviceTagline}>
          {isSpayNeuterDisabled
            ? `${selectedPet?.name || 'Pet'} is already spayed/neutered.`
            : isDuplicateScheduled
            ? `Appointment scheduled on ${formatShortDate(existingAppt.date)}.`
            : service.tagline}
        </Text>

        {/* Service Description */}
        <Text style={styles.serviceDescription}>
          {isSpayNeuterDisabled
            ? `${selectedPet?.name || 'Your pet'} has already undergone surgical spaying/neutering. No further Kapon procedure is required.`
            : isDuplicateScheduled
            ? `${selectedPet?.name || 'Your pet'} has an active appointment on ${existingAppt.date ? formatWeekdayDate(existingAppt.date) : 'file'}${existingAppt.timeSlot ? ` (${existingAppt.timeSlot})` : ''}. You can schedule another service or await completion.`
            : service.description}
        </Text>

        {/* Bottom Action Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.locationMeta}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.locationMetaText}>{SERVICE_LOCATION}</Text>
          </View>

          <View style={styles.bookActionRow}>
            <Text
              style={[
                styles.bookActionText,
                isDisabled && styles.bookActionTextDisabled,
                isDuplicateScheduled && { color: colors.info },
              ]}
            >
              {isSpayNeuterDisabled
                ? 'Already Completed'
                : isDuplicateScheduled
                ? 'Already Scheduled'
                : selectedPet
                ? `Book for ${selectedPet.name}`
                : service.cta}
            </Text>
            <Ionicons
              name={
                isSpayNeuterDisabled
                  ? 'checkmark'
                  : isDuplicateScheduled
                  ? 'calendar-outline'
                  : 'arrow-forward'
              }
              size={14}
              color={
                isSpayNeuterDisabled
                  ? colors.success
                  : isDuplicateScheduled
                  ? colors.info
                  : colors.primary
              }
            />
          </View>
        </View>
      </Pressable>
    );
  };

  const handleRefresh = useCallback(async () => {
    haptic.light();
    try {
      await clerkUser?.reload();
      if (clerkUser?.id) {
        await useDataStore.getState().loadAll(clerkUser.id);
      }
    } catch (e) {
      console.log('Services refresh error:', e);
    }
  }, [clerkUser]);

  if (loading && !loaded && userPets.length === 0) {
    return (
      <AnimatedScreen animation="zoom">
        <ServicesScreenSkeleton />
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen animation="zoom">
      <Screen scroll onRefresh={handleRefresh}>
        {/* 1. Senior Executive Municipal Header */}
        <View style={styles.topHeader}>
          {/* Eyebrow badge */}
          {/* <View style={styles.eyebrowBadge}>
            <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
            <Text style={styles.eyebrowText}>CITY VETERINARY OFFICE · CDO</Text>
          </View> */}

          {/* Title & Book Visit Action Row */}
          <View style={styles.headerTitleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.heroTitle}>Services</Text>
              <Text style={styles.heroSubtitle}>
                Municipal Pet Health & Immunization Programs
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

          {/* 1. Scheduled services for this pet (top 2 by default, remainder in dropdown) */}
          {displayedScheduledServices.map(renderServiceCard)}

          {/* Dropdown toggle button if more than 2 scheduled services */}
          {scheduledServices.length > 2 && (
            <Pressable
              onPress={() => {
                haptic.light();
                setScheduledExpanded((prev) => !prev);
              }}
              style={[styles.expandDropdownBtn, shadows.sm]}
              accessibilityRole="button"
              accessibilityLabel={
                scheduledExpanded
                  ? 'Show fewer scheduled bookings'
                  : `Show all ${scheduledServices.length} scheduled bookings`
              }
            >
              <View style={styles.expandDropdownLeft}>
                <Ionicons
                  name={scheduledExpanded ? 'chevron-up-circle' : 'chevron-down-circle'}
                  size={17}
                  color={colors.info}
                />
                <Text style={styles.expandDropdownBtnText}>
                  {scheduledExpanded
                    ? 'Show Fewer Scheduled Bookings'
                    : `Show All Scheduled Bookings (${scheduledServices.length})`}
                </Text>
              </View>
              <View style={styles.expandDropdownBadge}>
                <Text style={styles.expandDropdownBadgeText}>
                  {scheduledExpanded ? 'Collapse' : `+${scheduledServices.length - 2} more`}
                </Text>
              </View>
            </Pressable>
          )}

          {/* 2. Available services open for booking */}
          {availableServices.map(renderServiceCard)}
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
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 20,
    fontFamily: typography.font.bold,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  headerCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    borderRadius: radius.pill,
    ...shadows.sm,
  },
  headerCtaBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  headerCtaBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
    fontFamily: typography.font.bold,
  },
  patientSelectorSection: {
    marginBottom: spacing.md,
    gap: 6,
  },
  patientSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientSelectorTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13.5,
    fontFamily: typography.font.bold,
  },
  clearSelectionText: {
    ...typography.small,
    color: colors.primaryDark,
    fontSize: 11.5,
    fontFamily: typography.font.bold,
  },
  storiesScroll: {
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  patientPill: {
    alignItems: 'center',
    gap: 4,
    width: 62,
  },
  patientPillActive: {
    transform: [{ scale: 1.04 }],
  },
  addPatientPill: {
    alignItems: 'center',
    gap: 4,
    width: 62,
  },
  avatarWrap: {
    width: 50,
    height: 50,
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
    width: 17,
    height: 17,
    borderRadius: 8.5,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 168, 150, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStoryName: {
    ...typography.small,
    color: colors.primaryDark,
    fontSize: 11,
    fontFamily: typography.font.bold,
    textAlign: 'center',
  },
  selectedPatientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 168, 150, 0.07)',
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.15)',
    marginTop: 2,
  },
  selectedPatientBannerText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 11.5,
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
    marginBottom: spacing.md,
    gap: 5,
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
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 14.5,
    fontFamily: typography.font.bold,
  },
  ordinanceDesc: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
  },
  servicesContainer: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14.5,
    fontFamily: typography.font.bold,
    marginBottom: 2,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    gap: 8,
  },
  serviceCardDisabled: {
    opacity: 0.65,
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(7, 30, 38, 0.05)',
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
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: {
    flex: 1,
  },
  serviceName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: typography.font.bold,
  },
  serviceNameDisabled: {
    color: colors.textSecondary,
  },
  serviceTagline: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 12,
    marginTop: -2,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
  },
  badgePillText: {
    ...typography.captionBold,
    fontSize: 10,
    fontFamily: typography.font.bold,
  },
  serviceDescription: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16.5,
    marginTop: -2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
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
    fontSize: 10.5,
  },
  bookActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookActionText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 12,
    fontFamily: typography.font.bold,
  },
  bookActionTextDisabled: {
    color: colors.success,
  },
  expandDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(14, 116, 144, 0.18)',
    borderStyle: 'dashed',
    marginVertical: 2,
  },
  expandDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandDropdownBtnText: {
    ...typography.captionBold,
    color: colors.info,
    fontSize: 12.5,
    fontFamily: typography.font.bold,
  },
  expandDropdownBadge: {
    backgroundColor: 'rgba(14, 116, 144, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  expandDropdownBadgeText: {
    ...typography.captionBold,
    color: colors.info,
    fontSize: 10.5,
    fontFamily: typography.font.bold,
  },
  infoHubCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    gap: 6,
  },
  infoHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 2,
  },
  infoHubTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: typography.font.bold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
});
