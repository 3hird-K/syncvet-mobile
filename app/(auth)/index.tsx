import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { RefObject } from 'react';

import { colors, radius, spacing, typography } from '@theme';
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
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { SocialAuthButton } from '@components/ui/SocialAuthButton';

type AuthMode = 'signup' | 'signin';

const PAGES: AuthMode[] = ['signup', 'signin'];

const STRENGTH_META: Record<PasswordStrength, { label: string; color: string }> = {
  weak: { label: 'Weak', color: colors.error },
  fair: { label: 'Fair', color: colors.warning },
  good: { label: 'Good', color: colors.info },
  strong: { label: 'Strong', color: colors.success },
};

const STRENGTH_ORDER: PasswordStrength[] = ['weak', 'fair', 'good', 'strong'];

interface FormLike {
  fields: Record<string, { value: string; error?: string }>;
  setValue: (name: string, value: string) => void;
  validateField: (name: string) => void;
}

interface AuthSlideProps {
  mode: AuthMode;
  scrollX: SharedValue<number>;
  index: number;
  submitting: boolean;
  connectingGoogle: boolean;
  networkError?: string;
  strength: PasswordStrength;
  signInForm: FormLike;
  signUpForm: FormLike;
  signInPasswordRef: RefObject<TextInput | null>;
  signUpEmailRef: RefObject<TextInput | null>;
  signUpPasswordRef: RefObject<TextInput | null>;
  onGoogle: () => void;
  onForgot: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onSwitchMode: () => void;
  onViewOnboarding: () => void;
}

function AuthSlide({
  mode,
  scrollX,
  index,
  submitting,
  connectingGoogle,
  networkError,
  strength,
  signInForm,
  signUpForm,
  signInPasswordRef,
  signUpEmailRef,
  signUpPasswordRef,
  onGoogle,
  onForgot,
  onSignIn,
  onSignUp,
  onSwitchMode,
  onViewOnboarding,
}: AuthSlideProps) {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const isSignIn = mode === 'signin';
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const strengthMeta = STRENGTH_META[strength];
  const strengthIndex = STRENGTH_ORDER.indexOf(strength);

  const contentStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.96, 1, 0.96], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View style={contentStyle}>
      {/* Header Title Block */}
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <Text style={styles.subtitleTag}>CITY VETERINARY CARE</Text>
          <Pressable
            onPress={onViewOnboarding}
            style={styles.onboardingHeaderBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="View App Info"
          >
            <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
            <Text style={styles.onboardingHeaderLink}>App Info</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>
          {isSignIn ? 'Welcome back' : 'Create an account'}
        </Text>
        <Text style={styles.subtitle}>
          {isSignIn
            ? 'Sign in to access your pet health records and book consultations.'
            : 'Join SyncVet to connect with your City Veterinary Office.'}
        </Text>
      </View>

      {/* Form Block */}
      <View style={styles.form}>
        {isSignIn ? (
          <>
            <Input
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
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
              }
              placeholder="Email address"
              editable={!submitting}
            />

            <PasswordInput
              ref={signInPasswordRef}
              value={signInForm.fields.password.value}
              onChangeText={(v) => signInForm.setValue('password', v)}
              onBlur={() => signInForm.validateField('password')}
              error={signInForm.fields.password.error}
              textContentType="password"
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={onSignIn}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              }
              placeholder="Password"
              editable={!submitting}
            />

            <View style={styles.forgotRow}>
              <Pressable
                accessibilityRole="button"
                onPress={onForgot}
                hitSlop={8}
              >
                <Text style={styles.forgot}>Forgot password?</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Input
              value={signUpForm.fields.fullName.value}
              onChangeText={(v) => signUpForm.setValue('fullName', v)}
              onBlur={() => signUpForm.validateField('fullName')}
              error={signUpForm.fields.fullName.error}
              returnKeyType="next"
              onSubmitEditing={() => signUpEmailRef.current?.focus()}
              leftIcon={
                <Ionicons name="person-outline" size={20} color={colors.primary} />
              }
              placeholder="Full name"
              editable={!submitting}
            />

            <Input
              ref={signUpEmailRef}
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
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
              }
              placeholder="Email address"
              editable={!submitting}
            />

            <View>
              <PasswordInput
                ref={signUpPasswordRef}
                value={signUpForm.fields.password.value}
                onChangeText={(v) => signUpForm.setValue('password', v)}
                onBlur={() => signUpForm.validateField('password')}
                error={signUpForm.fields.password.error}
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={onSignUp}
                leftIcon={
                  <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
                }
                placeholder="Create password"
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
          onPress={isSignIn ? onSignIn : onSignUp}
          loading={submitting}
          variant="primary"
        />

        {/* Divider line */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Social Auth */}
        <SocialAuthButton
          onPress={onGoogle}
          loading={connectingGoogle}
          label={isSignIn ? 'Sign in with Google' : 'Sign up with Google'}
        />

        {/* Bottom Mode Switch Row */}
        <View style={styles.modeSwitchRow}>
          <Text style={styles.modeSwitchText}>
            {isSignIn ? "Don't have an account? " : 'Already have an account? '}
          </Text>
          <Pressable
            onPress={onSwitchMode}
            hitSlop={8}
          >
            <Text style={styles.modeSwitchLink}>
              {isSignIn ? 'Create Account' : 'Sign In'}
            </Text>
          </Pressable>
        </View>

        {/* App Info & Features Link */}
        <View style={styles.viewOnboardingRow}>
          <Pressable
            onPress={onViewOnboarding}
            hitSlop={8}
            style={styles.viewOnboardingBtn}
          >
            <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
            <Text style={styles.viewOnboardingText}>App Info & Features</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<AuthMode>>(null);
  const initialMode: AuthMode = params.mode === 'signin' ? 'signin' : 'signup';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [networkError, setNetworkError] = useState<string | undefined>();

  React.useEffect(() => {
    if (params.mode === 'signin') {
      setMode('signin');
      const index = PAGES.indexOf('signin');
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: index * width, animated: false });
      }, 50);
    }
  }, [params.mode, width]);

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

  const isSignIn = mode === 'signin';

  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      setMode(PAGES[Math.max(0, Math.min(PAGES.length - 1, index))]);
    },
    [width],
  );

  const goToMode = useCallback(
    (next: AuthMode) => {
      haptic.light();
      setMode(next);
      const index = PAGES.indexOf(next);
      listRef.current?.scrollToOffset({ offset: index * width, animated: true });
    },
    [width],
  );

  const handleGoogle = useCallback(async () => {
    haptic.medium();
    setConnectingGoogle(true);
    router.push('/(auth)/google');
  }, [router]);

  const handleForgot = useCallback(() => {
    haptic.light();
    router.push('/forgot-password');
  }, [router]);

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

  const handleViewOnboarding = useCallback(() => {
    haptic.light();
    router.push('/onboarding');
  }, [router]);

  const renderPage = useCallback(
    ({ item, index }: { item: AuthMode; index: number }) => (
      <View style={{ width }}>
        <ScrollView
          style={styles.pageScroll}
          contentContainerStyle={styles.pageContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <AuthSlide
            mode={item}
            scrollX={scrollX}
            index={index}
            submitting={submitting}
            connectingGoogle={connectingGoogle}
            networkError={networkError}
            strength={strength}
            signInForm={signInForm}
            signUpForm={signUpForm}
            signInPasswordRef={signInPasswordRef}
            signUpEmailRef={signUpEmailRef}
            signUpPasswordRef={signUpPasswordRef}
            onGoogle={handleGoogle}
            onForgot={handleForgot}
            onSignIn={handleSignIn}
            onSignUp={handleSignUp}
            onSwitchMode={() => goToMode(item === 'signin' ? 'signup' : 'signin')}
            onViewOnboarding={handleViewOnboarding}
          />
        </ScrollView>
      </View>
    ),
    [
      width,
      scrollX,
      submitting,
      connectingGoogle,
      networkError,
      strength,
      signInForm,
      signUpForm,
      handleGoogle,
      handleForgot,
      handleSignIn,
      handleSignUp,
      goToMode,
      handleViewOnboarding,
    ],
  );

  const keyExtractor = useCallback((item: AuthMode) => item, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.FlatList
          ref={listRef}
          data={PAGES}
          renderItem={renderPage}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          onMomentumScrollEnd={onMomentumScrollEnd}
          initialScrollIndex={PAGES.indexOf(initialMode)}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={4}
        />
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
  pageScroll: {
    flex: 1,
  },
  pageContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerBlock: {
    marginBottom: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  onboardingHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  onboardingHeaderLink: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11,
  },
  subtitleTag: {
    ...typography.captionBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    ...typography.heading1,
    color: colors.textPrimary,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.smallBold,
    color: colors.textMuted,
    fontSize: 12,
  },
  modeSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  modeSwitchText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  modeSwitchLink: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
    fontSize: 14,
  },
  viewOnboardingRow: {
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  viewOnboardingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewOnboardingText: {
    ...typography.captionMedium,
    color: colors.primary,
    fontSize: 13,
  },
});
