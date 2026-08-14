import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { todayISO } from '@lib/format';
import { haptic } from '@lib/haptics';
import { getPetAvatarSource } from '@lib/petAvatars';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { Avatar } from '@components/ui/Avatar';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { AddressPicker } from '@components/ui/AddressPicker';
import { PopoutPetAvatar } from '@components/ui/PopoutPetAvatar';
import { updateClerkUnsafeMetadata } from '@lib/clerkMetadata';
import { toast } from '@components/ui/Sonner';

interface MetadataPet {
  id?: string;
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

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut: clerkSignOut } = useAuth();
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const localPets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);
  useResidentData();

  // Extract Profile Data
  const fullName =
    clerkUser?.fullName ||
    (clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
      : '') ||
    user?.fullName ||
    'SyncVet Resident';

  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    user?.email ||
    'resident@syncvet.app';

  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const photoUrl = customPhoto || clerkUser?.imageUrl || user?.photoUrl;

  const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;

  const mobileNumber =
    (metadata.mobileNumber as string) ||
    clerkUser?.primaryPhoneNumber?.phoneNumber ||
    user?.mobileNumber ||
    '';

  const address =
    (metadata.address as string) ||
    user?.address ||
    'Cagayan de Oro City';

  // State for Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(fullName);
  const [editPhone, setEditPhone] = useState(mobileNumber);
  const [editAddress, setEditAddress] = useState(address);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | undefined>();

  // Read pets from Clerk metadata
  const metadataPets: MetadataPet[] = useMemo(() => {
    if (Array.isArray(metadata.pets) && metadata.pets.length > 0) {
      return metadata.pets;
    }
    if (localPets && localPets.length > 0) {
      return localPets;
    }
    return [];
  }, [metadata.pets, localPets]);

  const [petsExpanded, setPetsExpanded] = useState(false);
  const DEFAULT_VISIBLE_PETS = 2;
  const visiblePets = petsExpanded
    ? metadataPets
    : metadataPets.slice(0, DEFAULT_VISIBLE_PETS);
  const hasMorePets = metadataPets.length > DEFAULT_VISIBLE_PETS;

  const stats = useMemo(() => {
    const today = todayISO();
    const upcoming = appointments.filter(
      (a) => a.status !== 'cancelled' && a.status !== 'completed' && a.date >= today,
    ).length;
    const completed = appointments.filter((a) => a.status === 'completed').length;
    return { pets: metadataPets.length, upcoming, completed };
  }, [metadataPets, appointments]);

  const handleChangeProfilePhoto = async () => {
    try {
      haptic.light();
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to change your profile picture.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        const base64 = result.assets[0].base64;
        setCustomPhoto(uri);

        if (clerkUser) {
          try {
            if (base64) {
              await clerkUser.setProfileImage({
                file: `data:image/jpeg;base64,${base64}`,
              });
            }
          } catch (e) {
            console.log('Clerk setProfileImage note:', e);
            await updateClerkUnsafeMetadata(clerkUser, {
              photoUrl: uri,
            });
          }
        }
        useAuthStore.setState((s) => ({
          user: s.user ? { ...s.user, photoUrl: uri } : null,
        }));
        toast.success('Profile photo updated!', {
          description: 'Your new avatar is live across SyncVet.',
        });
      }
    } catch (err) {
      console.log('Image picker error:', err);
    }
  };

  const openEditModal = () => {
    haptic.light();
    setEditName(fullName);
    setEditPhone(mobileNumber);
    setEditAddress(address);
    setEditError(undefined);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setEditError('Please enter your full name.');
      haptic.warning();
      return;
    }
    if (!editPhone.trim()) {
      setEditError('Please enter your mobile phone number.');
      haptic.warning();
      return;
    }
    if (!editAddress.trim()) {
      setEditError('Please enter your residence address.');
      haptic.warning();
      return;
    }

    setSavingProfile(true);
    setEditError(undefined);

    try {
      const nameParts = editName.trim().split(' ');
      const firstName = nameParts[0] || editName.trim();
      const lastName = nameParts.slice(1).join(' ') || '';

      if (clerkUser) {
        try {
          await clerkUser.update({
            firstName,
            lastName,
          });
        } catch (e) {
          console.log('Clerk name update note:', e);
        }

        await updateClerkUnsafeMetadata(clerkUser, {
          mobileNumber: editPhone.trim(),
          address: editAddress.trim(),
        });
      }

      await useAuthStore.getState().saveOwnerProfile(editPhone.trim(), editAddress.trim());
      setEditModalVisible(false);
      toast.success('Profile updated successfully!', {
        description: 'Name, phone and address have been saved.',
      });
    } catch (err: any) {
      console.log('Update profile error:', err);
      setEditError(err?.message || 'Could not update profile. Please try again.');
      haptic.error();
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCallCVO = () => {
    haptic.light();
    void Linking.openURL('tel:0888572260').catch(() => {});
  };

  return (
    <AnimatedScreen animation="fade">
      <Screen scroll>
        {/* Compact Screen Header */}
        <View style={styles.topHeader}>
          <Text style={styles.screenHeading}>Profile</Text>
          <Pressable
            onPress={openEditModal}
            style={styles.headerEditBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit Profile"
          >
            <Ionicons name="pencil" size={13} color={colors.primary} />
            <Text style={styles.headerEditText}>Edit</Text>
          </Pressable>
        </View>

        {/* Clean Hero Identity Card */}
        <View style={[styles.heroCard, shadows.sm]}>
          <View style={styles.heroTopRow}>
            {/* Avatar on Left with Camera Badge */}
            <Pressable
              onPress={handleChangeProfilePhoto}
              style={styles.avatarWrap}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <Avatar name={fullName} size={64} photoUrl={photoUrl} />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={13} color={colors.white} />
              </View>
            </Pressable>

            {/* Resident Info on Right */}
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroName} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.heroEmail} numberOfLines={1}>
                {email}
              </Text>
              {mobileNumber ? (
                <View style={styles.heroPhoneRow}>
                  <Ionicons name="call-outline" size={11} color={colors.textSecondary} />
                  <Text style={styles.heroPhoneText}>{mobileNumber}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Residence Address Bar */}
          <View style={styles.heroAddressBar}>
            <Ionicons name="location-sharp" size={13} color={colors.primary} />
            <Text style={styles.heroAddressText} numberOfLines={1}>
              {address}
            </Text>
          </View>
        </View>

        {/* Compact Stats Row */}
        <View style={styles.statsRow}>
          <Pressable
            style={[styles.statBox, shadows.sm]}
            onPress={() => {
              haptic.light();
              router.push('/pets' as never);
            }}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(0, 168, 150, 0.12)' }]}>
              <Ionicons name="paw" size={14} color={colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.pets}</Text>
            <Text style={styles.statLabel}>Pets</Text>
          </Pressable>

          <Pressable
            style={[styles.statBox, shadows.sm]}
            onPress={() => {
              haptic.light();
              router.push('/appointments' as never);
            }}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(14, 116, 144, 0.12)' }]}>
              <Ionicons name="calendar" size={14} color={colors.info} />
            </View>
            <Text style={styles.statNumber}>{stats.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </Pressable>

          <Pressable
            style={[styles.statBox, shadows.sm]}
            onPress={() => {
              haptic.light();
              router.push('/appointments' as never);
            }}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="checkmark-done" size={14} color={colors.success} />
            </View>
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </Pressable>
        </View>

        {/* Registered Pets - Modern Horizontal List (Image Left, Texts Right) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My Registered Pets</Text>
            <Pressable
              onPress={() => {
                haptic.light();
                router.push('/pets/add' as never);
              }}
              style={styles.addPetHeaderBtn}
              hitSlop={8}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={styles.addPetHeaderText}>Add Pet</Text>
            </Pressable>
          </View>

          {metadataPets.length === 0 ? (
            <Pressable
              style={[styles.emptyPetCard, shadows.sm]}
              onPress={() => {
                haptic.light();
                router.push('/pets/add' as never);
              }}
            >
              <View style={styles.emptyPetIcon}>
                <Ionicons name="paw-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.emptyPetTextWrap}>
                <Text style={styles.emptyPetTitle}>Register Your First Pet</Text>
                <Text style={styles.emptyPetSub}>Get a digital City Vet health passport</Text>
              </View>
              <Ionicons name="add-circle" size={20} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={styles.petsVerticalList}>
              {visiblePets.map((pet, idx) => {
                const isDog = pet.species?.toLowerCase() === 'dog';
                return (
                  <Pressable
                    key={pet.id || `pet-${idx}`}
                    style={[styles.petListCard, shadows.sm]}
                    onPress={() => {
                      haptic.light();
                      if (pet.id) {
                        router.push(`/pets/${pet.id}` as never);
                      } else {
                        router.push('/pets' as never);
                      }
                    }}
                  >
                    {/* Pop-Out Avatar on the Left */}
                    <PopoutPetAvatar
                      avatarId={pet.avatarId}
                      species={pet.species as any}
                      photoUrl={pet.photoUrl}
                      size={46}
                    />

                    {/* Texts and Status on the Right */}
                    <View style={styles.petRightInfo}>
                      <View style={styles.petNameRow}>
                        <Text style={styles.petNameText} numberOfLines={1}>
                          {pet.name}
                        </Text>
                        {pet.isVaccinated ? (
                          <View style={styles.vaccineTagSuccess}>
                            <Ionicons name="shield-checkmark" size={10} color={colors.success} />
                            <Text style={styles.vaccineTagSuccessText}>Vaccinated</Text>
                          </View>
                        ) : (
                          <View style={styles.vaccineTagWarning}>
                            <Ionicons name="alert-circle" size={10} color={colors.warning} />
                            <Text style={styles.vaccineTagWarningText}>Needs Shot</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.petBreedText} numberOfLines={1}>
                        {pet.breed || (isDog ? 'Dog' : 'Cat')}
                        {pet.gender
                          ? ` · ${pet.gender === 'male' ? 'Male ♂' : 'Female ♀'}`
                          : ''}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                );
              })}

              {/* Expand / Reduce Pets Button */}
              {hasMorePets && (
                <Pressable
                  onPress={() => {
                    haptic.light();
                    setPetsExpanded((prev) => !prev);
                  }}
                  style={styles.expandPetsBtn}
                  accessibilityRole="button"
                  accessibilityLabel={
                    petsExpanded
                      ? 'Show fewer pets'
                      : `Show all ${metadataPets.length} pets`
                  }
                >
                  <Text style={styles.expandPetsBtnText}>
                    {petsExpanded
                      ? 'Show Fewer Pets'
                      : `Show All (${metadataPets.length}) Pets`}
                  </Text>
                  <Ionicons
                    name={petsExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={colors.primary}
                  />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* City Veterinary Office Contact Hub (Ultra-Compact) */}
        <View style={[styles.cvoCleanCard, shadows.sm]}>
          <View style={styles.cvoLeftRow}>
            <View style={styles.cvoBadgeIcon}>
              <Ionicons name="business" size={16} color={colors.white} />
            </View>
            <View style={styles.cvoTextWrap}>
              <Text style={styles.cvoTitle}>City Veterinary Office</Text>
              <Text style={styles.cvoSub}>Mon – Fri · 8:00 AM – 5:00 PM</Text>
            </View>
          </View>

          <Pressable
            onPress={handleCallCVO}
            style={({ pressed }) => [styles.cvoCallBtn, pressed && styles.cvoCallBtnPressed]}
          >
            <Ionicons name="call" size={13} color={colors.primary} />
            <Text style={styles.cvoCallBtnText}>Call CVO</Text>
          </Pressable>
        </View>

        <View style={styles.footerSpacing} />
      </Screen>

      {/* Update Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={[styles.modalCard, shadows.lg]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Update Profile</Text>
                  <Text style={styles.modalSub}>Manage your contact & address details</Text>
                </View>
                <Pressable
                  onPress={() => setEditModalVisible(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalFormScroll}
                contentContainerStyle={styles.modalFormContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Full Name */}
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Full Name</Text>
                  <Input
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter full name"
                    leftIcon={<Ionicons name="person-outline" size={18} color={colors.primary} />}
                    editable={!savingProfile}
                  />
                </View>

                {/* Mobile Number */}
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Mobile Number</Text>
                  <Input
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    placeholder="09XXXXXXXXX"
                    leftIcon={<Ionicons name="call-outline" size={18} color={colors.primary} />}
                    editable={!savingProfile}
                  />
                </View>

                {/* Address Picker */}
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Residence Address</Text>
                  <AddressPicker
                    value={editAddress}
                    onChange={setEditAddress}
                    editable={!savingProfile}
                  />
                </View>

                {editError ? (
                  <View style={styles.editErrorWrap}>
                    <Ionicons name="alert-circle" size={16} color={colors.error} />
                    <Text style={styles.editErrorText}>{editError}</Text>
                  </View>
                ) : null}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalActionsRow}>
                <View style={styles.modalCancelWrap}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setEditModalVisible(false)}
                    disabled={savingProfile}
                    fullWidth
                  />
                </View>
                <View style={styles.modalSaveWrap}>
                  <Button
                    title="Save Changes"
                    variant="primary"
                    onPress={handleSaveProfile}
                    loading={savingProfile}
                    showPaw
                    fullWidth
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingTop: 2,
  },
  screenHeading: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  headerEditText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 6,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  heroTextWrap: {
    flex: 1,
    gap: 2,
    paddingLeft: 2,
  },
  heroName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  heroEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
  },
  heroPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  heroPhoneText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  heroAddressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  heroAddressText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 1,
  },
  statIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 9.5,
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
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  addPetHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  addPetHeaderText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
  },
  emptyPetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: spacing.md,
  },
  emptyPetIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPetTextWrap: {
    flex: 1,
    gap: 1,
  },
  emptyPetTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  emptyPetSub: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
  },
  petsVerticalList: {
    gap: 6,
  },
  petListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: spacing.md,
  },
  petRightInfo: {
    flex: 1,
    gap: 2,
  },
  petNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petNameText: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 14.5,
    fontWeight: '700',
  },
  vaccineTagSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  vaccineTagSuccessText: {
    ...typography.captionBold,
    color: colors.success,
    fontSize: 8.5,
  },
  vaccineTagWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  vaccineTagWarningText: {
    ...typography.captionBold,
    color: colors.warning,
    fontSize: 8.5,
  },
  petBreedText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  expandPetsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    backgroundColor: 'rgba(0, 168, 150, 0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.14)',
    marginTop: 2,
  },
  expandPetsBtnText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  cvoCleanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3FAF8',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.15)',
    marginTop: 2,
  },
  cvoLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cvoBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cvoTextWrap: {
    flex: 1,
  },
  cvoTitle: {
    ...typography.title,
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  cvoSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10.5,
  },
  cvoCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.25)',
  },
  cvoCallBtnPressed: {
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
  },
  cvoCallBtnText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11.5,
  },
  footerSpacing: {
    height: spacing.lg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 38, 0.60)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  modalSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(7, 30, 38, 0.05)',
  },
  modalFormScroll: {
    maxHeight: 400,
  },
  modalFormContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  modalField: {
    gap: 4,
  },
  modalFieldLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12.5,
  },
  editErrorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 10,
    borderRadius: radius.md,
  },
  editErrorText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 12,
    flex: 1,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalCancelWrap: {
    flex: 1,
  },
  modalSaveWrap: {
    flex: 1.4,
  },
});
