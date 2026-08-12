import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, shadows, spacing, typography } from '@theme';
import { phoneRule, required } from '@lib/validation';
import { haptic } from '@lib/haptics';
import { useForm } from '@hooks/useForm';
import { useAuthStore } from '@store/useAuthStore';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { StepHeader } from '@components/ui/StepHeader';
import { BackButton } from '@components/ui/BackButton';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';

export default function OwnerRegistrationScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const saveOwnerProfile = useAuthStore((state) => state.saveOwnerProfile);
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  const { fields, setValue, validateField, validateAll } = useForm(
    {
      fullName: user?.fullName ?? '',
      mobileNumber: user?.mobileNumber ?? '',
      address: user?.address ?? '',
    },
    {
      fullName: [required('Enter your full name.')],
      mobileNumber: [required('Enter your mobile number.'), phoneRule],
      address: [required('Enter your home address.')],
    },
  );

  useEffect(() => {
    setReady(true);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!validateAll()) {
      haptic.warning();
      return;
    }
    setSubmitting(true);
    setNetworkError(undefined);
    try {
      await saveOwnerProfile(fields.mobileNumber.value, fields.address.value);
      haptic.success();
      router.push('/(register)/pet');
    } catch {
      setNetworkError(
        'We couldn’t save your details. Check your connection and try again.',
      );
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [validateAll, saveOwnerProfile, fields.mobileNumber.value, fields.address.value, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Hero Canvas with Animated Floating Bubbles */}
          <View style={styles.heroCanvas}>
            <AnimatedBubbleBackground />
            <View style={styles.backBtnWrap}>
              <BackButton />
            </View>
          </View>

          {/* Curved Bottom Sheet Container */}
          <View style={[styles.cardSheet, shadows.lg]}>
            {/* Floating Center Badge Pill */}
            <View style={[styles.floatingBadge, shadows.md]}>
              <Ionicons name="person-outline" size={26} color={colors.white} />
            </View>

            <StepHeader
              step={1}
              total={2}
              title="Tell us about yourself"
              subtitle="The City Veterinary Office uses these details to reach you about your pet’s care."
            />

            <View style={styles.form}>
              <Input
                label="Full name"
                value={fields.fullName.value}
                onChangeText={(v) => setValue('fullName', v)}
                onBlur={() => validateField('fullName')}
                error={fields.fullName.error}
                returnKeyType="next"
                leftIcon={<Ionicons name="person-outline" size={20} color={colors.textMuted} />}
                placeholder="Your full name"
                editable={!submitting}
              />
              <Input
                label="Mobile number"
                value={fields.mobileNumber.value}
                onChangeText={(v) => setValue('mobileNumber', v)}
                onBlur={() => validateField('mobileNumber')}
                error={fields.mobileNumber.error}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                returnKeyType="next"
                leftIcon={<Ionicons name="phone-portrait-outline" size={20} color={colors.textMuted} />}
                placeholder="09xx xxx xxxx"
                editable={!submitting}
              />
              <Input
                label="Home address"
                value={fields.address.value}
                onChangeText={(v) => setValue('address', v)}
                onBlur={() => validateField('address')}
                error={fields.address.error}
                multiline
                textContentType="fullStreetAddress"
                returnKeyType="done"
                leftIcon={<Ionicons name="home-outline" size={20} color={colors.textMuted} />}
                placeholder="Street, barangay, city"
                editable={!submitting}
                style={styles.multilineInput}
              />
            </View>

            <View style={styles.bottom}>
              {networkError ? <ErrorMessage message={networkError} /> : null}
              <Button
                title="Continue"
                size="lg"
                onPress={handleContinue}
                loading={submitting}
                rightIcon={<Ionicons name="arrow-forward" size={20} color={colors.white} />}
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
    backgroundColor: '#E6F5F2',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  heroCanvas: {
    height: 120,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backBtnWrap: {
    position: 'absolute',
    top: 16,
    left: 20,
    zIndex: 10,
  },
  cardSheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 28,
    position: 'relative',
    minHeight: 520,
  },
  floatingBadge: {
    position: 'absolute',
    top: -26,
    alignSelf: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  multilineInput: {
    minHeight: 56,
    paddingTop: spacing.md,
  },
  bottom: {
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
});

