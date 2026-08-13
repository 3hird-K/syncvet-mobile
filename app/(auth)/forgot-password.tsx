import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { width } = useWindowDimensions();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [networkError, setNetworkError] = useState<string | undefined>();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerBlockWrap}>
          {!sent ? (
            <View style={styles.headerRow}>
              <BackButton />
            </View>
          ) : null}

          <AuthHeader
            title={sent ? 'Check your email' : 'Forgot password?'}
            subtitle={
              sent
                ? 'We sent a password reset link to your email address.'
                : 'Enter the email associated with your account and we’ll send you a reset link.'
            }
            showLogo={false}
          />
        </View>

        {sent ? (
          <View style={styles.successBody}>
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
              showPaw
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
                leftIcon={<Ionicons name="mail-outline" size={20} color={colors.primary} />}
                placeholder="you@example.com"
                editable={!submitting}
              />

              {networkError ? <ErrorMessage message={networkError} /> : null}

              <Button
                title="Send Reset Link"
                size="lg"
                onPress={handleSubmit}
                loading={submitting}
                showPaw
              />
            </View>

            <Text style={styles.hint}>
              You’ll only receive an email if the address matches an existing account.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Absolute Bottom Full-Width Illustration (Hidden on success screen or when keyboard active) */}
      {!sent && !keyboardVisible ? (
        <View style={styles.absoluteBottomImageWrap} pointerEvents="none">
          <Image
            source={require('@assets/no-backgrounds/fam1-removebg-preview.png')}
            style={styles.absoluteBottomImage}
            resizeMode="contain"
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
  },
  flex: {
    flex: 1,
  },
  headerBlockWrap: {
    paddingTop: spacing.md,
  },
  headerRow: {
    marginBottom: spacing.md,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 130,
  },
  successBody: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xxl,
  },
  form: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 18,
  },
  absoluteBottomImageWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  absoluteBottomImage: {
    width: '100%',
    height: 145,
    maxHeight: 165,
  },
});
