import React, { useEffect, useRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { Button } from '@components/ui/Button';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';

export default function RegistrationSuccessScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const markRegistrationComplete = useAuthStore((state) => state.markRegistrationComplete);
  const pets = useDataStore((state) => state.pets);
  const done = useRef(false);
  const reducedMotion = useReducedMotion();

  const latestPet = pets.length > 0 ? pets[pets.length - 1] : null;

  // Pulse animation for the central paw badge
  const pulseScale = useSharedValue(1);
  const glowScale = useSharedValue(1);
  const autoProgress = useSharedValue(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (!done.current) {
      done.current = true;
      markRegistrationComplete().catch(() => {});
      haptic.success();

      // Auto-load main page after 3.2s
      timer = setTimeout(() => {
        router.replace('/(main)');
      }, 3200);
    }

    if (!reducedMotion) {
      autoProgress.value = withTiming(1, {
        duration: 3000,
        easing: Easing.linear,
      });

      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    } else {
      autoProgress.value = 1;
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [markRegistrationComplete, pulseScale, glowScale, autoProgress, reducedMotion, router]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: 0.45,
  }));

  const autoProgressStyle = useAnimatedStyle(() => ({
    width: `${autoProgress.value * 100}%`,
  }));

  const goHome = () => {
    haptic.medium();
    router.replace('/(main)');
  };

  const firstName = user?.fullName ? user.fullName.split(/\s+/)[0] : 'there';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Floating Animated Bubbles & Paws */}
      <AnimatedBubbleBackground />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.contentWrap}>
          {/* Central Hero Paw Badge */}
          <View style={styles.badgeSection}>
            <Animated.View style={[styles.glowRing, glowStyle]} />
            <Animated.View style={[styles.pawBadgeOuter, pulseStyle, shadows.md]}>
              <View style={styles.pawBadgeInner}>
                <Ionicons name="paw" size={44} color={colors.white} />
              </View>
              <View style={styles.sparkleBadge}>
                <Ionicons name="sparkles" size={14} color="#D97706" />
              </View>
            </Animated.View>
          </View>

          {/* Heading & Greeting */}
          <Animated.View entering={FadeInUp.duration(320).delay(100)} style={styles.headerBlock}>
            <Text style={styles.title}>You’re All Set!</Text>
            <Text style={styles.subtitle}>
              Welcome to SyncVet, <Text style={styles.userName}>{firstName}</Text>! Your pet is officially registered with the City Veterinary Office.
            </Text>

            {/* Official Verification Pill */}
            <View style={styles.verificationPill}>
              <Ionicons name="shield-checkmark" size={15} color={colors.primaryDark} />
              <Text style={styles.verificationText}>City Veterinary Verified Record</Text>
            </View>
          </Animated.View>

          {/* Registered Pet Card */}
          {latestPet ? (
            <Animated.View entering={FadeInDown.duration(320).delay(200)} style={[styles.petCard, shadows.sm]}>
              <View style={styles.petCardHeader}>
                <View style={styles.petAvatarBadge}>
                  <Ionicons
                    name={latestPet.species === 'cat' ? 'paw-outline' : 'paw'}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.petDetails}>
                  <Text style={styles.petName}>{latestPet.name}</Text>
                  <Text style={styles.petBreed}>
                    {latestPet.breed} • {latestPet.species === 'dog' ? 'Dog' : 'Cat'}
                  </Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Active</Text>
                </View>
              </View>

              <View style={styles.petCardFooter}>
                <View style={styles.petTag}>
                  <Ionicons
                    name={latestPet.isVaccinated ? 'checkmark-circle' : 'time-outline'}
                    size={14}
                    color={latestPet.isVaccinated ? colors.success : colors.warning}
                  />
                  <Text style={styles.petTagText}>
                    {latestPet.isVaccinated ? 'Anti-Rabies Recorded' : 'Vaccine Scheduled'}
                  </Text>
                </View>
                <View style={styles.petTag}>
                  <Ionicons name="card-outline" size={14} color={colors.primary} />
                  <Text style={styles.petTagText}>Digital Passport Ready</Text>
                </View>
              </View>
            </Animated.View>
          ) : null}

          {/* Next Steps / Benefit Features */}
          <Animated.View entering={FadeInDown.duration(320).delay(300)} style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconBadge, { backgroundColor: '#EBF7F5' }]}>
                <Ionicons name="calendar" size={18} color={colors.primary} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Book Vet Consultations</Text>
                <Text style={styles.featureDesc}>
                  Schedule checkups, anti-rabies vaccines, and free city vet services.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconBadge, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="notifications" size={18} color="#2563EB" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Health & Vaccine Alerts</Text>
                <Text style={styles.featureDesc}>
                  Get timely reminders when your pet’s booster shots are due.
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Bottom Home CTA */}
        <Animated.View entering={FadeInDown.duration(320).delay(400)} style={styles.bottom}>
          <Button
            title="Go to Home Dashboard"
            size="lg"
            onPress={goHome}
            variant="primary"
            showPaw
          />
          <View style={styles.autoRedirectBlock}>
            <View style={styles.autoProgressTrack}>
              <Animated.View style={[styles.autoProgressFill, autoProgressStyle]} />
            </View>
            <Text style={styles.autoRedirectText}>
              Loading dashboard in a moment... 🐾
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  contentWrap: {
    alignItems: 'center',
  },
  badgeSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 20,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#C8EFE8',
  },
  pawBadgeOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
  },
  pawBadgeInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleBadge: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  title: {
    ...typography.heading1,
    fontSize: 26,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  userName: {
    color: colors.primaryDark,
    fontFamily: typography.font.bold,
  },
  verificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#EBF7F5',
    borderWidth: 1,
    borderColor: '#C3E8E1',
    marginTop: 12,
  },
  verificationText: {
    ...typography.smallBold,
    color: colors.primaryDark,
    fontSize: 12,
  },
  petCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  petCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  petAvatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petDetails: {
    flex: 1,
  },
  petName: {
    ...typography.captionBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  petBreed: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: '#DEF7EC',
  },
  activePillText: {
    ...typography.smallBold,
    fontSize: 10,
    color: '#03543F',
  },
  petCardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  petTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  petTagText: {
    ...typography.small,
    fontSize: 11,
    color: colors.textSecondary,
  },
  featuresList: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  featureDesc: {
    ...typography.small,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
    lineHeight: 16,
  },
  bottom: {
    marginTop: spacing.xl,
    gap: 12,
  },
  autoRedirectBlock: {
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  autoProgressTrack: {
    width: '70%',
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 168, 150, 0.15)',
    overflow: 'hidden',
  },
  autoProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  autoRedirectText: {
    ...typography.small,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
