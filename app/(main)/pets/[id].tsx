import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { getService } from '@lib/services';
import { formatShortDate, formatDateWithYear, formatWeekdayDate, ageFromBirthYear, formatAge } from '@lib/format';
import { haptic } from '@lib/haptics';
import { getPetAvatarSource } from '@lib/petAvatars';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { BackButton } from '@components/ui/BackButton';
import { StatusBadge } from '@components/ui/StatusBadge';
import { EmptyState } from '@components/ui/EmptyState';
import { Button } from '@components/ui/Button';
import { PetAvatarPickerModal } from '@components/ui/PetAvatarPickerModal';
import { PopoutPetAvatar } from '@components/ui/PopoutPetAvatar';
import { PetDeleteConfirmModal } from '@components/ui/PetDeleteConfirmModal';
import { PetEditInfoModal } from '@components/ui/PetEditInfoModal';
import { updateClerkUnsafeMetadata } from '@lib/clerkMetadata';
import { toast } from '@components/ui/Sonner';
import type { Pet } from '@services/data';

export default function PetProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: clerkUser } = useUser();
  const ownerId = useAuthStore((state) => state.user?.id);
  const pets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);
  const deletePet = useDataStore((state) => state.deletePet);

  // Modal States
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Metadata pets
  const metadataPets = useMemo(() => {
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const list = Array.isArray(metadata.pets) ? metadata.pets : [];
    return list.map((p: any, idx: number) => ({
      id: p.id || `clerk-pet-${idx}`,
      ownerId: ownerId || '',
      name: p.name || 'My Pet',
      species: p.species || 'dog',
      breed: p.breed || '',
      gender: p.gender || '',
      birthYear: p.birthYear,
      isVaccinated: Boolean(p.isVaccinated),
      isSpayedNeutered: Boolean(p.isSpayedNeutered),
      weightCategory: p.weightCategory || 'Medium',
      notes: p.notes,
      avatarId: p.avatarId,
      photoUrl: p.photoUrl,
      createdAt: p.createdAt || new Date().toISOString(),
    }));
  }, [clerkUser?.unsafeMetadata, ownerId]);

  const pet = useMemo(
    () => pets.find((p) => p.id === id) || metadataPets.find((p) => p.id === id),
    [pets, metadataPets, id],
  );

  const [customAvatarId, setCustomAvatarId] = useState<string | undefined>(pet?.avatarId);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | undefined>(pet?.photoUrl);

  const petAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.petId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [appointments, id],
  );

  const vaccineHistory = useMemo(
    () =>
      petAppointments.filter(
        (a) => a.serviceId === 'vaccination' && a.status !== 'cancelled',
      ),
    [petAppointments],
  );

  const vaxTimeline = useMemo(() => {
    const vaxAppts = (petAppointments || [])
      .filter((a) => a.serviceId === 'vaccination' && a.status !== 'cancelled')
      .sort((a, b) => b.date.localeCompare(a.date));

    const doseCount = vaxAppts.length;
    const isVaccinated = Boolean(pet?.isVaccinated) || doseCount > 0;
    const totalDoses = Math.max(isVaccinated ? 1 : 0, doseCount, (pet as any)?.vaccinationDoses || 0);

    let lastDate = vaxAppts[0]?.date || (pet as any)?.lastVaccinationDate;
    if (!lastDate && isVaccinated) {
      lastDate = pet?.createdAt ? pet.createdAt.split('T')[0] : '2025-08-14';
    }

    let nextBooster: string | undefined = (pet as any)?.nextVaccinationDate;
    if (!nextBooster && isVaccinated && lastDate) {
      try {
        const parts = lastDate.split('-');
        if (parts.length === 3) {
          const yr = parseInt(parts[0], 10);
          if (!isNaN(yr)) {
            nextBooster = `${yr + 1}-${parts[1]}-${parts[2]}`;
          }
        }
      } catch {
        nextBooster = undefined;
      }
    }

    return { isVaccinated, totalDoses, lastDate, nextBooster };
  }, [petAppointments, pet]);

  if (!pet) {
    return (
      <Screen scroll>
        <View style={styles.headerRow}>
          <BackButton />
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

  const isDog = pet.species?.toLowerCase() === 'dog';
  const ageText = pet.birthYear
    ? formatAge(ageFromBirthYear(pet.birthYear))
    : 'Unknown age';

  const avatarSource = getPetAvatarSource(
    customAvatarId || pet.avatarId,
    pet.species,
    customPhotoUrl || pet.photoUrl,
  );

  const handleAvatarChange = async (avatarId: string, customPhotoUri?: string) => {
    haptic.success();
    if (avatarId === 'custom' && customPhotoUri) {
      setCustomPhotoUrl(customPhotoUri);
      setCustomAvatarId(undefined);
    } else {
      setCustomAvatarId(avatarId);
      setCustomPhotoUrl(undefined);
    }

    // Update in Clerk metadata
    if (clerkUser) {
      const existingPets = ((clerkUser.unsafeMetadata?.pets as any[]) || []);
      const updatedPets = existingPets.map((p: any, idx: number) => {
        if ((p.id || `clerk-pet-${idx}`) === pet.id) {
          return {
            ...p,
            avatarId: avatarId === 'custom' ? undefined : avatarId,
            photoUrl: customPhotoUri || (avatarId === 'custom' ? p.photoUrl : undefined),
          };
        }
        return p;
      });

      await updateClerkUnsafeMetadata(clerkUser, {
        pets: updatedPets,
      });
    }

    toast.success(`${pet.name}’s avatar updated!`, {
      description: 'New 3D profile picture is now active.',
    });
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (ownerId) {
        await deletePet(ownerId, pet.id);
      }

      if (clerkUser) {
        const existingPets = ((clerkUser.unsafeMetadata?.pets as any[]) || []);
        const updatedPets = existingPets.filter(
          (p: any, idx: number) => (p.id || `clerk-pet-${idx}`) !== pet.id,
        );
        await updateClerkUnsafeMetadata(clerkUser, {
          pets: updatedPets,
        });
      }

      setDeleteModalVisible(false);
      toast.info(`${pet.name} removed`, {
        description: 'Pet passport has been deleted.',
      });
      router.replace('/pets' as never);
    } catch (err) {
      console.log('Delete pet error:', err);
      haptic.error();
    } finally {
      setDeleting(false);
    }
  };

  const handleSavePetInfo = async (updatedPet: Pet) => {
    if (ownerId) {
      await useDataStore.getState().updatePet(updatedPet);
    }

    if (clerkUser) {
      const existingPets = ((clerkUser.unsafeMetadata?.pets as any[]) || []);
      const updatedPets = existingPets.map((p: any, idx: number) => {
        if ((p.id || `clerk-pet-${idx}`) === pet.id) {
          return {
            ...p,
            name: updatedPet.name,
            species: updatedPet.species,
            breed: updatedPet.breed,
            gender: updatedPet.gender,
            birthYear: updatedPet.birthYear,
            isVaccinated: updatedPet.isVaccinated,
            isSpayedNeutered: updatedPet.isSpayedNeutered,
            weightCategory: updatedPet.weightCategory,
            notes: updatedPet.notes,
          };
        }
        return p;
      });

      await updateClerkUnsafeMetadata(clerkUser, {
        pets: updatedPets,
      });
    }

    toast.success(`${updatedPet.name}’s passport updated!`, {
      description: 'Pet details and medical notes have been saved.',
    });
  };

  const handleBookVaccination = () => {
    haptic.light();
    router.push({
      pathname: '/appointments/new',
      params: { petId: pet.id, petName: pet.name, serviceId: 'vaccination' },
    } as never);
  };

  const handleBookClinicVisit = () => {
    haptic.light();
    router.push({
      pathname: '/appointments/new',
      params: { petId: pet.id, petName: pet.name, serviceId: 'consultation' },
    } as never);
  };

  return (
    <AnimatedScreen animation="zoom">
      <Screen scroll>
        {/* Top Navigation Bar with Edit & Delete Actions */}
        <View style={styles.headerRow}>
          <BackButton />
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Pet Health Passport</Text>
            <Text style={styles.headerSubtitle}>City Veterinary Office · CDO</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                haptic.light();
                setEditModalVisible(true);
              }}
              style={styles.editHeaderBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit Pet Info"
            >
              <Ionicons name="pencil" size={15} color={colors.primary} />
            </Pressable>

            <Pressable
              onPress={() => {
                haptic.warning();
                setDeleteModalVisible(true);
              }}
              style={styles.deleteHeaderBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove Pet"
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </Pressable>
          </View>
        </View>

        {/* Hero Passport Identity Card */}
        <View style={[styles.heroCard, shadows.sm]}>
          {/* Centered Pop-Out 3D Pet Avatar */}
          <View style={styles.avatarCenterWrap}>
            <PopoutPetAvatar
              avatarId={customAvatarId || pet.avatarId}
              species={pet.species}
              photoUrl={customPhotoUrl || pet.photoUrl}
              size={138}
              scale={1.65}
              showCameraBadge
              onPress={() => {
                haptic.light();
                setAvatarModalVisible(true);
              }}
            />
          </View>

          {/* Centered Pet Core Identity */}
          <View style={styles.heroCenterInfo}>
            <View style={styles.nameCenterRow}>
              <Text style={styles.heroName} numberOfLines={1}>
                {pet.name}
              </Text>
              <View
                style={[
                  styles.speciesTag,
                  isDog ? styles.speciesTagDog : styles.speciesTagCat,
                ]}
              >
                <Text
                  style={[
                    styles.speciesTagText,
                    isDog ? styles.speciesTagTextDog : styles.speciesTagTextCat,
                  ]}
                >
                  {isDog ? '🐶 Canine' : '🐱 Feline'}
                </Text>
              </View>
            </View>

            <Text style={styles.heroBreedText} numberOfLines={1}>
              {pet.breed || (isDog ? 'Dog' : 'Cat')}
              {pet.gender
                ? ` · ${pet.gender === 'male' ? 'Male ♂' : 'Female ♀'}`
                : ''}
            </Text>

            <Text style={styles.heroAgeText}>
              {ageText} {pet.birthYear ? `(Born ${pet.birthYear})` : ''}
            </Text>
          </View>

          {/* Anti-Rabies Vaccination Status Banner */}
          <View
            style={[
              styles.vaxStatusBanner,
              vaxTimeline.isVaccinated
                ? styles.vaxBannerProtected
                : styles.vaxBannerDue,
            ]}
          >
            <View style={styles.vaxBannerHeaderRow}>
              <Text
                style={[
                  styles.vaxBannerTitle,
                  vaxTimeline.isVaccinated
                    ? styles.vaxBannerTitleGreen
                    : styles.vaxBannerTitleAmber,
                ]}
              >
                {vaxTimeline.isVaccinated
                  ? `Anti-Rabies Protected · ${vaxTimeline.totalDoses} ${
                      vaxTimeline.totalDoses === 1 ? 'Dose' : 'Doses'
                    }`
                  : 'Anti-Rabies Vaccine Due (0 Doses)'}
              </Text>
            </View>

            {vaxTimeline.isVaccinated ? (
              <View style={styles.vaxTimelineDatesRow}>
                {vaxTimeline.lastDate ? (
                  <View style={styles.vaxDateCol}>
                    <Text style={styles.vaxDateLabel}>Last Administered</Text>
                    <Text style={styles.vaxDateValue}>
                      {formatDateWithYear(vaxTimeline.lastDate)}
                    </Text>
                  </View>
                ) : null}

                {vaxTimeline.nextBooster ? (
                  <View style={styles.vaxDateCol}>
                    <Text style={styles.vaxDateLabel}>Next Booster Due</Text>
                    <Text style={[styles.vaxDateValue, styles.vaxDateValueHighlight]}>
                      {formatDateWithYear(vaxTimeline.nextBooster)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.vaxBannerHelpText}>
                No immunization on record. Please schedule your pet’s free municipal rabies shot.
              </Text>
            )}
          </View>
        </View>

        {/* Medical Specifications Metric Grid */}
        <View style={styles.specsRow}>
          {/* Gender */}
          <View style={[styles.specBox, shadows.sm]}>
            <View style={[styles.specIconWrap, { backgroundColor: 'rgba(37, 99, 235, 0.08)' }]}>
              <Ionicons
                name={pet.gender === 'male' ? 'male' : 'female'}
                size={16}
                color={pet.gender === 'male' ? '#2563EB' : '#DB2777'}
              />
            </View>
            <Text style={styles.specValue}>
              {pet.gender === 'male' ? 'Male ♂' : pet.gender === 'female' ? 'Female ♀' : 'Not specified'}
            </Text>
            <Text style={styles.specLabel}>Gender</Text>
          </View>

          {/* Spayed / Neutered */}
          <View style={[styles.specBox, shadows.sm]}>
            <View style={[styles.specIconWrap, { backgroundColor: 'rgba(0, 168, 150, 0.08)' }]}>
              <Ionicons name="cut-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.specValue}>
              {pet.isSpayedNeutered ? 'Fixed / Kapon' : 'Intact'}
            </Text>
            <Text style={styles.specLabel}>Spay / Neuter</Text>
          </View>

          {/* Size / Weight */}
          <View style={[styles.specBox, shadows.sm]}>
            <View style={[styles.specIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
              <Ionicons name="scale-outline" size={16} color={colors.warning} />
            </View>
            <Text style={styles.specValue}>
              {pet.weightCategory
                ? pet.weightCategory.charAt(0).toUpperCase() + pet.weightCategory.slice(1)
                : 'Medium'}
            </Text>
            <Text style={styles.specLabel}>Weight Class</Text>
          </View>
        </View>

        {/* Special Care Notes (if any) */}
        {pet.notes ? (
          <View style={[styles.notesCard, shadows.sm]}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              <Text style={styles.notesTitle}>Care Notes & Health Remarks</Text>
            </View>
            <Text style={styles.notesBody}>{pet.notes}</Text>
          </View>
        ) : null}

        {/* Vaccination History Card */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Anti-Rabies & Vaccines</Text>
            </View>
            <Pressable
              onPress={handleBookVaccination}
              style={styles.sectionActionBtn}
              hitSlop={8}
            >
              <Text style={styles.sectionActionText}>Schedule Vaccine</Text>
            </Pressable>
          </View>

          <View style={[styles.cardContainer, shadows.sm]}>
            {vaccineHistory.length === 0 ? (
              <View style={styles.emptyCardContent}>
                <View style={styles.emptyCardIcon}>
                  <Ionicons name="shield-outline" size={22} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyCardTitle}>No municipal vaccine logs yet</Text>
                <Text style={styles.emptyCardSubtitle}>
                  Keep your pet safe by booking an official anti-rabies vaccination at the City Vet Office.
                </Text>
                <Pressable onPress={handleBookVaccination} style={styles.scheduleBtnInline}>
                  <Ionicons name="add" size={14} color={colors.white} />
                  <Text style={styles.scheduleBtnInlineText}>Book Vaccination</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.historyList}>
                {vaccineHistory.map((appointment) => (
                  <View key={appointment.id} style={styles.historyRow}>
                    <View style={styles.historyDateCol}>
                      <Text style={styles.historyDateLabel}>
                        {formatWeekdayDate(appointment.date)}
                      </Text>
                      <Text style={styles.historyTime}>{appointment.timeSlot}</Text>
                    </View>
                    <View style={styles.historyInfoCol}>
                      <Text style={styles.historyTitle}>Anti-Rabies Immunization</Text>
                      <Text style={styles.historyClinic}>City Veterinary Office CDO</Text>
                    </View>
                    <StatusBadge status={appointment.status} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Appointment Records */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Clinic Appointments</Text>
            </View>
            <Pressable
              onPress={() => router.push('/appointments' as never)}
              style={styles.sectionActionBtn}
              hitSlop={8}
            >
              <Text style={styles.sectionActionText}>View All</Text>
            </Pressable>
          </View>

          <View style={[styles.cardContainer, shadows.sm]}>
            {petAppointments.length === 0 ? (
              <View style={styles.emptyCardContent}>
                <View style={styles.emptyCardIcon}>
                  <Ionicons name="calendar-outline" size={22} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyCardTitle}>No appointments scheduled</Text>
                <Text style={styles.emptyCardSubtitle}>
                  Schedule checkups, anti-rabies vaccines, or consultations for {pet.name}.
                </Text>
                <Pressable onPress={handleBookClinicVisit} style={styles.scheduleBtnInline}>
                  <Ionicons name="add" size={14} color={colors.white} />
                  <Text style={styles.scheduleBtnInlineText}>Book Clinic Visit</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.historyList}>
                {petAppointments.slice(0, 3).map((appointment) => {
                  const service = getService(appointment.serviceId);
                  return (
                    <View key={appointment.id} style={styles.historyRow}>
                      <View style={styles.historyDateCol}>
                        <Text style={styles.historyDateLabel}>
                          {formatWeekdayDate(appointment.date)}
                        </Text>
                        <Text style={styles.historyTime}>{appointment.timeSlot}</Text>
                      </View>
                      <View style={styles.historyInfoCol}>
                        <Text style={styles.historyTitle}>
                          {service?.name ?? 'Veterinary Service'}
                        </Text>
                        <Text style={styles.historyClinic}>City Vet Clinic</Text>
                      </View>
                      <StatusBadge status={appointment.status} />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </Screen>

      {/* Pet Avatar Customizer Modal */}
      <PetAvatarPickerModal
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
        onSelectAvatar={handleAvatarChange}
        currentAvatarId={customAvatarId || pet.avatarId}
        species={pet.species}
        petName={pet.name}
      />

      {/* Pet Edit Basic Info Modal */}
      <PetEditInfoModal
        visible={editModalVisible}
        pet={pet}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSavePetInfo}
      />

      {/* Custom Pet Deletion Dialog with Paws */}
      <PetDeleteConfirmModal
        visible={deleteModalVisible}
        petName={pet.name}
        species={pet.species}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: 2,
    gap: 8,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  headerTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 16.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 12,
  },
  avatarCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    overflow: 'visible',
  },
  heroCenterInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 2,
    marginBottom: 4,
  },
  nameCenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroName: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  speciesTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  speciesTagDog: {
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
  },
  speciesTagCat: {
    backgroundColor: 'rgba(219, 39, 119, 0.10)',
  },
  speciesTagText: {
    ...typography.captionBold,
    fontSize: 10.5,
    fontWeight: '700',
  },
  speciesTagTextDog: {
    color: colors.primary,
  },
  speciesTagTextCat: {
    color: '#DB2777',
  },
  heroBreedText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  heroAgeText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  vaxStatusBanner: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
  },
  vaxBannerProtected: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.20)',
  },
  vaxBannerDue: {
    backgroundColor: 'rgba(245, 158, 11, 0.07)',
    borderColor: 'rgba(245, 158, 11, 0.22)',
  },
  vaxBannerHeaderRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaxBannerTitle: {
    ...typography.captionBold,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  vaxBannerTitleGreen: {
    color: colors.success,
  },
  vaxBannerTitleAmber: {
    color: colors.warning,
  },
  vaxTimelineDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(16, 185, 129, 0.16)',
    gap: 12,
  },
  vaxDateCol: {
    alignItems: 'center',
    gap: 2,
  },
  vaxDateLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  vaxDateValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  vaxDateValueHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
  vaxBannerHelpText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
    textAlign: 'center',
  },
  specsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  specBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 2,
  },
  specIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  specValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 11.5,
    textAlign: 'center',
  },
  specLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 6,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notesTitle: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
  },
  notesBody: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionBlock: {
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionActionBtn: {
    paddingVertical: 2,
  },
  sectionActionText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11.5,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    overflow: 'hidden',
  },
  emptyCardContent: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  emptyCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyCardTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  emptyCardSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
    textAlign: 'center',
    maxWidth: 260,
  },
  scheduleBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  scheduleBtnInlineText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 11.5,
  },
  historyList: {
    paddingHorizontal: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(7, 30, 38, 0.04)',
    gap: spacing.md,
  },
  historyDateCol: {
    width: 80,
    gap: 1,
  },
  historyDateLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 11.5,
  },
  historyTime: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
  },
  historyInfoCol: {
    flex: 1,
    gap: 1,
  },
  historyTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12.5,
  },
  historyClinic: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10.5,
  },
  bottomCtaWrap: {
    marginTop: spacing.md,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});
