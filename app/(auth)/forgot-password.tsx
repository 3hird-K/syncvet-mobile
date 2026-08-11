import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '@theme';
import { emailRule, required } from '@lib/validation';
import { haptic } from '@lib/haptics';
import { useForm } from '@hooks/useForm';
import { getAuthService } from '@services/auth';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { AuthHeader } from '@components/ui/AuthHeader';
import { BackButton } from '@components/ui/BackButton';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { SuccessMessage } from '@components/ui/SuccessMessage';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [networkError, setNetworkError] = useState<string | undefined>();

  const { fields, setValue, validateField, validateAll } = useForm(
    { email: '' },
    { email: [required('Enter your email address.'), emailRule] },
  );

  const handleSubmit = useCallback(async () => {
    if (!validateAll()) {
      haptic.warning();
      return;
    }
    setSubmitting(true);
    setNetworkError(undefined);
    try {
      await getAuthService().requestPasswordReset(fields.email.value);
      setSent(true);
      haptic.success();
    } catch {
      setNetworkError(
        'We couldn’t reach the server. Check your connection and try again.',
      );
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [validateAll, fields.email.value]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <BackButton />
      </View>

      <AuthHeader
        title="Forgot password?"
        subtitle="Enter the email associated with your account and we’ll send you a reset link."
      />

      {sent ? (
        <View style={styles.body}>
          <SuccessMessage
            title="Reset link sent"
            message={`If an account exists for ${fields.email.value}, you’ll receive a link shortly.`}
          />
          <Button
            title="Back to Sign In"
            size="lg"
            onPress={() => {
              haptic.light();
              router.replace('/(auth)');
            }}
          />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.form}>
            <Input
              label="Email address"
              value={fields.email.value}
              onChangeText={(v) => setValue('email', v)}
              onBlur={() => validateField('email')}
              error={fields.email.error}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textMuted} />}
              placeholder="you@example.com"
              editable={!submitting}
            />

            {networkError ? <ErrorMessage message={networkError} /> : null}

            <Button
              title="Send Reset Link"
              size="lg"
              onPress={handleSubmit}
              loading={submitting}
              rightIcon={<Ionicons name="send-outline" size={20} color={colors.white} />}
            />
          </View>

          <Text style={styles.hint}>
            You’ll only receive an email if the address matches an existing
            account.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  headerRow: {
    marginBottom: spacing.xxl,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: spacing.xxl,
  },
  form: {
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 18,
  },
});
