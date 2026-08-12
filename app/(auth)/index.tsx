import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import {
  emailRule,
  evaluatePasswordStrength,
  minLength,
  required,
} from '@lib/validation';
import type { PasswordStrength } from '@lib/validation';
import { haptic } from '@lib/haptics';
import { useForm } from '@hooks/useForm';
import { useAuthStore } from '@store/useAuthStore';
import { AuthError } from '@services/auth';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { PasswordInput } from '@components/ui/PasswordInput';
import { Logo } from '@components/ui/Logo';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { SegmentedControl } from '@components/ui/SegmentedControl';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';

type AuthMode = 'signin' | 'signup';

const STRENGTH_META: Record<PasswordStrength, { label: string; color: string }> = {
  weak: { label: 'Weak', color: colors.error },
  fair: { label: 'Fair', color: colors.warning },
  good: { label: 'Good', color: colors.info },
  strong: { label: 'Strong', color: colors.success },
};

const STRENGTH_ORDER: PasswordStrength[] = ['weak', 'fair', 'good', 'strong'];

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signup'); // Default to Create Account per user's preference
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState<string | undefined>();

  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);

  const signInPasswordRef = useRef<TextInput>(null);
  const signUpEmailRef = useRef<TextInput>(null);
  const signUpPasswordRef = useRef<TextInput>(null);

  const signInForm = useForm(
    { email: '', password: '' },
    {
      email: [required('Enter your email address.'), emailRule],
      password: [required('Enter your password.')],
    },
  );

  const signUpForm = useForm(
    { fullName: '', email: '', password: '' },
    {
      fullName: [required('Enter your full name.'), minLength(3, 'Enter your full name.')],
      email: [required('Enter your email address.'), emailRule],
      password: [
        required('Create a password.'),
        minLength(8, 'Password must be at least 8 characters.'),
      ],
    },
  );

  const strength = useMemo(
    () => evaluatePasswordStrength(signUpForm.fields.password.value),
    [signUpForm.fields.password.value],
  );
  const strengthMeta = STRENGTH_META[strength];
  const strengthIndex = STRENGTH_ORDER.indexOf(strength);

  const isSignIn = mode === 'signin';

  const switchMode = useCallback((next: AuthMode) => {
    haptic.light();
    setMode(next);
    setNetworkError(undefined);
  }, []);

  const handleSignIn = useCallback(async () => {
    if (!signInForm.validateAll()) {
      haptic.warning();
      return;
    }
    setSubmitting(true);
    setNetworkError(undefined);
    try {
      await signIn({
        email: signInForm.fields.email.value,
        password: signInForm.fields.password.value,
      });
      haptic.success();
      router.replace(
        useAuthStore.getState().user?.profileCompleted ? '/(main)' : '/owner',
      );
    } catch (err) {
      if (err instanceof AuthError && err.field) {
        signInForm.setFieldError(err.field, err.message);
      } else {
        setNetworkError(
          'We couldn’t reach the server. Check your connection and try again.',
        );
      }
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [signInForm, signIn, router]);

  const handleSignUp = useCallback(async () => {
    if (!signUpForm.validateAll()) {
      haptic.warning();
      return;
    }
    setSubmitting(true);
    setNetworkError(undefined);
    try {
      await signUp({
        fullName: signUpForm.fields.fullName.value,
        email: signUpForm.fields.email.value,
        password: signUpForm.fields.password.value,
      });
      haptic.success();
      router.replace('/owner');
    } catch (err) {
      if (err instanceof AuthError && err.field) {
        signUpForm.setFieldError(err.field, err.message);
      } else {
        setNetworkError(
          'We couldn’t reach the server. Check your connection and try again.',
        );
      }
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [signUpForm, signUp, router]);

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

            <View style={styles.logoHeader}>
              <Logo size={42} wordmarkSize={20} />
            </View>
          </View>

          {/* Curved Bottom Sheet Container */}
          <View style={[styles.cardSheet, shadows.lg]}>
            {/* Floating Overlap Center Badge Pill */}
            <View style={[styles.floatingBadge, shadows.md]}>
              <Ionicons
                name={isSignIn ? 'key-outline' : 'person-add-outline'}
                size={26}
                color={colors.white}
              />
            </View>

            <View style={styles.cardHeader}>
              <Text style={styles.subtitleTag}>AUTHENTICATION</Text>
              <Text style={styles.title}>Welcome to SyncVet</Text>
              <Text style={styles.subtitle}>
                Access veterinary services from your city, all in one place.
              </Text>
            </View>

            <SegmentedControl<AuthMode>
              options={[
                { value: 'signin', label: 'Sign In' },
                { value: 'signup', label: 'Create Account' },
              ]}
              value={mode}
              onChange={switchMode}
            />

            <Animated.View
              key={mode}
              entering={FadeInDown.duration(260).springify().damping(22)}
              exiting={FadeOut.duration(120)}
              style={styles.form}
            >
              {isSignIn ? (
                <>
                  <Input
                    label="Email address"
                    value={signInForm.fields.email.value}
                    onChangeText={(v) => signInForm.setValue('email', v)}
                    onBlur={() => signInForm.validateField('email')}
                    error={signInForm.fields.email.error}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => signInPasswordRef.current?.focus()}
                    leftIcon={
                      <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
                    }
                    placeholder="you@example.com"
                    editable={!submitting}
                  />

                  <PasswordInput
                    ref={signInPasswordRef}
                    label="Password"
                    value={signInForm.fields.password.value}
                    onChangeText={(v) => signInForm.setValue('password', v)}
                    onBlur={() => signInForm.validateField('password')}
                    error={signInForm.fields.password.error}
                    textContentType="password"
                    autoComplete="current-password"
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                    leftIcon={
                      <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                    }
                    placeholder="Enter your password"
                    editable={!submitting}
                  />

                  <View style={styles.forgotRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        haptic.light();
                        router.push('/forgot-password');
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.forgot}>Forgot password?</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Input
                    label="Full name"
                    value={signUpForm.fields.fullName.value}
                    onChangeText={(v) => signUpForm.setValue('fullName', v)}
                    onBlur={() => signUpForm.validateField('fullName')}
                    error={signUpForm.fields.fullName.error}
                    returnKeyType="next"
                    onSubmitEditing={() => signUpEmailRef.current?.focus()}
                    leftIcon={
                      <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                    }
                    placeholder="Juan Dela Cruz"
                    editable={!submitting}
                  />

                  <Input
                    ref={signUpEmailRef}
                    label="Email address"
                    value={signUpForm.fields.email.value}
                    onChangeText={(v) => signUpForm.setValue('email', v)}
                    onBlur={() => signUpForm.validateField('email')}
                    error={signUpForm.fields.email.error}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => signUpPasswordRef.current?.focus()}
                    leftIcon={
                      <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
                    }
                    placeholder="you@example.com"
                    editable={!submitting}
                  />

                  <View>
                    <PasswordInput
                      ref={signUpPasswordRef}
                      label="Password"
                      value={signUpForm.fields.password.value}
                      onChangeText={(v) => signUpForm.setValue('password', v)}
                      onBlur={() => signUpForm.validateField('password')}
                      error={signUpForm.fields.password.error}
                      helper={
                        signUpForm.fields.password.value
                          ? undefined
                          : 'At least 8 characters.'
                      }
                      textContentType="newPassword"
                      autoComplete="new-password"
                      returnKeyType="done"
                      onSubmitEditing={handleSignUp}
                      leftIcon={
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                      }
                      placeholder="Create a password"
                      editable={!submitting}
                    />
                    {signUpForm.fields.password.value ? (
                      <View
                        style={styles.strengthRow}
                        accessibilityLabel={`Password strength: ${strengthMeta.label}`}
                      >
                        <View style={styles.strengthBars}>
                          {STRENGTH_ORDER.map((level, i) => (
                            <View
                              key={level}
                              style={[
                                styles.strengthBar,
                                {
                                  backgroundColor:
                                    i <= strengthIndex ? strengthMeta.color : colors.border,
                                },
                              ]}
                            />
                          ))}
                        </View>
                        <Text style={[styles.strengthLabel, { color: strengthMeta.color }]}>
                          {strengthMeta.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </>
              )}

              {networkError ? <ErrorMessage message={networkError} /> : null}

              <Button
                title={isSignIn ? 'Sign In' : 'Create Account'}
                size="lg"
                onPress={isSignIn ? handleSignIn : handleSignUp}
                loading={submitting}
                variant="primary"
              />
            </Animated.View>

            <Text style={styles.terms}>
              By continuing, you agree to the SyncVet{' '}
              <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>.
            </Text>
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
    height: 140,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoHeader: {
    marginTop: 10,
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
  cardHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  subtitleTag: {
    ...typography.captionBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 310,
  },
  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -spacing.xs,
  },
  forgot: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  strengthBar: {
    flex: 1,
    height: 5,
    borderRadius: radius.pill,
  },
  strengthLabel: {
    ...typography.smallBold,
    width: 52,
    textAlign: 'right',
  },
  terms: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
  },
});

