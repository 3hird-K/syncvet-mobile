import React, { useCallback, useState } from 'react';
import {
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

import { colors, radius, shadows, spacing, typography } from '@theme';
import { emailRule, required } from '@lib/validation';
import { haptic } from '@lib/haptics';
import { useForm } from '@hooks/useForm';
import { useAuthStore } from '@store/useAuthStore';
import { Avatar } from '@components/ui/Avatar';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { BackButton } from '@components/ui/BackButton';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { BackgroundDecoration } from '@components/ui/BackgroundDecoration';

const DEMO_ACCOUNTS = [
  { name: 'Neil Reyes', email: 'neil.reyes@gmail.com' },
  { name: 'Maria Santos', email: 'maria.santos@gmail.com' },
  { name: 'Jose Ramirez', email: 'jose.ramirez@gmail.com' },
] as const;

export default function GoogleAuthScreen() {
  const router = useRouter();
  const googleSignIn = useAuthStore((state) => state.googleSignIn);
  const [submitting, setSubmitting] = useState(false);
  const [useAnother, setUseAnother] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const accountForm = useForm(
    { fullName: '', email: '' },
    {
      fullName: [required('Enter your name.')],
      email: [required('Enter your email address.'), emailRule],
    },
  );

  const finish = useCallback(() => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser?.profileCompleted) {
      router.replace('/(main)');
    } else {
      router.replace('/(register)/owner');
    }
  }, [router]);

  const handleSelect = useCallback(
    async (name: string, email: string) => {
      setSubmitting(true);
      setError(undefined);
      haptic.medium();
      try {
        const state = useAuthStore.getState();
        await state.googleSignIn({ email, fullName: name });
        haptic.success();
        finish();
      } catch {
        setError('We couldn’t sign you in with Google. Please try again.');
        haptic.error();
        setSubmitting(false);
      }
    },
    [finish],
  );

  const handleAnother = useCallback(async () => {
    if (!accountForm.validateAll()) {
      haptic.warning();
      return;
    }
    await handleSelect(
      accountForm.fields.fullName.value,
      accountForm.fields.email.value,
    );
  }, [accountForm, handleSelect]);

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
            <Ionicons name="logo-google" size={30} color="#4285F4" />
          </View>

          <Text style={styles.title}>Choose an account</Text>
          <Text style={styles.subtitle}>to continue to SyncVet</Text>

          <View style={styles.accountList}>
            {DEMO_ACCOUNTS.map((account) => (
              <AccountRow
                key={account.email}
                name={account.name}
                email={account.email}
                onPress={() => handleSelect(account.name, account.email)}
                disabled={submitting}
              />
            ))}

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => {
                haptic.light();
                setUseAnother((v) => !v);
              }}
              style={({ pressed }) => [styles.anotherRow, pressed && styles.pressed]}
            >
              <View style={styles.anotherIcon}>
                <Ionicons name="person-add-outline" size={20} color={colors.primaryDark} />
              </View>
              <Text style={styles.anotherLabel}>Use another account</Text>
              <Ionicons
                name={useAnother ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          {useAnother ? (
            <View style={styles.form}>
              <Input
                label="Full name"
                value={accountForm.fields.fullName.value}
                onChangeText={(v) => accountForm.setValue('fullName', v)}
                onBlur={() => accountForm.validateField('fullName')}
                error={accountForm.fields.fullName.error}
                placeholder="Your name"
                editable={!submitting}
              />
              <Input
                label="Google email"
                value={accountForm.fields.email.value}
                onChangeText={(v) => accountForm.setValue('email', v)}
                onBlur={() => accountForm.validateField('email')}
                error={accountForm.fields.email.error}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="you@gmail.com"
                editable={!submitting}
              />
              <Button
                title="Continue"
                size="md"
                onPress={handleAnother}
                loading={submitting}
              />
            </View>
          ) : null}

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
    </SafeAreaView>
  );
}

function AccountRow({
  name,
  email,
  onPress,
  disabled,
}: {
  name: string;
  email: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sign in as ${name}, ${email}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.accountRow, pressed && styles.accountRowPressed]}
    >
      <Avatar name={name} size={40} />
      <View style={styles.accountText}>
        <Text style={styles.accountName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.accountEmail} numberOfLines={1}>
          {email}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
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
  },
  googleBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
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
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  accountList: {
    marginTop: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  accountRowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  accountText: {
    flex: 1,
  },
  accountName: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  accountEmail: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  anotherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  anotherIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anotherLabel: {
    ...typography.captionMedium,
    color: colors.primaryDark,
    flex: 1,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  form: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  errorWrap: {
    marginTop: spacing.lg,
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
