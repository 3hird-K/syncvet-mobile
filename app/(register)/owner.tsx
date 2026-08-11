import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '@theme';
import { phoneRule, required } from '@lib/validation';
import { haptic } from '@lib/haptics';
import { useForm } from '@hooks/useForm';
import { useAuthStore } from '@store/useAuthStore';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { StepHeader } from '@components/ui/StepHeader';
import { BackButton } from '@components/ui/BackButton';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { BackgroundDecoration } from '@components/ui/BackgroundDecoration';

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <BackgroundDecoration subtle />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <BackButton />
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
          />
        </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  headerRow: {
    marginBottom: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  form: {
    marginTop: spacing.xxxl,
    gap: spacing.lg,
  },
  multilineInput: {
    minHeight: 56,
    paddingTop: spacing.md,
  },
  bottom: {
    marginTop: 'auto',
    gap: spacing.lg,
    paddingVertical: spacing.xxl,
  },
});
