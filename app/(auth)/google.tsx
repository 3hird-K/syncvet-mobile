import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useOAuth } from '@clerk/expo';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { Button } from '@components/ui/Button';
import { BackButton } from '@components/ui/BackButton';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { BackgroundDecoration } from '@components/ui/BackgroundDecoration';
import { PawLoadingOverlay } from '@components/ui/PawLoading';

export default function GoogleAuthScreen() {
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Warm up browser
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      haptic.medium();
      setSubmitting(true);
      setError(undefined);

      const redirectUrl = Linking.createURL('/(auth)', { scheme: 'syncvet' });
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
        const clerkPets = Array.isArray(metadata?.pets) ? (metadata?.pets as any[]) : [];
        const hasCompletedProfile = Boolean(
          metadata?.profileCompleted &&
          metadata?.mobileNumber &&
          metadata?.address &&
          clerkPets.length > 0
        );

        if (hasCompletedProfile) {
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
        setSubmitting(false);
      }
    } catch (err: any) {
      console.log('Clerk Google OAuth error:', err);
      setError(err?.errors?.[0]?.longMessage || err?.message || 'We couldn’t sign you in with Google. Please try again.');
      haptic.error();
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  }, [startOAuthFlow, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <BackgroundDecoration subtle />

        <View style={styles.headerRow}>
          <BackButton />
        </View>

        <View style={styles.content}>
          <View style={styles.googleBadge}>
            <Ionicons name="logo-google" size={32} color="#4285F4" />
          </View>

          <Text style={styles.title}>Google Sign-In</Text>
          <Text style={styles.subtitle}>
            Sign in with your verified Google Account to access the City Veterinary portal.
          </Text>

          <View style={styles.actionCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
              disabled={submitting}
              onPress={handleGoogleSignIn}
              style={({ pressed }) => [
                styles.googleBtn,
                shadows.sm,
                pressed && styles.googleBtnPressed,
                submitting && styles.googleBtnDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorWrap}>
              <ErrorMessage message={error} />
            </View>
          ) : null}
        </View>

        <Text style={styles.terms}>
          By continuing, you agree to SyncVet’s{' '}
          <Text style={styles.link}>Terms of Service</Text> and{' '}
          <Text style={styles.link}>Privacy Policy</Text>.
        </Text>
      </KeyboardAvoidingView>

      <PawLoadingOverlay visible={submitting} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  actionCard: {
    marginTop: spacing.xxl,
    width: '100%',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.12)',
  },
  googleBtnPressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.985 }],
  },
  googleBtnDisabled: {
    opacity: 0.7,
  },
  googleBtnText: {
    ...typography.button,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  errorWrap: {
    marginTop: spacing.lg,
    width: '100%',
  },
  terms: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
  },
});
