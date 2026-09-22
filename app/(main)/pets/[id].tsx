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
import { PetQrTagModal } from '@components/ui/PetQrTagModal';
import { toast } from '@components/ui/Sonner';
import { useDeletePetMutation } from '@hooks/queries';
import type { Pet } from '@services/data';

export default function PetProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((state) => state.user);
  const ownerId = authUser?.id;
  const pets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);
  const deletePet = useDataStore((state) => state.deletePet);
  const deletePetMutation = useDeletePetMutation();

  // Modal States
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [qrTagModalVisible, setQrTagModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pet = useMemo(
    () => pets.find((p) => p.id === id),
    [pets, id],
  );

  const [customAvatarId, setCustomAvatarId] = useState<string | undefined>(pet?.avatarId);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | undefined>(pet?.photoUrl);

  const petAppointments = useMemo(() => {
    return (appointments || [])
      .filter((a) => a.petId === id || (pet?.name && a.petName?.toLowerCase().trim() === pet.name.toLowerCase().trim()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [appointments, id, pet?.name]);

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

    const updatedPet: Pet = {
      ...pet,
      avatarId: avatarId === 'custom' ? undefined : avatarId,
      photoUrl: customPhotoUri || (avatarId === 'custom' ? pet.photoUrl : undefined),
    };

    if (ownerId) {
      await useDataStore.getState().updatePet(updatedPet, clerkUser);
    }

    toast.success(`${pet.name}’s avatar updated!`, {
      description: 'New profile picture saved locally.',
    });
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (ownerId) {
        await deletePetMutation.mutateAsync({
          ownerId,
          petId: pet.id,
          clerkUser,
        });
      }

      setDeleteModalVisible(false);
      toast.info(`${pet.name} removed`, {
        description: 'Pet passport deleted.',
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
      await useDataStore.getState().updatePet(updatedPet, clerkUser);
    }

    toast.success(`${updatedPet.name}’s passport updated!`, {
      description: 'Pet details and medical notes saved locally.',
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
      <Screen scroll subtleBackground>
        {/* Top Navigation Bar with Edit & Delete Actions */}
        <View style={styles.headerRow}>
          <BackButton to="/pets" />

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {pet.name}’s Passport
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* QR Tag Button */}
            <Pressable
              onPress={() => {
                haptic.light();
                setQrTagModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.qrHeaderBtn,
                pressed && styles.headerBtnPressed,
              ]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Pet Digital QR Tag"
            >
              <Ionicons name="qr-code-outline" size={17} color={colors.primary} />
            </Pressable>

            {/* Edit Pet Button */}
            <Pressable
              onPress={() => {
                haptic.light();
                setEditModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.editHeaderBtn,
                pressed && styles.headerBtnPressed,
              ]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Edit Pet Info"
            >
              <Ionicons name="pencil" size={15} color={colors.primary} />
            </Pressable>

            {/* Delete Pet Button */}
            <Pressable
              onPress={() => {
                haptic.warning();
                setDeleteModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.deleteHeaderBtn,
                pressed && styles.headerBtnPressed,
              ]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Remove Pet"
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </Pressable>
          </View>
        </View>

        {/* Hero Passport Identity Card */}
        {/* Horizontal Pet Profile Header (Avatar on left, Data & Specs on right) */}
        <View style={styles.profileHeader}>
          {/* Left: Pop-Out Pet Avatar */}
          <View style={styles.avatarLeftWrap}>
            <PopoutPetAvatar
              avatarId={customAvatarId || pet.avatarId}
              species={pet.species}
              photoUrl={customPhotoUrl || pet.photoUrl}
              size={76}
              scale={1.22}
              showCameraBadge
              onPress={() => {
                haptic.light();
                setAvatarModalVisible(true);
              }}
            />
          </View>

          {/* Right: Pet Identity & Specifications Description */}
          <View style={styles.profileDataCol}>
            {/* Pet Name & Species Badge */}
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName} numberOfLines={1}>
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
                  {isDog ? 'Canine' : 'Feline'}
                </Text>
              </View>
            </View>

            {/* Breed & Age */}
            <Text style={styles.profileMetaText} numberOfLines={1}>
              {pet.breed || (isDog ? 'Dog' : 'Cat')} · {ageText} {pet.birthYear ? `(${pet.birthYear})` : ''}
            </Text>

            {/* Integrated Specifications Badges (Gender, Spay/Neuter, Weight Class) */}
            <View style={styles.dataBadgesRow}>
              {/* Gender */}
              <View style={styles.dataBadge}>
                <Ionicons
                  name={pet.gender === 'male' ? 'male' : 'female'}
                  size={10.5}
                  color={pet.gender === 'male' ? '#2563EB' : '#DB2777'}
                />
                <Text style={styles.dataBadgeText}>
                  {pet.gender === 'male' ? 'Male' : pet.gender === 'female' ? 'Female' : 'Unknown'}
                </Text>
              </View>

              {/* Spay / Neuter */}
              <View style={styles.dataBadge}>
                <Ionicons name="cut-outline" size={10.5} color={colors.primary} />
                <Text style={styles.dataBadgeText}>
                  {pet.isSpayedNeutered ? 'Fixed' : 'Intact'}
                </Text>
              </View>

              {/* Weight Class */}
              <View style={styles.dataBadge}>
                <Ionicons name="scale-outline" size={10.5} color={colors.warning} />
                <Text style={styles.dataBadgeText}>
                  {pet.weightCategory
                    ? pet.weightCategory.charAt(0).toUpperCase() + pet.weightCategory.slice(1)
                    : 'Medium'}
                </Text>
              </View>
            </View>
          </View>
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
            <Ionicons
              name={vaxTimeline.isVaccinated ? 'shield-checkmark' : 'alert-circle-outline'}
              size={14}
              color={vaxTimeline.isVaccinated ? '#059669' : '#D97706'}
            />
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
                : 'Anti-Rabies Vaccine Due'}
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

              {vaxTimeline.lastDate && vaxTimeline.nextBooster ? (
                <View style={styles.vaxDateDivider} />
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
                <Text style={styles.emptyCardTitle}>
                  {vaxTimeline.isVaccinated
                    ? 'No municipal clinic records yet'
                    : 'No municipal vaccine logs yet'}
                </Text>
                <Text style={styles.emptyCardSubtitle}>
                  {vaxTimeline.isVaccinated
                    ? 'Official vaccination logs will appear here after your pet’s appointments at the City Veterinary Office.'
                    : 'Keep your pet safe by booking an official anti-rabies vaccination at the City Vet Office.'}
                </Text>
                <Pressable onPress={handleBookVaccination} style={styles.scheduleBtnInline}>
                  <Ionicons name="add" size={14} color={colors.white} />
                  <Text style={styles.scheduleBtnInlineText}>
                    {vaxTimeline.isVaccinated ? 'Schedule Next Booster' : 'Book Vaccination'}
                  </Text>
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

      {/* Official City Vet Pet QR Tag Modal */}
      <PetQrTagModal
        visible={qrTagModalVisible}
        onClose={() => setQrTagModalVisible(false)}
        pet={pet}
        owner={{
          id: authUser?.id || clerkUser?.id,
          fullName: authUser?.fullName || clerkUser?.fullName || 'SyncVet Resident',
          mobileNumber: authUser?.mobileNumber || clerkUser?.primaryPhoneNumber?.phoneNumber || '',
          address: authUser?.address || 'Cagayan de Oro City',
        }}
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
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  qrHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: 4,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  avatarLeftWrap: {
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDataCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 2.5,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  speciesTag: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
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
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  speciesTagTextDog: {
    color: colors.primary,
  },
  speciesTagTextCat: {
    color: '#DB2777',
  },
  profileMetaText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  dataBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 4,
    marginTop: 2,
  },
  dataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
  },
  dataBadgeText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 9.5,
    fontWeight: '600',
  },
  vaxStatusBanner: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: 7,
  },
  vaxBannerProtected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  vaxBannerDue: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  vaxBannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  vaxBannerTitle: {
    ...typography.captionBold,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  vaxBannerTitleGreen: {
    color: '#059669',
  },
  vaxBannerTitleAmber: {
    color: '#D97706',
  },
  vaxTimelineDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(5, 150, 105, 0.15)',
  },
  vaxDateCol: {
    flex: 1,
    alignItems: 'center',
    gap: 1.5,
  },
  vaxDateDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(5, 150, 105, 0.18)',
  },
  vaxDateLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 9.5,
  },
  vaxDateValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  vaxDateValueHighlight: {
    color: '#059669',
    fontWeight: '700',
  },
  vaxBannerHelpText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
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
});
