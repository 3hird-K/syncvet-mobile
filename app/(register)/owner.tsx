import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { detectPhilippineTelco } from '@lib/validation';
import {
  CDO_BARANGAYS,
  findMatchingCDOBarangay,
  isValidCDOBarangay,
} from '@lib/philippineAddresses';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { DropdownSelect } from '@components/ui/DropdownSelect';
import { Button } from '@components/ui/Button';
import { syncQueue, syncEngine } from '@services/sync';
import { toast } from '@components/ui/Sonner';

type OnboardingStep = 1 | 2 | 3;

/**
 * Strict Philippine Mobile Number Formatter & Validator:
 * - Must start with 09
 * - Must have exactly 11 digits (09XX-XXX-XXXX)
 */
export function isPhilippineMobile(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('09') && digits.length === 11;
}

export function formatPhilippineMobileInput(raw: string): string {
  let digits = raw.replace(/\D/g, '');

  // Strip international prefix +63 / 63 if pasted or typed
  if (digits.startsWith('63') && digits.length > 2) {
    digits = '0' + digits.slice(2);
  } else if (digits.startsWith('9')) {
    digits = '09' + digits.slice(1);
  }

  // Cap at 11 digits
  digits = digits.slice(0, 11);

  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
}

const RELATIONSHIP_OPTIONS = [
  'Spouse / Partner',
  'Parent / Guardian',
  'Sibling',
  'Child',
  'Relative',
  'Friend',
  'Neighbor',
  'Co-worker',
  'Other',
];

export default function ResidentOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  const horizontalScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const { user: clerkUser } = useUser();
  const currentUser = useAuthStore((state) => state.user);
  const completeResidentOnboarding = useAuthStore(
    (state) => state.completeResidentOnboarding,
  );

  const [step, setStep] = useState<OnboardingStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isBarangayFocused, setIsBarangayFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Keyboard avoidance tracker (iOS only - Android handles soft keyboard natively with window adjustResize)
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const showSub = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 260);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // --- Step 1 States: Profile & Contact ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [smsConsent, setSmsConsent] = useState(true);

  // --- Step 2 States: CDO Location ---
  const [barangaySearch, setBarangaySearch] = useState(
    currentUser?.rawUserMetaData?.barangay || '',
  );
  const [selectedBarangay, setSelectedBarangay] = useState(
    currentUser?.rawUserMetaData?.barangay || '',
  );
  const [street, setStreet] = useState(
    currentUser?.rawUserMetaData?.street || currentUser?.address || '',
  );
  const [landmark, setLandmark] = useState(
    currentUser?.rawUserMetaData?.landmark || '',
  );

  // --- Step 3 States: Safety & Pets ---
  const [emergencyContact, setEmergencyContact] = useState(
    currentUser?.rawUserMetaData?.emergency_contact_name || '',
  );
  const [relationship, setRelationship] = useState(
    currentUser?.rawUserMetaData?.emergency_contact_relationship || 'Spouse / Partner',
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    currentUser?.rawUserMetaData?.emergency_contact_phone || '',
  );
  const [caredAnimals, setCaredAnimals] = useState<('dogs' | 'cats')[]>(
    currentUser?.rawUserMetaData?.cared_animals || ['dogs'],
  );

  // Sync initial user details once
  const initialSyncRef = useRef(false);
  useEffect(() => {
    if (!initialSyncRef.current && (clerkUser || currentUser)) {
      initialSyncRef.current = true;
      const initialFirst = clerkUser?.firstName || currentUser?.firstName || '';
      const initialLast = clerkUser?.lastName || currentUser?.lastName || '';
      const initialMobile = currentUser?.mobileNumber || '';

      if (initialFirst) setFirstName(initialFirst);
      if (initialLast) setLastName(initialLast);
      if (initialMobile) setMobileNumber(formatPhilippineMobileInput(initialMobile));
    }
  }, [clerkUser, currentUser]);

  // Strict 09 Philippine mobile validation
  const isPhoneValid = useMemo(() => {
    return isPhilippineMobile(mobileNumber);
  }, [mobileNumber]);

  // Detected Telco for Step 1
  const telcoDetected = useMemo(() => {
    return detectPhilippineTelco(mobileNumber);
  }, [mobileNumber]);

  // Suggestions for Step 2: ONLY appear once user starts typing
  const filteredBarangays = useMemo(() => {
    const q = barangaySearch.trim().toLowerCase();
    if (!q) {
      return []; // Do not show any suggestions until the user types
    }
    if (selectedBarangay && q === selectedBarangay.toLowerCase()) {
      return []; // Selected item confirmed, hide suggestion dropdown
    }
    return CDO_BARANGAYS.filter((b) => b.toLowerCase().includes(q)).slice(0, 8);
  }, [barangaySearch, selectedBarangay]);

  const handlePhoneChange = (val: string) => {
    const formatted = formatPhilippineMobileInput(val);
    setMobileNumber(formatted);
  };

  const handleEmergencyPhoneChange = (val: string) => {
    const formatted = formatPhilippineMobileInput(val);
    setEmergencyPhone(formatted);
  };

  const toggleAnimal = (type: 'dogs' | 'cats') => {
    haptic.light();
    setCaredAnimals((prev) => {
      if (prev.includes(type)) {
        return prev.filter((a) => a !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Step Validations
  const isStep1Valid = useMemo(() => {
    return firstName.trim().length > 0 && isPhoneValid;
  }, [firstName, isPhoneValid]);

  const matchedBarangay = useMemo(() => {
    return findMatchingCDOBarangay(selectedBarangay || barangaySearch);
  }, [selectedBarangay, barangaySearch]);

  const isBarangayValid = useMemo(() => {
    return Boolean(matchedBarangay);
  }, [matchedBarangay]);

  const isStep2Valid = useMemo(() => {
    return isBarangayValid && street.trim().length > 0;
  }, [isBarangayValid, street]);

  const isStep3Valid = true;

  // Step access control: prevent swiping next if required fields aren't filled
  const canAccessStep2 = isStep1Valid;
  const canAccessStep3 = isStep1Valid && isStep2Valid;

  const renderStep2 = canAccessStep2 || step >= 2;
  const renderStep3 = canAccessStep3 || step === 3;

  const isScrollEnabled = useMemo(() => {
    if (step === 1) return isStep1Valid;
    return true;
  }, [step, isStep1Valid]);

  // Programmatic scroll to a specific step
  const goToStep = useCallback((target: OnboardingStep) => {
    haptic.light();
    setStep(target);
    horizontalScrollRef.current?.scrollTo({
      x: (target - 1) * width,
      animated: true,
    });
  }, [width]);

  // Stepper Header click handling
  const handleStepHeaderPress = (target: OnboardingStep) => {
    if (target === step) return;
    if (target === 1) {
      goToStep(1);
      return;
    }
    if (target === 2) {
      if (!isStep1Valid) {
        haptic.warning();
        toast.error('Profile Incomplete', {
          description: 'Please enter your First Name and an 11-digit mobile number starting with 09.',
        });
        return;
      }
      goToStep(2);
      return;
    }
    if (target === 3) {
      if (!isStep1Valid) {
        haptic.warning();
        toast.error('Profile Incomplete', {
          description: 'Please complete Step 1 with a valid 09 mobile number before proceeding.',
        });
        return;
      }
      if (!isStep2Valid) {
        haptic.warning();
        toast.error('Location Incomplete', {
          description: !isBarangayValid
            ? 'Please enter or select an official Cagayan de Oro barangay.'
            : 'Street / House No. is required to proceed.',
        });
        return;
      }
      goToStep(3);
    }
  };

  // Gesture handling on swipe drag end
  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const targetIndex = Math.round(offsetX / width);

    // Trying to swipe to step 2 while step 1 is invalid
    if (step === 1 && targetIndex > 0 && !isStep1Valid) {
      haptic.warning();
      horizontalScrollRef.current?.scrollTo({ x: 0, animated: true });
      toast.error('Profile Incomplete', {
        description: 'First Name and a valid 11-digit mobile number (09XX) are required.',
      });
      return;
    }

    // Trying to swipe to step 3 while step 2 is invalid
    if (step === 2 && targetIndex > 1 && !isStep2Valid) {
      haptic.warning();
      horizontalScrollRef.current?.scrollTo({ x: width, animated: true });
      toast.error('Step 2 Incomplete', {
        description: !isBarangayValid
          ? 'Please select one of the 80 official Cagayan de Oro barangays.'
          : 'Street / House No. is required to proceed.',
      });
      return;
    }
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newStep = (Math.round(offsetX / width) + 1) as OnboardingStep;
    if (newStep === 2 && !isStep1Valid) {
      goToStep(1);
      return;
    }
    if (newStep === 3 && (!isStep1Valid || !isStep2Valid)) {
      goToStep(2);
      return;
    }
    if (newStep >= 1 && newStep <= 3) {
      setStep(newStep);
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      const finalBarangay = matchedBarangay || selectedBarangay.trim() || barangaySearch.trim();
      const cleanMobile = mobileNumber.replace(/[\s\-]/g, '');

      await completeResidentOnboarding({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        mobileNumber: cleanMobile,
        barangay: finalBarangay,
        street: street.trim(),
        landmark: landmark.trim(),
        smsNotificationsEnabled: smsConsent,
        emergencyContactName: emergencyContact.trim(),
        emergencyContactRelationship: relationship,
        emergencyContactPhone: emergencyPhone.replace(/[\s\-]/g, ''),
        caredAnimals,
        healthDeclarationAgreed: true,
      });

      // Enqueue to offline synchronization engine
      const ownerId = currentUser?.id || clerkUser?.id || '';
      if (ownerId) {
        await syncQueue.enqueue(ownerId, 'profile', ownerId, 'UPDATE_PROFILE', {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          mobileNumber: cleanMobile,
          address: `${street.trim()}, ${finalBarangay}, Cagayan de Oro City`,
          metadata: {
            barangay: finalBarangay,
            street: street.trim(),
            landmark: landmark.trim(),
            sms_notifications_enabled: smsConsent,
            emergency_contact_name: emergencyContact.trim(),
            emergency_contact_relationship: relationship,
            emergency_contact_phone: emergencyPhone.replace(/[\s\-]/g, ''),
            cared_animals: caredAnimals,
            health_declaration_agreed: true,
          },
        });
        syncEngine.sync(ownerId, clerkUser).catch(() => {});
      }

      haptic.success();
      toast.success('Registration Complete', {
        description: 'Welcome to SyncVet City Veterinary Office Cagayan de Oro!',
      });

      router.replace('/(main)');
    } catch (e: any) {
      console.warn('Onboarding save error:', e);
      toast.error('Could not save details', {
        description: 'Please check your connection and try again.',
      });
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  };

  const userEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    currentUser?.email ||
    'resident@cagayandeoro.gov.ph';
  const userPhoto = clerkUser?.imageUrl || currentUser?.photoUrl;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Stepper Indicator */}
        <View style={styles.stepperContainer}>
          {/* Step 1 */}
          <Pressable style={styles.stepItem} onPress={() => handleStepHeaderPress(1)}>
            <View
              style={[
                styles.stepCircle,
                step >= 1 && styles.stepCircleActive,
                step > 1 && styles.stepCircleCompleted,
              ]}
            >
              {step > 1 ? (
                <Ionicons name="checkmark" size={16} color={colors.white} />
              ) : (
                <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>
                  1
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                step === 1 && styles.stepLabelActive,
              ]}
              numberOfLines={1}
            >
              Profile
            </Text>
          </Pressable>

          {/* Line 1 -> 2 */}
          <View
            style={[
              styles.stepLine,
              step >= 2 && styles.stepLineActive,
            ]}
          />

          {/* Step 2 */}
          <Pressable style={styles.stepItem} onPress={() => handleStepHeaderPress(2)}>
            <View
              style={[
                styles.stepCircle,
                step >= 2 && styles.stepCircleActive,
                step > 2 && styles.stepCircleCompleted,
              ]}
            >
              {step > 2 ? (
                <Ionicons name="checkmark" size={16} color={colors.white} />
              ) : (
                <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>
                  2
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                step === 2 && styles.stepLabelActive,
              ]}
              numberOfLines={1}
            >
              CDO Location
            </Text>
          </Pressable>

          {/* Line 2 -> 3 */}
          <View
            style={[
              styles.stepLine,
              step === 3 && styles.stepLineActive,
            ]}
          />

          {/* Step 3 */}
          <Pressable style={styles.stepItem} onPress={() => handleStepHeaderPress(3)}>
            <View
              style={[
                styles.stepCircle,
                step === 3 && styles.stepCircleActive,
              ]}
            >
              <Text style={[styles.stepNumber, step === 3 && styles.stepNumberActive]}>
                3
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                step === 3 && styles.stepLabelActive,
              ]}
              numberOfLines={1}
            >
              Safety & Pets
            </Text>
          </Pressable>
        </View>

        {/* Step Status & Guide Pill */}
        <View style={styles.statusBarContainer}>
          <View
            style={[
              styles.statusBarPill,
              (step === 1 && isStep1Valid) || (step === 2 && isStep2Valid) || (step === 3 && isStep3Valid)
                ? styles.statusBarPillReady
                : styles.statusBarPillPending,
            ]}
          >
            <Ionicons
              name={
                (step === 1 && isStep1Valid) || (step === 2 && isStep2Valid) || (step === 3 && isStep3Valid)
                  ? 'checkmark-circle'
                  : 'lock-closed-outline'
              }
              size={13}
              color={
                (step === 1 && isStep1Valid) || (step === 2 && isStep2Valid) || (step === 3 && isStep3Valid)
                  ? colors.primary
                  : colors.textMuted
              }
            />
            <Text
              style={[
                styles.statusBarText,
                ((step === 1 && isStep1Valid) || (step === 2 && isStep2Valid) || (step === 3 && isStep3Valid)) &&
                  styles.statusBarTextReady,
              ]}
              numberOfLines={1}
            >
              {step === 1
                ? isStep1Valid
                  ? 'Profile ready · Swipe to proceed'
                  : 'First Name & 11-digit mobile (09XX) required'
                : step === 2
                ? isStep2Valid
                  ? 'Location ready · Swipe to proceed'
                  : 'Barangay & Street address required'
                : 'Ready · Tap Complete Registration to finish'}
            </Text>
          </View>
        </View>

        {/* Horizontal Paging Content (Clean Swipe Left/Right) */}
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={isScrollEnabled}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          keyboardShouldPersistTaps="handled"
          style={styles.horizontalScroll}
        >
          {/* ================= STEP 1: Profile & Contact ================= */}
          <View style={[styles.stepPage, { width }]}>
            <ScrollView
              contentContainerStyle={[
                styles.pageScrollContent,
                Platform.OS === 'ios' && keyboardHeight > 0
                  ? { paddingBottom: keyboardHeight + 40 }
                  : { paddingBottom: 60 },
              ]}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.heading}>Resident Profile & Contact</Text>
              <Text style={styles.subheading}>
                Verify your legal name and provide an active mobile number for official vaccination reminders and rabies alerts.
              </Text>

              {/* Name Row */}
              <View style={[styles.nameRow, isCompact && styles.nameRowStack]}>
                <View style={[styles.nameCol, { marginRight: isCompact ? 0 : 8 }]}>
                  <Text style={styles.inputLabel}>
                    First Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First Name"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>

                <View style={[styles.nameCol, { marginLeft: isCompact ? 0 : 8, marginTop: isCompact ? 12 : 0 }]}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last Name"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Google Account Card */}
              <View style={styles.fieldSection}>
                <View style={styles.labelWithBadge}>
                  <Text style={styles.inputLabel}>Google Account</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                    <Text style={styles.verifiedText}>Linked & Verified</Text>
                  </View>
                </View>

                <View style={styles.googleCard}>
                  {userPhoto ? (
                    <Image source={{ uri: userPhoto }} style={styles.googleAvatar as any} />
                  ) : (
                    <View style={styles.googleAvatarPlaceholder}>
                      <Ionicons name="person" size={18} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.googleInfo}>
                    <Text style={styles.googleEmail} numberOfLines={1}>
                      {userEmail}
                    </Text>
                    <Text style={styles.googleSubtitle}>Google Single Sign-On Account</Text>
                  </View>
                </View>
              </View>

              {/* Mobile Number with Strict 09 Validation & Telco Validator */}
              <View style={styles.fieldSection}>
                <View style={styles.labelWithBadge}>
                  <Text style={styles.inputLabel}>
                    Mobile Number <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  {isPhoneValid ? (
                    <View style={styles.telcoBadge}>
                      <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                      <Text style={styles.telcoText}>{telcoDetected || '09 Valid'}</Text>
                    </View>
                  ) : mobileNumber.length > 0 ? (
                    <View style={styles.warningBadge}>
                      <Ionicons name="alert-circle" size={12} color={colors.warning} />
                      <Text style={styles.warningText}>Starts with 09 (11 digits)</Text>
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.phoneInputContainer,
                    isPhoneFocused && styles.inputFocused,
                    mobileNumber.length > 0 && !isPhoneValid && styles.inputWarningBorder,
                    isPhoneValid && styles.inputSuccessBorder,
                  ]}
                >
                  <View style={styles.phonePrefixBox}>
                    <Text style={styles.phonePrefix}>🇵🇭 PH</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={mobileNumber}
                    onChangeText={handlePhoneChange}
                    onFocus={() => setIsPhoneFocused(true)}
                    onBlur={() => setIsPhoneFocused(false)}
                    placeholder="09XX-XXX-XXXX"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={13}
                  />
                  {mobileNumber.length > 0 && (
                    <Pressable
                      onPress={() => setMobileNumber('')}
                      hitSlop={8}
                      style={styles.clearBtn}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
                {mobileNumber.length > 0 && !isPhoneValid ? (
                  <Text style={styles.inputHintError}>
                    Philippine mobile numbers must be 11 digits and start with 09 (e.g. 0917-854-8454).
                  </Text>
                ) : (
                  <Text style={styles.inputHintMuted}>
                    Official rabies alerts and vaccination reminders will be sent here.
                  </Text>
                )}
              </View>

              <View style={styles.footerWrap}>
                <Text style={styles.footerText}>
                  Protected by City Veterinary Office of Cagayan de Oro - Data Privacy Act of 2012
                </Text>
              </View>
            </ScrollView>
          </View>

          {/* ================= STEP 2: CDO Location ================= */}
          {renderStep2 && (
            <View style={[styles.stepPage, { width }]}>
            <ScrollView
              contentContainerStyle={[
                styles.pageScrollContent,
                Platform.OS === 'ios' && keyboardHeight > 0
                  ? { paddingBottom: keyboardHeight + 40 }
                  : { paddingBottom: 60 },
              ]}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.heading}>Cagayan de Oro Residence</Text>
              <Text style={styles.subheading}>
                Required for rabies zoning, field vaccination operations, and lost pet registry mapping.
              </Text>

              {/* Barangay in CDO */}
              <View style={styles.fieldSection}>
                <View style={styles.labelWithBadge}>
                  <Text style={styles.inputLabel}>
                    Barangay in CDO <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  {isBarangayValid ? (
                    <View style={styles.telcoBadge}>
                      <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                      <Text style={styles.telcoText}>Official CDO Barangay</Text>
                    </View>
                  ) : barangaySearch.trim().length > 0 ? (
                    <View style={styles.warningBadge}>
                      <Ionicons name="alert-circle" size={12} color={colors.warning} />
                      <Text style={styles.warningText}>Must be in CDO</Text>
                    </View>
                  ) : (
                    <Text style={styles.subLabelHint}>Type to search 80 barangays</Text>
                  )}
                </View>

                {/* Search Input Box */}
                <View
                  style={[
                    styles.searchInputContainer,
                    isBarangayFocused && styles.inputFocused,
                    isBarangayValid
                      ? styles.inputSuccessBorder
                      : barangaySearch.trim().length > 0
                        ? styles.inputWarningBorder
                        : null,
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={isBarangayValid ? colors.primary : colors.textMuted}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    value={barangaySearch}
                    onChangeText={(val) => {
                      setBarangaySearch(val);
                      if (selectedBarangay && val !== selectedBarangay) {
                        setSelectedBarangay('');
                      }
                    }}
                    onFocus={() => setIsBarangayFocused(true)}
                    onBlur={() => setIsBarangayFocused(false)}
                    placeholder="Type CDO Barangay (e.g. Carmen, Nazareth, Bulua)..."
                    placeholderTextColor={colors.textMuted}
                  />
                  {barangaySearch.length > 0 && (
                    <Pressable
                      onPress={() => {
                        setBarangaySearch('');
                        setSelectedBarangay('');
                      }}
                      hitSlop={8}
                      style={styles.clearBtn}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                {/* Selected Barangay Confirmation Pill */}
                {matchedBarangay ? (
                  <View style={styles.selectedBarangayPill}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text style={styles.selectedBarangayText}>
                      Barangay {matchedBarangay}, CDO
                    </Text>
                    <Pressable
                      onPress={() => {
                        haptic.light();
                        setBarangaySearch('');
                        setSelectedBarangay('');
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.changeLinkText}>Change</Text>
                    </Pressable>
                  </View>
                ) : barangaySearch.trim().length > 0 ? (
                  <Text style={styles.inputHintError}>
                    Please select or type one of the official 80 barangays in Cagayan de Oro City.
                  </Text>
                ) : (
                  <Text style={styles.inputHintMuted}>
                    SyncVet is exclusively for pet owners residing in Cagayan de Oro (80 official barangays).
                  </Text>
                )}

                {/* Barangay Suggestions Chips: ONLY when user has typed and not yet matched */}
                {!matchedBarangay && filteredBarangays.length > 0 && (
                  <View style={styles.chipsWrap}>
                    <Text style={styles.chipsSubLabel}>Tap to select Barangay:</Text>
                    <View style={styles.chipsRow}>
                      {filteredBarangays.map((b) => (
                        <Pressable
                          key={b}
                          style={styles.barangayChip}
                          onPress={() => {
                            haptic.light();
                            setSelectedBarangay(b);
                            setBarangaySearch(b);
                          }}
                        >
                          <Ionicons
                            name="location-sharp"
                            size={12}
                            color={colors.primary}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.barangayChipText}>{b}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Street / House No. */}
              <View style={styles.fieldSection}>
                <Text style={styles.inputLabel}>
                  Street / House No. <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={street}
                  onChangeText={setStreet}
                  placeholder="e.g. Block 4 Lot 12, Xavier Estates"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Landmark */}
              <View style={styles.fieldSection}>
                <Text style={styles.inputLabel}>Landmark (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholder="e.g. Near Barangay Hall"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.footerWrap}>
                <Text style={styles.footerText}>
                  Protected by City Veterinary Office of Cagayan de Oro - Data Privacy Act of 2012
                </Text>
              </View>
            </ScrollView>
          </View>
          )}

          {/* ================= STEP 3: Safety & Pets ================= */}
          {renderStep3 && (
            <View style={[styles.stepPage, { width }]}>
            <ScrollView
              contentContainerStyle={[
                styles.pageScrollContent,
                Platform.OS === 'ios' && keyboardHeight > 0
                  ? { paddingBottom: keyboardHeight + 40 }
                  : { paddingBottom: 60 },
              ]}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.heading}>Emergency Contact & Pet Info</Text>
              <Text style={styles.subheading}>
                Helps municipal veterinarians reach secondary contact in animal emergencies or lost pet recoveries.
              </Text>

              {/* Emergency Contact Person */}
              <View style={styles.fieldSection}>
                <Text style={styles.inputLabel}>Emergency Contact Person</Text>
                <TextInput
                  style={styles.input}
                  value={emergencyContact}
                  onChangeText={setEmergencyContact}
                  placeholder="e.g. Maria Dela Cruz"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Relationship */}
              <View style={styles.fieldSection}>
                <DropdownSelect
                  label="Relationship to Pet Owner"
                  value={relationship}
                  options={RELATIONSHIP_OPTIONS}
                  onChange={setRelationship}
                  title="Select Relationship"
                />
              </View>

              {/* Emergency Contact Phone */}
              <View style={styles.fieldSection}>
                <View style={styles.labelWithBadge}>
                  <Text style={styles.inputLabel}>Emergency Contact Phone (Optional)</Text>
                  <Text style={styles.subLabelHint}>09XX-XXX-XXXX</Text>
                </View>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.phonePrefixBox}>
                    <Text style={styles.phonePrefix}>🇵🇭 PH</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={emergencyPhone}
                    onChangeText={handleEmergencyPhoneChange}
                    placeholder="0918-987-6543"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={13}
                  />
                </View>
              </View>

              {/* Animal Care Preferences */}
              <View style={styles.fieldSection}>
                <Text style={styles.inputLabel}>What animals do you care for in CDO?</Text>
                <View style={styles.animalRow}>
                  <Pressable
                    style={[
                      styles.animalCard,
                      caredAnimals.includes('dogs') && styles.animalCardSelected,
                    ]}
                    onPress={() => toggleAnimal('dogs')}
                  >
                    <Text style={styles.animalEmoji}>🐕</Text>
                    <Text
                      style={[
                        styles.animalTitle,
                        caredAnimals.includes('dogs') && styles.animalTitleSelected,
                      ]}
                    >
                      Dogs <Text style={styles.animalSubtext}>(Canines)</Text>
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.animalCard,
                      caredAnimals.includes('cats') && styles.animalCardSelected,
                    ]}
                    onPress={() => toggleAnimal('cats')}
                  >
                    <Text style={styles.animalEmoji}>🐈</Text>
                    <Text
                      style={[
                        styles.animalTitle,
                        caredAnimals.includes('cats') && styles.animalTitleSelected,
                      ]}
                    >
                      Cats <Text style={styles.animalSubtext}>(Felines)</Text>
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Complete Registration Action Button */}
              <View style={styles.submitWrap}>
                <Button
                  title={submitting ? 'Saving Profile...' : 'Complete Registration'}
                  variant="primary"
                  size="lg"
                  onPress={handleFinish}
                  disabled={submitting}
                  loading={submitting}
                />
              </View>

              <View style={styles.footerWrap}>
                <Text style={styles.footerText}>
                  Protected by City Veterinary Office of Cagayan de Oro - Data Privacy Act of 2012
                </Text>
              </View>
            </ScrollView>
          </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardWrap: {
    flex: 1,
  },

  /* Stepper */
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
  },
  stepItem: {
    alignItems: 'center',
    width: 90,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepCircleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumber: {
    fontFamily: typography.font.bold,
    fontSize: 13,
    color: colors.textMuted,
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepLabel: {
    fontFamily: typography.font.medium,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stepLabelActive: {
    fontFamily: typography.font.bold,
    color: colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginTop: -18,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },

  /* Status Bar Container */
  statusBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 4,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  statusBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    gap: 6,
  },
  statusBarPillReady: {
    backgroundColor: colors.primaryLight,
  },
  statusBarPillPending: {
    backgroundColor: colors.surfaceMuted,
  },
  statusBarText: {
    fontFamily: typography.font.medium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  statusBarTextReady: {
    fontFamily: typography.font.bold,
    color: colors.primary,
  },

  /* Horizontal Paging Layout */
  horizontalScroll: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  stepPage: {
    flex: 1,
  },
  pageScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },

  /* Headings */
  heading: {
    fontFamily: typography.font.extrabold,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subheading: {
    fontFamily: typography.font.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 20,
  },

  /* Fields */
  fieldSection: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  nameRowStack: {
    flexDirection: 'column',
  },
  nameCol: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: typography.font.bold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  requiredStar: {
    color: colors.error,
  },
  subLabelHint: {
    fontFamily: typography.font.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  labelWithBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  input: {
    fontFamily: typography.font.medium,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  /* Google Card */
  googleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLighter,
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
  },
  googleAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  googleAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleInfo: {
    flex: 1,
  },
  googleEmail: {
    fontFamily: typography.font.bold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  googleSubtitle: {
    fontFamily: typography.font.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  verifiedText: {
    fontFamily: typography.font.bold,
    fontSize: 10,
    color: colors.primary,
  },

  /* Telco Badge */
  telcoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  telcoText: {
    fontFamily: typography.font.bold,
    fontSize: 10,
    color: colors.primary,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  warningText: {
    fontFamily: typography.font.bold,
    fontSize: 10,
    color: colors.warningDark,
  },

  /* Phone Input */
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputWarningBorder: {
    borderColor: colors.warning,
  },
  inputSuccessBorder: {
    borderColor: colors.primary,
  },
  clearBtn: {
    paddingRight: 12,
  },
  phonePrefixBox: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1.2,
    borderRightColor: colors.border,
  },
  phonePrefix: {
    fontFamily: typography.font.bold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  phoneInput: {
    flex: 1,
    fontFamily: typography.font.medium,
    fontSize: 14,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  inputHintError: {
    fontFamily: typography.font.medium,
    fontSize: 11,
    color: colors.warningDark,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  inputHintMuted: {
    fontFamily: typography.font.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    paddingHorizontal: 2,
  },

  /* Notification Card */
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1.2,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 8,
  },
  notificationTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  notificationTitle: {
    fontFamily: typography.font.bold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  notificationDesc: {
    fontFamily: typography.font.regular,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  /* Barangay Search & Chips */
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.font.medium,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 11,
  },
  selectedBarangayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1.2,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    gap: 8,
  },
  selectedBarangayText: {
    flex: 1,
    fontFamily: typography.font.bold,
    fontSize: 13,
    color: colors.primary,
  },
  changeLinkText: {
    fontFamily: typography.font.bold,
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  chipsWrap: {
    marginTop: 12,
  },
  chipsSubLabel: {
    fontFamily: typography.font.semibold,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  barangayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  barangayChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  barangayChipText: {
    fontFamily: typography.font.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  barangayChipTextSelected: {
    fontFamily: typography.font.bold,
    color: colors.primary,
  },

  /* Step 3 Animals */
  animalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  animalCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLighter,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  animalCardSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  animalEmoji: {
    fontSize: 20,
  },
  animalTitle: {
    fontFamily: typography.font.semibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  animalTitleSelected: {
    fontFamily: typography.font.bold,
    color: colors.primary,
  },
  animalSubtext: {
    fontFamily: typography.font.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  /* Complete Registration Button */
  submitWrap: {
    marginTop: 20,
  },

  /* Footer */
  footerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  footerText: {
    fontFamily: typography.font.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.primary,
    textAlign: 'center',
  },
});
