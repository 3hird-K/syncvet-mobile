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
import { formatShortDate, formatWeekdayDate, ageFromBirthYear, formatAge } from '@lib/format';
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

  const handleBookVisit = () => {
    haptic.light();
    router.push({
      pathname: '/appointments/new',
      params: { petId: pet.id, petName: pet.name },
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
          <View style={styles.heroTopRow}>
            {/* Pop-Out 3D Pet Avatar */}
            <PopoutPetAvatar
              avatarId={customAvatarId || pet.avatarId}
              species={pet.species}
              photoUrl={customPhotoUrl || pet.photoUrl}
              size={132}
              scale={1.65}
              showCameraBadge
              onPress={() => {
                haptic.light();
                setAvatarModalVisible(true);
              }}
            />

            {/* Pet Core Identity */}
            <View style={styles.heroTextWrap}>
              <View style={styles.nameRow}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {pet.name}
                </Text>
                <View style={styles.speciesTag}>
                  <Text style={styles.speciesTagText}>
                    {isDog ? 'Canine' : 'Feline'}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroBreed} numberOfLines={1}>
                {pet.breed || (isDog ? 'Dog' : 'Cat')}
                {pet.gender
                  ? ` · ${pet.gender === 'male' ? 'Male ♂' : 'Female ♀'}`
                  : ''}
              </Text>

              <Text style={styles.heroAge}>
                {ageText} {pet.birthYear ? `(Born ${pet.birthYear})` : ''}
              </Text>
            </View>
          </View>

          {/* Anti-Rabies Vaccination Status Banner */}
          <View
            style={[
              styles.vaxStatusBanner,
              {
                backgroundColor: pet.isVaccinated
                  ? 'rgba(16, 185, 129, 0.08)'
                  : 'rgba(245, 158, 11, 0.10)',
                borderColor: pet.isVaccinated
                  ? 'rgba(16, 185, 129, 0.25)'
                  : 'rgba(245, 158, 11, 0.25)',
              },
            ]}
          >
            <Ionicons
              name={pet.isVaccinated ? 'shield-checkmark' : 'alert-circle'}
              size={18}
              color={pet.isVaccinated ? colors.success : colors.warning}
            />
            <View style={styles.vaxBannerTextWrap}>
              <Text
                style={[
                  styles.vaxBannerTitle,
                  { color: pet.isVaccinated ? colors.success : colors.warning },
                ]}
              >
                {pet.isVaccinated
                  ? 'Anti-Rabies Protection Up to Date'
                  : 'Anti-Rabies Vaccination Required'}
              </Text>
              <Text style={styles.vaxBannerSub}>
                {pet.isVaccinated
                  ? 'Compliant with CDO City Veterinary Health Registry'
                  : 'Please schedule municipal rabies immunization'}
              </Text>
            </View>
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
              onPress={handleBookVisit}
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
                <Pressable onPress={handleBookVisit} style={styles.scheduleBtnInline}>
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

        {/* Book Service Action Button */}
        <View style={styles.bottomCtaWrap}>
          <Button
            title={`Book Clinic Visit for ${pet.name}`}
            size="lg"
            variant="primary"
            onPress={handleBookVisit}
            showPaw
            fullWidth
          />
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
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroTextWrap: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  speciesTag: {
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  speciesTagText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 10,
  },
  heroBreed: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
  },
  heroAge: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11.5,
  },
  vaxStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  vaxBannerTextWrap: {
    flex: 1,
    gap: 1,
  },
  vaxBannerTitle: {
    ...typography.captionBold,
    fontSize: 12,
  },
  vaxBannerSub: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10.5,
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
