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
import { phoneRule } from '@lib/validation';
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
import { ProfileScreenSkeleton } from '@components/ui/Skeleton';
import { PawLoadingOverlay } from '@components/ui/PawLoading';

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
  const { loading, loaded } = useResidentData();

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
  const [loggingOut, setLoggingOut] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [editError, setEditError] = useState<string | undefined>();

  // Read pets exclusively from Clerk metadata
  const metadataPets: MetadataPet[] = useMemo(() => {
    if (Array.isArray(metadata.pets) && metadata.pets.length > 0) {
      return metadata.pets;
    }
    return [];
  }, [metadata.pets]);

  const [petsExpanded, setPetsExpanded] = useState(false);
  const DEFAULT_VISIBLE_PETS = 2;
  const visiblePets = petsExpanded
    ? metadataPets
    : metadataPets.slice(0, DEFAULT_VISIBLE_PETS);
  const hasMorePets = metadataPets.length > DEFAULT_VISIBLE_PETS;

  const stats = useMemo(() => {
    const today = todayISO();
    const metaAppts = Array.isArray(metadata.appointments) ? metadata.appointments : [];
    const upcoming = metaAppts.filter(
      (a: any) => a.status !== 'cancelled' && a.status !== 'completed' && a.date >= today,
    ).length;
    const completed = metaAppts.filter((a: any) => a.status === 'completed').length;
    return { pets: metadataPets.length, upcoming, completed };
  }, [metadataPets, metadata.appointments]);

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

  const validatePhone = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setPhoneError('Enter your mobile number.');
      return false;
    }
    if (!phoneRule.validate(trimmed)) {
      setPhoneError(phoneRule.message);
      return false;
    }
    setPhoneError(undefined);
    return true;
  };

  const handlePhoneChange = (text: string) => {
    setEditPhone(text);
    if (phoneError) setPhoneError(undefined);
    if (editError) setEditError(undefined);
  };

  const handleNameChange = (text: string) => {
    setEditName(text);
    if (nameError) setNameError(undefined);
    if (editError) setEditError(undefined);
  };

  const openEditModal = () => {
    haptic.light();
    setEditName(fullName);
    setEditPhone(mobileNumber);
    setEditAddress(address);
    setNameError(undefined);
    setPhoneError(undefined);
    setEditError(undefined);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    let isValid = true;

    if (!editName.trim()) {
      setNameError('Enter your full name.');
      isValid = false;
    } else {
      setNameError(undefined);
    }

    if (!validatePhone(editPhone)) {
      isValid = false;
    }

    if (!editAddress.trim()) {
      setEditError('Please enter your residence address.');
      isValid = false;
    }

    if (!isValid) {
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

  const handleLogout = async () => {
    try {
      haptic.medium();
      setLoggingOut(true);
      await clerkSignOut();
      signOut();
      toast.success('Logged out', {
        id: 'logout-success',
        description: 'You have been signed out of your account.',
      });
      setTimeout(() => {
        router.replace('/welcome' as never);
      }, 750);
    } catch (e) {
      console.log('Signout note:', e);
      signOut();
      router.replace('/welcome' as never);
    }
  };

  if (loading && !loaded && !user && !clerkUser) {
    return (
      <AnimatedScreen animation="zoom">
        <ProfileScreenSkeleton />
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen animation="zoom">
      <Screen scroll>
        {/* Compact Screen Header with Edit and Logout */}
        <View style={styles.topHeader}>
          <Text style={styles.screenHeading}>Profile</Text>
          <View style={styles.headerButtonsRow}>
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

            <Pressable
              onPress={handleLogout}
              style={styles.headerLogoutBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Log Out"
            >
              <Ionicons name="log-out-outline" size={13} color={colors.error} />
              <Text style={styles.headerLogoutText}>Log Out</Text>
            </Pressable>
          </View>
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
              <Avatar name={fullName} size={54} photoUrl={photoUrl} />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={11} color={colors.white} />
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
                      size={40}
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
                    onChangeText={handleNameChange}
                    onBlur={() => {
                      if (!editName.trim()) setNameError('Enter your full name.');
                      else setNameError(undefined);
                    }}
                    error={nameError}
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
                    onChangeText={handlePhoneChange}
                    onBlur={() => validatePhone(editPhone)}
                    error={phoneError}
                    keyboardType="phone-pad"
                    maxLength={13}
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
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Standard Paw Loading Overlay on Logout */}
      <PawLoadingOverlay visible={loggingOut} />
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingTop: 0,
  },
  screenHeading: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.16)',
  },
  headerEditText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11.5,
  },
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.18)',
  },
  headerLogoutText: {
    ...typography.captionBold,
    color: colors.error,
    fontSize: 11.5,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 2,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  heroTextWrap: {
    flex: 1,
    gap: 1,
    paddingLeft: 2,
  },
  heroName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  heroEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
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
    fontSize: 11,
  },
  heroAddressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  heroAddressText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 1,
  },
  statIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 9.5,
  },
  sectionBlock: {
    marginBottom: 5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 13.5,
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
    fontSize: 11.5,
  },
  emptyPetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: spacing.sm,
  },
  emptyPetIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 13,
    fontWeight: '700',
  },
  emptyPetSub: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10.5,
  },
  petsVerticalList: {
    gap: 5,
  },
  petListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 10,
  },
  petRightInfo: {
    flex: 1,
    gap: 1,
  },
  petNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  petNameText: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 13.5,
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
    fontSize: 8,
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
    fontSize: 8,
  },
  petBreedText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
  },
  expandPetsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 168, 150, 0.06)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.14)',
    marginTop: 1,
  },
  expandPetsBtnText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 11.5,
    fontWeight: '700',
  },
  cvoCleanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3FAF8',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.15)',
    marginTop: 2,
  },
  cvoLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  cvoBadgeIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
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
    fontSize: 12,
    fontWeight: '700',
  },
  cvoSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 9.5,
  },
  cvoCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.25)',
  },
  cvoCallBtnPressed: {
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
  },
  cvoCallBtnText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 10.5,
  },
  footerSpacing: {
    height: 4,
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
    width: '100%',
    marginTop: spacing.md,
  },
});
