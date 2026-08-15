import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Switch,
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
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { Avatar } from '@components/ui/Avatar';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { AddressPicker } from '@components/ui/AddressPicker';
import { updateClerkUnsafeMetadata } from '@lib/clerkMetadata';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useNotificationPreferences } from '@hooks/useNotificationPreferences';
import { syncQueue, syncEngine } from '@services/sync';
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
  const { isOnline } = useNetworkStatus();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const {
    pets: storePets,
    appointments: storeAppts,
    loading,
    loaded,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    syncNow,
  } = useResidentData();

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

  // Notification Preferences & OS Permissions
  const {
    preferences: notifPrefs,
    isGranted: notifGranted,
    updatePreference: updateNotifPref,
    requestPermission: requestNotifPermission,
  } = useNotificationPreferences();
  const [editAddress, setEditAddress] = useState(address);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [editError, setEditError] = useState<string | undefined>();

  // Read pets (local-first with offline pending creation support)
  const residentPets: MetadataPet[] = useMemo(() => {
    if (storePets && storePets.length > 0) {
      return storePets;
    }
    if (Array.isArray(metadata.pets)) {
      return metadata.pets;
    }
    return [];
  }, [storePets, metadata.pets]);


  const stats = useMemo(() => {
    const today = todayISO();
    const appts =
      storeAppts && storeAppts.length > 0
        ? storeAppts
        : (Array.isArray(metadata.appointments) ? metadata.appointments : []);

    const upcoming = (appts as any[]).filter(
      (a: any) => a.status !== 'cancelled' && a.status !== 'completed' && a.date >= today,
    ).length;
    const completed = (appts as any[]).filter((a: any) => a.status === 'completed').length;
    return { pets: residentPets.length, upcoming, completed };
  }, [residentPets, storeAppts, metadata.appointments]);

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

      const ownerId = user?.id || clerkUser?.id || '';

      await useAuthStore.getState().saveOwnerProfile(editPhone.trim(), editAddress.trim());

      if (ownerId) {
        await syncQueue.enqueue(ownerId, 'profile', ownerId, 'UPDATE_PROFILE', {
          mobileNumber: editPhone.trim(),
          address: editAddress.trim(),
          fullName: editName.trim(),
        });
        syncEngine.sync(ownerId, clerkUser).catch(() => {});
      }

      setEditModalVisible(false);
      toast.success('Profile updated successfully!', {
        description: 'Details saved locally.',
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
        router.replace({ pathname: '/onboarding', params: { slide: '3' } });
      }, 750);
    } catch (e) {
      console.log('Signout note:', e);
      signOut();
      router.replace({ pathname: '/onboarding', params: { slide: '3' } });
    }
  };

  const handleRefresh = useCallback(async () => {
    haptic.light();
    try {
      await syncNow();
    } catch (e) {
      console.log('Profile refresh error:', e);
    }
  }, [syncNow]);

  if (loading && !loaded && !user && !clerkUser) {
    return (
      <AnimatedScreen animation="zoom">
        <ProfileScreenSkeleton />
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen animation="zoom">
      <Screen scroll onRefresh={handleRefresh}>
        {/* Top Header with Title and Modern Action Pills */}
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
              <Ionicons name="pencil" size={13} color={colors.primaryDark} />
              <Text style={styles.headerEditText}>Edit Profile</Text>
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

        {/* Modern Resident Identity Card */}
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
              <Avatar name={fullName} size={62} photoUrl={photoUrl} />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={11.5} color={colors.white} />
              </View>
            </Pressable>

            {/* Resident Info on Right */}
            <View style={styles.heroTextWrap}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {fullName}
                </Text>
              </View>

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
            <Ionicons name="location-sharp" size={12} color={colors.primary} />
            <Text style={styles.heroAddressText} numberOfLines={1}>
              {address}
            </Text>
          </View>
        </View>

        {/* 3-Column Modern Compact Stats Row */}
        <View style={styles.statsRow}>
          <Pressable
            style={[styles.statBox, shadows.sm]}
            onPress={() => {
              haptic.light();
              router.push('/pets' as never);
            }}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(0, 168, 150, 0.10)' }]}>
              <Ionicons name="paw" size={14} color={colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.pets}</Text>
            <Text style={styles.statLabel}>Registered</Text>
          </Pressable>

          <Pressable
            style={[styles.statBox, shadows.sm]}
            onPress={() => {
              haptic.light();
              router.push('/appointments' as never);
            }}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(14, 116, 144, 0.10)' }]}>
              <Ionicons name="calendar" size={14} color={colors.info} />
            </View>
            <Text style={styles.statNumber}>{stats.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </Pressable>

          <Pressable
            style={[styles.statBox, shadows.sm]}
            onPress={async () => {
              haptic.light();
              if (pendingCount > 0 && isOnline) {
                try {
                  await syncNow();
                  toast.success('Sync complete', { description: 'All queued items synced.' });
                } catch {
                  toast.error('Sync failed', { description: 'Will retry automatically.' });
                }
              } else {
                toast.info('Sync Queue', {
                  description:
                    pendingCount > 0
                      ? `${pendingCount} change${pendingCount > 1 ? 's' : ''} queued to sync.`
                      : 'All records are synced with City Vet.',
                });
              }
            }}
          >
            <View
              style={[
                styles.statIconWrap,
                {
                  backgroundColor:
                    pendingCount > 0
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'rgba(16, 185, 129, 0.10)',
                },
              ]}
            >
              <Ionicons
                name={
                  pendingCount > 0
                    ? 'cloud-upload-outline'
                    : 'cloud-done-outline'
                }
                size={14}
                color={pendingCount > 0 ? colors.warning : colors.success}
              />
            </View>
            <Text
              style={[
                styles.statNumber,
                pendingCount > 0 && { color: colors.warning },
              ]}
            >
              {pendingCount}
            </Text>
            <Text style={styles.statLabel}>To Sync</Text>
          </Pressable>
        </View>


        {/* Sync & Notification Preferences Card */}
        <View style={[styles.prefHubCard, shadows.sm]}>

          {/* Row 1: Cloud & Local Sync */}
          <View style={styles.prefRow}>
            <View style={styles.prefRowLeft}>
              <View style={[styles.prefRowIconBox, { backgroundColor: 'rgba(0, 168, 150, 0.10)' }]}>
                <Ionicons
                  name={
                    !isOnline
                      ? 'cloud-offline-outline'
                      : pendingCount > 0
                      ? 'arrow-up-circle-outline'
                      : 'cloud-done-outline'
                  }
                  size={18}
                  color={
                    !isOnline
                      ? colors.textMuted
                      : pendingCount > 0
                      ? colors.warning
                      : colors.primaryDark
                  }
                />
              </View>
              <View style={styles.prefRowTextWrap}>
                <Text style={styles.prefRowTitle}>Cloud Sync</Text>
                <Text style={styles.prefRowSub} numberOfLines={1}>
                  {!isOnline
                    ? pendingCount > 0
                      ? `${pendingCount} queued offline`
                      : 'Saved locally'
                    : isSyncing
                    ? 'Syncing with cloud...'
                    : pendingCount > 0
                    ? `${pendingCount} pending changes`
                    : 'Up to date'}
                </Text>
              </View>
            </View>

            {isOnline ? (
              <Pressable
                onPress={async () => {
                  haptic.light();
                  try {
                    await syncNow();
                    toast.success('Sync complete', { description: 'All records are up to date.' });
                  } catch {
                    toast.error('Sync failed', { description: 'Please try again in a moment.' });
                  }
                }}
                disabled={isSyncing}
                style={({ pressed }) => [
                  styles.prefSyncBtn,
                  isSyncing && styles.prefSyncBtnLoading,
                  pressed && styles.prefSyncBtnPressed,
                ]}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Sync data now"
              >
                <Ionicons name="sync" size={11} color={colors.primaryDark} />
                <Text style={styles.prefSyncBtnText}>
                  {isSyncing ? 'Syncing' : 'Sync'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Divider */}
          <View style={styles.prefDivider} />

          {/* Row 2: Appointment Reminders */}
          <View style={styles.prefRow}>
            <View style={styles.prefRowLeft}>
              <View style={[styles.prefRowIconBox, { backgroundColor: 'rgba(14, 116, 144, 0.10)' }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.info} />
              </View>
              <View style={styles.prefRowTextWrap}>
                <Text style={styles.prefRowTitle}>Appointment Reminders</Text>
                <Text style={styles.prefRowSub}>1 day & 2 hours before visit</Text>
              </View>
            </View>

            <Switch
              value={notifPrefs.appointmentsEnabled}
              onValueChange={(val) => {
                haptic.light();
                updateNotifPref('appointmentsEnabled', val);
              }}
              trackColor={{ false: '#CBD5E1', true: colors.primaryDark }}
              thumbColor={colors.white}
              ios_backgroundColor="#CBD5E1"
            />
          </View>

          {/* Divider */}
          <View style={styles.prefDivider} />

          {/* Row 3: Vaccine Due Reminders */}
          <View style={styles.prefRow}>
            <View style={styles.prefRowLeft}>
              <View style={[styles.prefRowIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.10)' }]}>
                <Ionicons name="medkit-outline" size={18} color={colors.success} />
              </View>
              <View style={styles.prefRowTextWrap}>
                <Text style={styles.prefRowTitle}>Vaccine Due Alerts</Text>
                <Text style={styles.prefRowSub}>7 days & 1 day before due date</Text>
              </View>
            </View>

            <Switch
              value={notifPrefs.vaccinesEnabled}
              onValueChange={(val) => {
                haptic.light();
                updateNotifPref('vaccinesEnabled', val);
              }}
              trackColor={{ false: '#CBD5E1', true: colors.primaryDark }}
              thumbColor={colors.white}
              ios_backgroundColor="#CBD5E1"
            />
          </View>

          {!notifGranted ? (
            <Pressable
              onPress={async () => {
                haptic.light();
                const granted = await requestNotifPermission();
                if (granted) {
                  toast.success('Notifications Enabled', {
                    description: 'Scheduled reminders will now trigger on your device.',
                  });
                } else {
                  toast.info('Permission Required', {
                    description: 'Please enable notifications in your device system settings.',
                  });
                }
              }}
              style={({ pressed }) => [
                styles.enableNotifBtn,
                pressed && styles.enableNotifBtnPressed,
              ]}
            >
              <Ionicons name="notifications-circle" size={16} color={colors.white} />
              <Text style={styles.enableNotifBtnText}>Enable Device Notifications</Text>
            </Pressable>
          ) : null}
        </View>

        {/* City Veterinary Office Station Strip */}
        <View style={[styles.cvoCleanCard, shadows.sm]}>
          <View style={styles.cvoLeftRow}>
            <View style={styles.cvoBadgeIcon}>
              <Ionicons name="business" size={16} color={colors.white} />
            </View>
            <View style={styles.cvoTextWrap}>
              <Text style={styles.cvoTitle}>City Vet Office · CDO</Text>
              <Text style={styles.cvoSub}>Mon – Fri · 8:00 AM – 5:00 PM</Text>
            </View>
          </View>

          <Pressable
            onPress={handleCallCVO}
            style={({ pressed }) => [styles.cvoCallBtn, pressed && styles.cvoCallBtnPressed]}
          >
            <Ionicons name="call" size={13} color={colors.white} />
            <Text style={styles.cvoCallBtnText}>Call CVO</Text>
          </Pressable>
        </View>
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
                  leftIcon={<Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />}
                  onPress={handleSaveProfile}
                  loading={savingProfile}
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
    marginBottom: spacing.sm,
    paddingTop: 0,
  },
  screenHeading: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 20,
    fontFamily: typography.font.bold,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10, 110, 100, 0.08)',
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.16)',
  },
  headerEditText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 12,
    fontFamily: typography.font.bold,
  },
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.18)',
  },
  headerLogoutText: {
    ...typography.captionBold,
    color: colors.error,
    fontSize: 12,
    fontFamily: typography.font.bold,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 2,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  heroTextWrap: {
    flex: 1,
    gap: 2.5,
    paddingLeft: 2,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 15.5,
    fontFamily: typography.font.bold,
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
    fontSize: 11.5,
  },
  heroAddressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    paddingHorizontal: 10,
    paddingVertical: 7,
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
    gap: 8,
    marginBottom: spacing.xs,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 2.5,
  },
  statIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 18,
    fontFamily: typography.font.bold,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10.5,
    lineHeight: 13,
  },
  sectionBlock: {
    marginBottom: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: typography.font.bold,
  },
  addPetHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  addPetHeaderText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 12.5,
    fontFamily: typography.font.bold,
  },
  emptyPetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: spacing.sm,
  },
  emptyPetIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontFamily: typography.font.bold,
  },
  emptyPetSub: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
  },
  petsVerticalList: {
    gap: 8,
  },
  petListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 12,
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
    fontFamily: typography.font.bold,
  },
  vaccineTagSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  vaccineTagSuccessText: {
    ...typography.captionBold,
    color: colors.success,
    fontSize: 9.5,
    fontFamily: typography.font.bold,
  },
  vaccineTagWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  vaccineTagWarningText: {
    ...typography.captionBold,
    color: colors.warning,
    fontSize: 9.5,
    fontFamily: typography.font.bold,
  },
  petBreedText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  expandPetsDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 168, 150, 0.06)',
    borderRadius: radius.lg,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.14)',
    marginTop: 2,
  },
  expandPetsDropdownText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 11.5,
    fontFamily: typography.font.bold,
  },
  prefHubCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    marginTop: spacing.sm,
    gap: 6,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 8,
  },
  prefRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  prefRowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  prefRowTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 1.5,
  },
  prefRowTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: typography.font.bold,
  },
  prefRowSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10.5,
  },
  prefSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.20)',
    flexShrink: 0,
  },
  prefSyncBtnLoading: {
    opacity: 0.7,
  },
  prefSyncBtnPressed: {
    backgroundColor: 'rgba(0, 168, 150, 0.16)',
  },
  prefSyncBtnText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 11,
    fontFamily: typography.font.bold,
  },
  prefDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(7, 30, 38, 0.06)',
    marginVertical: 1,
  },
  enableNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    paddingVertical: 8,
    borderRadius: radius.lg,
    marginTop: 4,
  },
  enableNotifBtnPressed: {
    opacity: 0.85,
  },
  enableNotifBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 11.5,
    fontFamily: typography.font.bold,
  },
  cvoCleanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FAF8',
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.14)',
    marginTop: spacing.md,
  },
  cvoLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cvoBadgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
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
    fontFamily: typography.font.bold,
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
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  cvoCallBtnPressed: {
    opacity: 0.88,
  },
  cvoCallBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 11.5,
    fontFamily: typography.font.bold,
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
