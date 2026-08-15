import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useAuth, useUser } from '@clerk/expo';

import { colors, radius, shadows, typography } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { PhotoIllustration } from '@components/ui/PhotoIllustration';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';
import { updateClerkUnsafeMetadata } from '@lib/clerkMetadata';

const SPLASH_DURATION = 1800;

export default function SplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const googleSignIn = useAuthStore((state) => state.googleSignIn);

  const heroScale = useSharedValue(0.7);
  const heroOpacity = useSharedValue(0);
  const heroY = useSharedValue(20);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(16);
  const progress = useSharedValue(0);
  const done = useRef(false);
  const clerkSynced = useRef(false);

  // Sync Clerk profile once if active session exists
  useEffect(() => {
    if (isSignedIn && clerkUser && !user && !clerkSynced.current) {
      clerkSynced.current = true;
      const metadata = clerkUser.unsafeMetadata || {};
      const mobileNumber = (metadata.mobileNumber as string) || '';
      const address = (metadata.address as string) || '';
      const profileCompleted = Boolean(metadata.profileCompleted);

      googleSignIn({
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        fullName: clerkUser.fullName || clerkUser.firstName || 'Resident',
        photoUrl: clerkUser.imageUrl,
      })
        .then(async () => {
          if (mobileNumber || address) {
            await useAuthStore.getState().saveOwnerProfile(mobileNumber, address);
          }
          if (profileCompleted) {
            await useAuthStore.getState().markRegistrationComplete();
          }
        })
        .catch(() => {});
    }
  }, [isSignedIn, clerkUser, user, googleSignIn]);

  useEffect(() => {
    if (reducedMotion) {
      heroScale.value = 1;
      heroOpacity.value = 1;
      heroY.value = 0;
      textOpacity.value = 1;
      textY.value = 0;
      progress.value = 1;
      const t = setTimeout(() => {
        if (!done.current) {
          done.current = true;
          routeToNext();
        }
      }, 600);
      return () => clearTimeout(t);
    }

    heroScale.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.back(1.4)) });
    heroOpacity.value = withTiming(1, { duration: 550 });
    heroY.value = withTiming(0, { duration: 750, easing: Easing.out(Easing.cubic) });
    textOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    textY.value = withDelay(300, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    progress.value = withTiming(1, { duration: SPLASH_DURATION - 200, easing: Easing.inOut(Easing.cubic) });

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
      const metadata = clerkUser?.unsafeMetadata;
      const clerkPets = Array.isArray(metadata?.pets) ? (metadata?.pets as any[]) : [];
      const cachedPets = useDataStore.getState().pets;

      const hasPets = clerkPets.length > 0 || cachedPets.length > 0;
      const hasCompletedProfile = Boolean(
        (currentUser?.profileCompleted || metadata?.profileCompleted) &&
        (currentUser?.mobileNumber || metadata?.mobileNumber) &&
        (currentUser?.address || metadata?.address) &&
        hasPets
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

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ scale: heroScale.value }, { translateY: heroY.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      {/* Clean Ambient Floating Pastel Bubbles */}
      <AnimatedBubbleBackground variant="splash" />

      <View style={styles.centerContent}>
        {/* Main Highlight Hero Illustration (fam2-removebg-preview.png) */}
        <Animated.View style={[styles.heroWrap, heroStyle]}>
          <Image
            source={require('@assets/no-backgrounds/fam2-removebg-preview.png')}
            style={[styles.heroHighlightImage, { width: Math.min(width * 0.94, 420) }]}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="SyncVet Community - Doctors, Families, and Pets"
          />
        </Animated.View>

        {/* Branding & Subtitle Tag */}
        <Animated.View style={[styles.textWrap, textStyle]}>
          <Image
            source={require('@assets/loadingscreen/syncvet.png')}
            style={[styles.wordmarkImage, { width: Math.min(width * 0.88, 360) }]}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="SyncVet Wordmark"
          />
          <Text style={styles.tagline}>Your pet’s care, connected to your city.</Text>

          {/* Integrated 90% Width Loading Progress Bar */}
          <View style={styles.progressBlock}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressStyle]} />
            </View>
            <Text style={styles.loadingText}>Preparing your care experience...</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F5F2',
    paddingHorizontal: 20,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 440,
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  heroHighlightImage: {
    height: 230,
    maxHeight: 270,
  },
  textWrap: {
    alignItems: 'center',
    width: '100%',
  },
  wordmarkImage: {
    height: 125,
    maxHeight: 145,
    marginVertical: 6,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  progressBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 28,
    gap: 10,
  },
  progressTrack: {
    width: '90%',
    maxWidth: 360,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 168, 150, 0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  loadingText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
