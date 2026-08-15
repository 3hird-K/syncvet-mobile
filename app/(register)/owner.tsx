import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { phoneRule, required } from '@lib/validation';
import { haptic } from '@lib/haptics';
import { useForm } from '@hooks/useForm';
import { useAuthStore } from '@store/useAuthStore';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { AddressPicker } from '@components/ui/AddressPicker';
import { StepHeader } from '@components/ui/StepHeader';
import { BackButton } from '@components/ui/BackButton';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';
import { updateClerkUnsafeMetadata } from '@lib/clerkMetadata';
import { syncQueue, syncEngine } from '@services/sync';

const CLINIC_OPTIONS = [
  { label: 'Main City Vet Clinic', value: 'main' },
  { label: 'District 1 Health Station', value: 'd1' },
  { label: 'Mobile Vet Service', value: 'mobile' },
];

export default function OwnerRegistrationScreen() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const saveOwnerProfile = useAuthStore((state) => state.saveOwnerProfile);
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState<string | undefined>();
  const [preferredClinic, setPreferredClinic] = useState('main');

  const { fields, setValue, validateField, validateAll } = useForm(
    {
      fullName: clerkUser?.fullName || clerkUser?.firstName || user?.fullName || '',
      mobileNumber: (clerkUser?.unsafeMetadata?.mobileNumber as string) || user?.mobileNumber || '',
      address: (clerkUser?.unsafeMetadata?.address as string) || user?.address || '',
    },
    {
      fullName: [required('Enter your full name.')],
      mobileNumber: [required('Enter your mobile number.'), phoneRule],
      address: [required('Enter your home address.')],
    },
  );

  const syncedUserRef = useRef(false);
  useEffect(() => {
    if (user && !syncedUserRef.current) {
      syncedUserRef.current = true;
      if (user.fullName && !fields.fullName.value) {
        setValue('fullName', user.fullName);
      }
      if (user.mobileNumber && !fields.mobileNumber.value) {
        setValue('mobileNumber', user.mobileNumber);
      }
      if (user.address && !fields.address.value) {
        setValue('address', user.address);
      }
    }
  }, [user, fields.fullName.value, fields.mobileNumber.value, fields.address.value, setValue]);

  const handleContinue = useCallback(async () => {
    if (!validateAll()) {
      haptic.warning();
      return;
    }
    setSubmitting(true);
    setNetworkError(undefined);
    try {
      const mobile = fields.mobileNumber.value.trim();
      const addr = fields.address.value.trim();

      await saveOwnerProfile(mobile, addr);

      const ownerId = user?.id || clerkUser?.id || '';
      if (ownerId) {
        await syncQueue.enqueue(ownerId, 'profile', ownerId, 'UPDATE_PROFILE', {
          mobileNumber: mobile,
          address: addr,
        });
        syncEngine.sync(ownerId, clerkUser).catch(() => {});
      }

      haptic.success();
      router.push('/(register)/pet');
    } catch {
      setNetworkError(
        'We couldn’t save your details. Please try again.',
      );
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [validateAll, saveOwnerProfile, fields.mobileNumber.value, fields.address.value, user?.id, clerkUser, router]);

  const reducedMotion = useReducedMotion();
  const enterAnim = reducedMotion ? FadeIn.duration(120) : ZoomIn.duration(280);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Sleek Top Header Navigation Bar */}
        <View style={styles.topHeaderNav}>
          <BackButton />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.formContent}>
            <StepHeader
              step={1}
              total={2}
              title="Tell us about yourself"
              subtitle="The City Veterinary Office uses these details to contact you about your pet’s care and appointments."
            />

            <Animated.View entering={enterAnim} style={styles.form}>
              <Input
                value={fields.fullName.value}
                onChangeText={(v) => setValue('fullName', v)}
                onBlur={() => validateField('fullName')}
                error={fields.fullName.error}
                returnKeyType="next"
                leftIcon={<Ionicons name="person-outline" size={20} color={colors.primary} />}
                placeholder="Full name"
                editable={!submitting}
              />
              <Input
                value={fields.mobileNumber.value}
                onChangeText={(v) => setValue('mobileNumber', v)}
                onBlur={() => validateField('mobileNumber')}
                error={fields.mobileNumber.error}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                returnKeyType="next"
                maxLength={13}
                leftIcon={<Ionicons name="call-outline" size={20} color={colors.primary} />}
                placeholder="Mobile number (09xxxxxxxxx)"
                editable={!submitting}
              />
              <AddressPicker
                value={fields.address.value}
                onChange={(v) => {
                  setValue('address', v);
                  validateField('address');
                }}
                error={fields.address.error}
                editable={!submitting}
              />
            </Animated.View>

            <View style={styles.bottom}>
              {networkError ? <ErrorMessage message={networkError} /> : null}
              <Button
                title="Continue to Pet Profile"
                size="lg"
                onPress={handleContinue}
                loading={submitting}
                variant="primary"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  topHeaderNav: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  formContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  multilineInput: {
    minHeight: 64,
    paddingTop: spacing.md,
  },
  bottom: {
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
});

