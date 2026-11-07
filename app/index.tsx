import React, { useEffect, useRef } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/expo';

import { colors, radius, shadows, typography } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { isRestrictedStaffRole } from '@services/auth/types';

const SPLASH_DURATION = 1600;

export default function SplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const googleSignIn = useAuthStore((state) => state.googleSignIn);

  const emblemScale = useSharedValue(0.75);
  const emblemOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(14);
  const progress = useSharedValue(0);
  const done = useRef(false);
  const clerkSynced = useRef(false);

  // Sync Clerk profile once if active session exists
  useEffect(() => {
    if (isSignedIn && clerkUser && !user && !clerkSynced.current) {
      clerkSynced.current = true;

      googleSignIn({
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        fullName: clerkUser.fullName || clerkUser.firstName || 'Resident',
        photoUrl: clerkUser.imageUrl,
      })
        .then(async () => {
          await useAuthStore.getState().syncUserFromClerk(clerkUser);
        })
        .catch(() => {});
    }
  }, [isSignedIn, clerkUser, user, googleSignIn]);

  useEffect(() => {
    if (reducedMotion) {
      emblemScale.value = 1;
      emblemOpacity.value = 1;
      textOpacity.value = 1;
      textY.value = 0;
      progress.value = 1;
      const t = setTimeout(() => {
        if (!done.current) {
          done.current = true;
          routeToNext();
        }
      }, 500);
      return () => clearTimeout(t);
    }

    emblemScale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.back(1.3)),
    });
    emblemOpacity.value = withTiming(1, { duration: 500 });
    textOpacity.value = withDelay(250, withTiming(1, { duration: 500 }));
    textY.value = withDelay(250, withTiming(0, { duration: 550, easing: Easing.out(Easing.cubic) }));
    progress.value = withTiming(1, {
      duration: SPLASH_DURATION - 200,
      easing: Easing.inOut(Easing.cubic),
    });

    const t = setTimeout(() => {
      if (!done.current) {
        done.current = true;
        routeToNext();
      }
    }, SPLASH_DURATION);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeToNext = () => {
    const completed = useOnboardingStore.getState().completed;
    const { status, user: currentUser } = useAuthStore.getState();
    const isAuth = (status === 'authenticated' && !!currentUser) || Boolean(isSignedIn);

    if (isAuth) {
      if (isRestrictedStaffRole(currentUser?.role)) {
        router.replace('/unauthorized-role');
        return;
      }

      const hasCompletedProfile = Boolean(
        currentUser?.profileCompleted &&
        currentUser?.mobileNumber &&
        currentUser?.address
      );

      if (hasCompletedProfile) {
        router.replace('/(main)');
      } else {
        router.replace('/(register)/owner');
      }
    } else if (completed) {
      router.replace({ pathname: '/onboarding', params: { slide: '3' } });
    } else {
      router.replace('/onboarding');
    }
  };

  const emblemAnimatedStyle = useAnimatedStyle(() => ({
    opacity: emblemOpacity.value,
    transform: [{ scale: emblemScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Decorative Ambient Soft Background Circles */}
      <View style={[styles.ambientCircle, styles.ambientCircleLarge]} />
      <View style={[styles.ambientCircle, styles.ambientCircleSmall]} />

      <View style={styles.contentWrap}>
        {/* App Hero Emblem */}
        <Animated.View style={[styles.emblemWrap, emblemAnimatedStyle]}>
          <View style={styles.emblemGlow}>
            <Image
              source={require('@assets/icon.png')}
              style={styles.emblemImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Brand Wordmark & Official City Pill */}
        <Animated.View style={[styles.brandWrap, textAnimatedStyle]}>
          <Text style={styles.brandTitle}>
            Sync<Text style={styles.brandTitleAccent}>Vet</Text>
          </Text>

          <View style={styles.cvoBadge}>
            <Ionicons name="shield-checkmark" size={13} color={colors.white} />
            <Text style={styles.cvoBadgeText}>CVO CAGAYAN DE ORO</Text>
          </View>

          <Text style={styles.tagline}>
            Official Digital Pet Health Platform
          </Text>

          {/* Minimalist Progress Track */}
          <View style={styles.progressBlock}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
            </View>
            <Text style={styles.loadingText}>Connecting to municipal services...</Text>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Municipal Seal Text */}
      <View style={styles.footerWrap}>
        <Text style={styles.footerText}>
          City Veterinary Office · Republic of the Philippines
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  /* Decorative Ambient Circles for Subtle Depth */
  ambientCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  ambientCircleLarge: {
    width: 380,
    height: 380,
    top: -60,
    right: -100,
  },
  ambientCircleSmall: {
    width: 260,
    height: 260,
    bottom: -40,
    left: -80,
  },

  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 360,
  },

  /* Emblem */
  emblemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emblemGlow: {
    width: 104,
    height: 104,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  emblemImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },

  /* Brand Typography */
  brandWrap: {
    alignItems: 'center',
    width: '100%',
  },
  brandTitle: {
    fontFamily: typography.font.extrabold,
    fontSize: 36,
    color: colors.white,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  brandTitleAccent: {
    color: '#A5F3E3',
  },
  cvoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
    marginTop: 10,
    marginBottom: 12,
  },
  cvoBadgeText: {
    fontFamily: typography.font.bold,
    fontSize: 11,
    color: colors.white,
    letterSpacing: 0.8,
  },
  tagline: {
    fontFamily: typography.font.medium,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
    lineHeight: 20,
  },

  /* Progress Track */
  progressBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 36,
    gap: 10,
  },
  progressTrack: {
    width: 180,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  loadingText: {
    fontFamily: typography.font.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 0.3,
  },

  /* Footer Municipal Text */
  footerWrap: {
    position: 'absolute',
    bottom: 28,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: typography.font.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

