import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { Logo } from '@components/ui/Logo';
import { PhotoIllustration } from '@components/ui/PhotoIllustration';
import { FloatingIllustration } from '@components/ui/FloatingIllustration';
import { SocialAuthButton } from '@components/ui/SocialAuthButton';
import { BackgroundDecoration } from '@components/ui/BackgroundDecoration';
import { Button } from '@components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [connecting, setConnecting] = useState(false);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.92);
  const headlineY = useSharedValue(24);
  const headlineOpacity = useSharedValue(0);
  const copyOpacity = useSharedValue(0);
  const ctaY = useSharedValue(24);
  const ctaOpacity = useSharedValue(0);

  useEffect(() => {
    const dur = reducedMotion ? 0 : 460;
    logoOpacity.value = withDelay(reducedMotion ? 0 : 60, withTiming(1, { duration: dur }));
    logoScale.value = withDelay(
      reducedMotion ? 0 : 60,
      withTiming(1, { duration: dur, easing: Easing.out(Easing.back(1.4)) }),
    );
    headlineY.value = withDelay(reducedMotion ? 0 : 140, withTiming(0, { duration: dur, easing: Easing.out(Easing.cubic) }));
    headlineOpacity.value = withDelay(reducedMotion ? 0 : 140, withTiming(1, { duration: dur }));
    copyOpacity.value = withDelay(reducedMotion ? 0 : 280, withTiming(1, { duration: dur }));
    ctaY.value = withDelay(reducedMotion ? 0 : 420, withTiming(0, { duration: dur, easing: Easing.out(Easing.cubic) }));
    ctaOpacity.value = withDelay(reducedMotion ? 0 : 420, withTiming(1, { duration: dur }));
  }, [logoOpacity, logoScale, headlineY, headlineOpacity, copyOpacity, ctaY, ctaOpacity, reducedMotion]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineY.value }],
  }));

  const copyStyle = useAnimatedStyle(() => ({ opacity: copyOpacity.value }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }));

  const handleGoogle = async () => {
    haptic.medium();
    setConnecting(true);
    // The account chooser simulates the Google consent step.
    router.push('/(auth)/google');
  };

  return (
    <View style={styles.container}>
      <BackgroundDecoration subtle />

      <Animated.View style={[styles.header, logoStyle]}>
        <Logo size={44} wordmarkSize={22} />
      </Animated.View>

      <View style={styles.hero}>
        <FloatingIllustration>
          <PhotoIllustration source={require('@assets/image.png')} size={250} />
        </FloatingIllustration>
      </View>

      <Animated.View style={[styles.copy, headlineStyle]}>
        <Text style={styles.headline}>Better care for your best friend.</Text>
      </Animated.View>

      <Animated.View style={[styles.subcopy, copyStyle]}>
        <Text style={styles.body}>
          Access veterinary services from your City Veterinary Office, right
          from your phone.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.ctaWrap, ctaStyle]}>
        <SocialAuthButton
          onPress={handleGoogle}
          loading={connecting}
        />
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerLabel}>or</Text>
          <View style={styles.divider} />
        </View>
        <Button
          title="Use email & password"
          variant="ghost"
          size="md"
          onPress={() => {
            haptic.light();
            router.push('/(auth)');
          }}
        />
        <Text style={styles.footnote}>
          By continuing, you agree to our{' '}
          <Text style={styles.link}>Terms</Text> and{' '}
          <Text style={styles.link}>Privacy Policy</Text>.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.huge,
  },
  header: {
    alignItems: 'flex-start',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  copy: {
    alignItems: 'center',
  },
  headline: {
    ...typography.heading1,
    textAlign: 'center',
    color: colors.textPrimary,
    maxWidth: 320,
  },
  subcopy: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 330,
  },
  ctaWrap: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  footnote: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
  },
});
