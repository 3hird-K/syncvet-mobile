import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import {
  detectPhilippineTelco,
  formatPhilippineMobileInput,
  isPhilippineMobile,
} from '@lib/validation';
import { useAuthStore } from '@store/useAuthStore';
import { useProfileEditStore } from '@store/useProfileEditStore';
import { Input } from '@components/ui/Input';
import { AddressPicker } from '@components/ui/AddressPicker';
import { toast } from '@components/ui/Sonner';

/**
 * Update Profile sheet.
 *
 * Mounted from the root layout (not inside the profile tab screen) so the
 * backdrop and card render above the custom tab bar.
 */
export function EditProfileSheet() {
  const visible = useProfileEditStore((state) => state.visible);
  const close = useProfileEditStore((state) => state.close);
  const user = useAuthStore((state) => state.user);
  const { user: clerkUser } = useUser();

  const fullName =
    user?.fullName ||
    clerkUser?.fullName ||
    (clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
      : '') ||
    'SyncVet Resident';
  const mobileNumber =
    user?.mobileNumber || clerkUser?.primaryPhoneNumber?.phoneNumber || '';
  const address = user?.address || 'Cagayan de Oro City';

  const parseNames = useCallback((full: string, clerk?: any) => {
    const clerkFirst = clerk?.firstName?.trim();
    const clerkLast = clerk?.lastName?.trim();
    if (clerkFirst) {
      return { firstName: clerkFirst, lastName: clerkLast || '' };
    }
    const clean = full.replace('SyncVet Resident', '').trim();
    const parts = clean.split(' ');
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
    };
  }, []);

  const initialNames = useMemo(
    () => parseNames(fullName, clerkUser),
    [parseNames, fullName, clerkUser],
  );

  const [firstName, setFirstName] = useState(initialNames.firstName);
  const [lastName, setLastName] = useState(initialNames.lastName);
  const [phone, setPhone] = useState(() => formatPhilippineMobileInput(mobileNumber));
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [residence, setResidence] = useState(address);
  const [saving, setSaving] = useState(false);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [firstNameError, setFirstNameError] = useState<string | undefined>();
  const [lastNameError, setLastNameError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [editError, setEditError] = useState<string | undefined>();

  const isPhoneValid = useMemo(() => isPhilippineMobile(phone), [phone]);
  const detectedTelco = useMemo(() => detectPhilippineTelco(phone), [phone]);

  // Reload the latest profile values each time the sheet is opened.
  useEffect(() => {
    if (!visible) return;
    const names = parseNames(fullName, clerkUser);
    setFirstName(names.firstName);
    setLastName(names.lastName);
    setPhone(formatPhilippineMobileInput(mobileNumber));
    setPhoneFocused(false);
    setResidence(address);
    setAddressPickerOpen(false);
    setFirstNameError(undefined);
    setLastNameError(undefined);
    setPhoneError(undefined);
    setEditError(undefined);
  }, [visible, parseNames, fullName, clerkUser, mobileNumber, address]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // Let the native location picker handle its own back press first.
      if (addressPickerOpen) return false;
      if (!saving) close();
      return true;
    });
    return () => sub.remove();
  }, [visible, saving, addressPickerOpen, close]);

  const validatePhone = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setPhoneError('Enter your mobile number.');
      return false;
    }
    if (!isPhilippineMobile(trimmed)) {
      setPhoneError('Enter a valid 11-digit Philippine mobile number starting with 09.');
      return false;
    }
    setPhoneError(undefined);
    return true;
  }, []);

  const handlePhoneChange = useCallback((text: string) => {
    setPhone(formatPhilippineMobileInput(text));
    setPhoneError(undefined);
    setEditError(undefined);
  }, []);

  const handleSave = useCallback(async () => {
    let isValid = true;

    if (!firstName.trim()) {
      setFirstNameError('Enter first name.');
      isValid = false;
    } else {
      setFirstNameError(undefined);
    }

    if (!lastName.trim()) {
      setLastNameError('Enter last name.');
      isValid = false;
    } else {
      setLastNameError(undefined);
    }

    if (!validatePhone(phone)) {
      isValid = false;
    }

    if (!residence.trim()) {
      setEditError('Please enter your residence address.');
      isValid = false;
    }

    if (!isValid) {
      haptic.warning();
      return;
    }

    setSaving(true);
    setEditError(undefined);

    try {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const combinedFullName = `${trimmedFirst} ${trimmedLast}`.trim();

      await useAuthStore.getState().saveOwnerProfile(
        phone.replace(/[\s-]/g, ''),
        residence.trim(),
        combinedFullName,
        trimmedFirst,
        trimmedLast,
      );

      if (clerkUser) {
        try {
          await clerkUser.update({ firstName: trimmedFirst, lastName: trimmedLast });
        } catch (clerkErr) {
          console.log('Clerk update note:', clerkErr);
        }
      }

      close();
      toast.success('Profile updated successfully!', {
        description: 'Details saved locally.',
      });
    } catch (err: any) {
      console.log('Update profile error:', err);
      setEditError(err?.message || 'Could not update profile. Please try again.');
      haptic.error();
    } finally {
      setSaving(false);
    }
  }, [firstName, lastName, phone, residence, validatePhone, clerkUser, close]);

  if (!visible) return null;

  return (
    <View style={styles.overlayRoot}>
      <Pressable
        style={styles.backdropPressable}
        onPress={() => {
          if (!saving) close();
        }}
      />

      <KeyboardAvoidingView behavior="padding" style={styles.sheetContainer}>
        <View style={[styles.sheetCard, shadows.lg]}>
          <View style={styles.sheetHeader}>
            <View style={styles.headerText}>
              <Text style={styles.sheetTitle}>Update Profile</Text>
              <Text style={styles.sheetSubtitle}>
                Manage your contact &amp; address details
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel={saving ? 'Saving profile' : 'Save profile'}
                accessibilityRole="button"
                onPress={handleSave}
                disabled={saving}
                hitSlop={8}
                style={[
                  styles.iconButton,
                  styles.saveIconButton,
                  saving && styles.iconButtonDisabled,
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="save-outline" size={20} color={colors.primary} />
                )}
              </Pressable>

              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                onPress={close}
                disabled={saving}
                hitSlop={8}
                style={[styles.iconButton, saving && styles.iconButtonDisabled]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.nameRow}>
              <View style={styles.nameCol}>
                <Text style={styles.fieldLabel}>First Name</Text>
                <Input
                  compact
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    if (firstNameError) setFirstNameError(undefined);
                    if (editError) setEditError(undefined);
                  }}
                  onBlur={() => {
                    if (!firstName.trim()) setFirstNameError('Enter first name.');
                    else setFirstNameError(undefined);
                  }}
                  error={firstNameError}
                  placeholder="First name"
                  leftIcon={<Ionicons name="person-outline" size={16} color={colors.primary} />}
                  editable={!saving}
                />
              </View>
              <View style={styles.nameCol}>
                <Text style={styles.fieldLabel}>Last Name</Text>
                <Input
                  compact
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    if (lastNameError) setLastNameError(undefined);
                    if (editError) setEditError(undefined);
                  }}
                  onBlur={() => {
                    if (!lastName.trim()) setLastNameError('Enter last name.');
                    else setLastNameError(undefined);
                  }}
                  error={lastNameError}
                  placeholder="Last name"
                  editable={!saving}
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                {phone.length > 0 ? (
                  isPhoneValid ? (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                      <Text style={styles.verifiedText} numberOfLines={1}>
                        {detectedTelco || 'PH Verified'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.warningBadge}>
                      <Ionicons name="alert-circle" size={12} color={colors.warning} />
                      <Text style={styles.warningText}>09 · 11 digits</Text>
                    </View>
                  )
                ) : null}
              </View>

              <Input
                compact
                value={phone}
                onChangeText={handlePhoneChange}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => {
                  setPhoneFocused(false);
                  validatePhone(phone);
                }}
                error={phoneError}
                helper={
                  phone.length === 0
                    ? 'Alerts and vaccination reminders will be sent here.'
                    : isPhoneValid
                      ? undefined
                      : 'Must be 11 digits and start with 09.'
                }
                keyboardType="phone-pad"
                maxLength={13}
                placeholder="09XX-XXX-XXXX"
                leftIcon={
                  <Ionicons
                    name="call-outline"
                    size={17}
                    color={phoneFocused || isPhoneValid ? colors.primary : colors.textMuted}
                  />
                }
                rightIcon={
                  phone.length > 0 && !saving ? (
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  ) : undefined
                }
                onRightIconPress={() => handlePhoneChange('')}
                editable={!saving}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Residence Address</Text>
              <AddressPicker
                compact
                value={residence}
                onChange={setResidence}
                editable={!saving}
                onModalVisibilityChange={setAddressPickerOpen}
              />
            </View>

            {editError ? (
              <View style={styles.errorWrap}>
                <Ionicons name="alert-circle" size={15} color={colors.error} />
                <Text style={styles.errorText}>{editError}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 30, 38, 0.60)',
    justifyContent: 'flex-end',
    zIndex: 2000,
    elevation: 2000,
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 18,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sheetTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  sheetSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
    marginTop: 2,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 30, 38, 0.05)',
  },
  saveIconButton: {
    backgroundColor: colors.primaryLight,
  },
  iconButtonDisabled: {
    opacity: 0.55,
  },
  formScroll: {
    flexShrink: 1,
    maxHeight: 360,
  },
  formContent: {
    gap: 10,
    paddingBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nameCol: {
    flex: 1,
    gap: 3,
  },
  fieldBlock: {
    gap: 3,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: '60%',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  verifiedText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 10,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.warningLight,
  },
  warningText: {
    ...typography.captionBold,
    color: colors.warning,
    fontSize: 10,
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 9,
    borderRadius: radius.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 11.5,
    flex: 1,
  },
});
