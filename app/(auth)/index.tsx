import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useClerk, useOAuth } from '@clerk/expo';

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

  const headerAnimatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.25, 1, 0.25], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.82, 1, 0.82], Extrapolation.CLAMP),
        },
        {
          translateY: interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const tagAnimatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    const rotation = interpolate(scrollX.value, inputRange, [-14, 0, 14], Extrapolation.CLAMP);
    return {
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.68, 1, 0.68], Extrapolation.CLAMP),
        },
        {
          rotate: `${rotation}deg`,
        },
      ],
    };
  });

  const formAnimatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.84, 1, 0.84], Extrapolation.CLAMP),
        },
        {
          translateY: interpolate(scrollX.value, inputRange, [36, 0, 36], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <View>
      {/* Header Title Block */}
      <Animated.View style={[styles.headerBlock, headerAnimatedStyle]}>
        <View style={styles.headerTopRow}>
          <Animated.View style={[styles.subtitleTagWrap, tagAnimatedStyle]}>
            <Ionicons name="paw" size={13} color={colors.primary} />
            <Text style={styles.subtitleTag}>CITY VETERINARY CARE</Text>
          </Animated.View>
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
      </Animated.View>

      {/* Form Block */}
      <Animated.View style={[styles.form, formAnimatedStyle]}>
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
          showPaw
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
      </Animated.View>
    </View>
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const clerk = useClerk();

  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState<string | undefined>();

  // Warm up browser for OAuth
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const handleGoogle = useCallback(async () => {
    try {
      haptic.medium();
      setConnectingGoogle(true);
      setNetworkError(undefined);

      const redirectUrl = AuthSession.makeRedirectUri();

      const { createdSessionId, signIn: clerkSignInFlow, signUp: clerkSignUpFlow, setActive } =
        await startOAuthFlow({ redirectUrl });

      const sessionId = createdSessionId || clerkSignInFlow?.createdSessionId || clerkSignUpFlow?.createdSessionId;

      if (sessionId && setActive) {
        await setActive({ session: sessionId });
        haptic.success();

        const clerkEmail =
          clerkSignUpFlow?.emailAddress ??
          clerkSignInFlow?.identifier ??
          '';
        const firstName = clerkSignUpFlow?.firstName || clerkSignInFlow?.userData?.firstName || '';
        const lastName = clerkSignUpFlow?.lastName || clerkSignInFlow?.userData?.lastName || '';
        const clerkName =
          firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || (clerkEmail ? clerkEmail.split('@')[0] : 'Resident');

        await useAuthStore.getState().googleSignIn({
          email: clerkEmail || 'user@syncvet.app',
          fullName: clerkName || 'SyncVet Resident',
        });

        const currentUser = useAuthStore.getState().user;
        const metadata = (clerkSignUpFlow?.unsafeMetadata || (clerkSignInFlow?.userData as any)?.unsafeMetadata || {}) as Record<string, any>;
        const hasMetadata = Boolean(
          metadata?.profileCompleted ||
          (metadata?.mobileNumber && metadata?.address) ||
          currentUser?.profileCompleted
        );

        if (hasMetadata) {
          if (metadata?.mobileNumber || metadata?.address) {
            await useAuthStore.getState().saveOwnerProfile(
              (metadata?.mobileNumber as string) || currentUser?.mobileNumber || '',
              (metadata?.address as string) || currentUser?.address || '',
            );
          }
          await useAuthStore.getState().markRegistrationComplete();
          router.replace('/(main)');
        } else {
          router.replace('/(register)/owner');
        }
      } else {
        // Dismissed or no session created, reset loading
        setConnectingGoogle(false);
      }
    } catch (err: any) {
      console.log('Google OAuth error:', err);
      setConnectingGoogle(false);
      setNetworkError(
        err?.errors?.[0]?.longMessage ||
        err?.message ||
        'Could not sign in with Google. Please try again.',
      );
      haptic.error();
    } finally {
      setConnectingGoogle(false);
    }
  }, [startOAuthFlow]);

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
    const email = signInForm.fields.email.value.trim();
    const password = signInForm.fields.password.value;

    try {
      if (clerk && clerk.client) {
        const result = await clerk.client.signIn.create({
          identifier: email,
          password,
        });

        if (result.status === 'complete') {
          await clerk.setActive({ session: result.createdSessionId });
          const fullName = result.userData?.firstName
            ? `${result.userData.firstName} ${result.userData.lastName || ''}`.trim()
            : 'Resident';

          await useAuthStore.getState().googleSignIn({
            email,
            fullName,
          });

          haptic.success();
          const metadata = ((result.userData as any)?.unsafeMetadata || {}) as Record<string, any>;
          const hasMetadata = Boolean(
            metadata?.profileCompleted ||
            (metadata?.mobileNumber && metadata?.address)
          );

          if (hasMetadata) {
            if (metadata?.mobileNumber || metadata?.address) {
              await useAuthStore.getState().saveOwnerProfile(
                (metadata?.mobileNumber as string) || '',
                (metadata?.address as string) || '',
              );
            }
            await useAuthStore.getState().markRegistrationComplete();
            router.replace('/(main)');
          } else {
            router.replace('/(register)/owner');
          }
          return;
        }
      }

      // Local fallback
      await signIn({
        email,
        password,
      });
      haptic.success();
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.profileCompleted) {
        router.replace('/(main)');
      } else {
        router.replace('/(register)/owner');
      }
    } catch (err: any) {
      console.log('Sign in error:', err);
      if (err?.errors?.[0]) {
        const clerkErr = err.errors[0];
        const param = clerkErr.meta?.paramName || clerkErr.code;
        const msg = clerkErr.longMessage || clerkErr.message || 'Invalid email or password.';
        if (param === 'identifier' || param === 'email_address') {
          signInForm.setFieldError('email', msg);
        } else if (param === 'password') {
          signInForm.setFieldError('password', msg);
        } else {
          setNetworkError(msg);
        }
      } else if (err instanceof AuthError && err.field) {
        signInForm.setFieldError(err.field, err.message);
      } else {
        setNetworkError(
          err?.message || 'We couldn’t reach the server. Check your connection and try again.',
        );
      }
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [signInForm, clerk, signIn, router]);

  const handleSignUp = useCallback(async () => {
    if (!signUpForm.validateAll()) {
      haptic.warning();
      return;
    }
    setSubmitting(true);
    setNetworkError(undefined);
    setVerificationError(undefined);

    const email = signUpForm.fields.email.value.trim();
    const password = signUpForm.fields.password.value;
    const fullName = signUpForm.fields.fullName.value.trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || fullName;
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      if (clerk && clerk.client) {
        const result = await clerk.client.signUp.create({
          emailAddress: email,
          password,
          firstName,
          lastName,
        });

        if (result.status === 'complete') {
          await clerk.setActive({ session: result.createdSessionId });
          await useAuthStore.getState().googleSignIn({
            email,
            fullName,
          });
          haptic.success();
          router.replace('/(register)/owner');
          return;
        } else if (result.unverifiedFields?.includes('email_address')) {
          await clerk.client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          haptic.medium();
          setPendingVerification(true);
          return;
        }
      }

      // Local fallback
      await signUp({
        fullName,
        email,
        password,
      });
      haptic.success();
      router.replace('/(register)/owner');
    } catch (err: any) {
      console.log('Sign up error:', err);
      if (err?.errors?.[0]) {
        const clerkErr = err.errors[0];
        const param = clerkErr.meta?.paramName || clerkErr.code;
        const msg = clerkErr.longMessage || clerkErr.message || 'Could not complete registration.';
        if (param === 'email_address' || param === 'identifier') {
          signUpForm.setFieldError('email', msg);
        } else if (param === 'password') {
          signUpForm.setFieldError('password', msg);
        } else {
          setNetworkError(msg);
        }
      } else if (err instanceof AuthError && err.field) {
        signUpForm.setFieldError(err.field, err.message);
      } else {
        setNetworkError(
          err?.message || 'We couldn’t reach the server. Check your connection and try again.',
        );
      }
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [signUpForm, clerk, signUp, router]);

  const handleVerifyCode = useCallback(async () => {
    if (!verificationCode.trim()) {
      setVerificationError('Please enter the 6-digit verification code.');
      haptic.warning();
      return;
    }
    if (!clerk || !clerk.client) return;
    setSubmitting(true);
    setVerificationError(undefined);
    try {
      const completeSignUp = await clerk.client.signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (completeSignUp.status === 'complete') {
        await clerk.setActive({ session: completeSignUp.createdSessionId });
        await useAuthStore.getState().googleSignIn({
          email: signUpForm.fields.email.value.trim(),
          fullName: signUpForm.fields.fullName.value.trim(),
        });
        haptic.success();
        setPendingVerification(false);
        router.replace('/(register)/owner');
      } else {
        setVerificationError('Verification incomplete. Please check your code.');
        haptic.error();
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Invalid verification code. Please try again.';
      setVerificationError(msg);
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [verificationCode, clerk, signUpForm, router]);

  const handleResendCode = useCallback(async () => {
    if (!clerk || !clerk.client) return;
    try {
      await clerk.client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      haptic.light();
      setVerificationError(undefined);
    } catch (err: any) {
      setVerificationError(err?.errors?.[0]?.message || 'Could not resend code.');
    }
  }, [clerk]);

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

      {/* Absolute Bottom Full-Width Illustration (Hidden when keyboard is active) */}
      {!keyboardVisible ? (
        <View style={styles.absoluteBottomImageWrap} pointerEvents="none">
          <Image
            source={require('@assets/no-backgrounds/fam1-removebg-preview.png')}
            style={styles.absoluteBottomImage}
            resizeMode="contain"
          />
        </View>
      ) : null}

      {/* Clerk Email Verification Modal */}
      <Modal
        visible={pendingVerification}
        animationType="fade"
        transparent
        onRequestClose={() => setPendingVerification(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="mail-open" size={28} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Check Your Email</Text>
              <Text style={styles.modalSubtitle}>
                We sent a 6-digit verification code to{' '}
                <Text style={styles.modalEmailBold}>{signUpForm.fields.email.value}</Text>
              </Text>
            </View>

            <View style={styles.modalBody}>
              <Input
                value={verificationCode}
                onChangeText={(v) => {
                  setVerificationCode(v);
                  setVerificationError(undefined);
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="6-digit verification code"
                leftIcon={<Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />}
                editable={!submitting}
              />

              {verificationError ? <ErrorMessage message={verificationError} /> : null}

              <Button
                title="Verify & Continue"
                onPress={handleVerifyCode}
                loading={submitting}
                variant="primary"
                size="lg"
                showPaw
              />

              <View style={styles.modalFooterRow}>
                <Pressable
                  onPress={handleResendCode}
                  style={styles.modalResendBtn}
                  hitSlop={8}
                >
                  <Text style={styles.modalResendText}>Resend Code</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPendingVerification(false)}
                  style={styles.modalCancelBtn}
                  hitSlop={8}
                >
                  <Text style={styles.modalCancelText}>Back</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 16,
    paddingBottom: 110,
  },
  headerBlock: {
    marginBottom: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subtitleTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
  },
  strengthLabel: {
    ...typography.captionBold,
    fontSize: 12,
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
    paddingVertical: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 38, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.15)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  modalEmailBold: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  modalBody: {
    gap: spacing.md,
  },
  modalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  modalResendBtn: {
    paddingVertical: 6,
  },
  modalResendText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 13,
  },
  modalCancelBtn: {
    paddingVertical: 6,
  },
  modalCancelText: {
    ...typography.captionMedium,
    color: colors.textMuted,
    fontSize: 13,
  },
});
