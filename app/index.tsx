import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, shadows, typography } from '@theme';
import { PhotoIllustration } from '@components/ui/PhotoIllustration';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';

const SPLASH_DURATION = 1800;

export default function SplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const heroScale = useSharedValue(0.7);
  const heroOpacity = useSharedValue(0);
  const heroY = useSharedValue(20);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(16);
  const progress = useSharedValue(0);
  const done = useRef(false);

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
    router.replace('/onboarding');
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
        {/* Hero Photo Illustration */}
        <Animated.View style={[styles.heroWrap, heroStyle]}>
          <PhotoIllustration
            source={require('@assets/no-backgrounds/nurse-pets-removebg-preview.png')}
            size={Math.min(width * 0.74, 280)}
            accentColor={colors.primary}
          />
        </Animated.View>

        {/* Branding & Subtitle Tag */}
        <Animated.View style={[styles.textWrap, textStyle]}>
          <View style={styles.tagBadge}>
            <Text style={styles.subtitleTag}>CITY VETERINARY CARE</Text>
          </View>

          <Text style={styles.wordmark}>
            Sync<Text style={styles.accent}>Vet</Text>
          </Text>
          <Text style={styles.tagline}>Your pet’s care, connected to your city.</Text>

          {/* Integrated Loading Bar directly under tagline */}
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
    paddingHorizontal: 24,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  textWrap: {
    alignItems: 'center',
    width: '100%',
  },
  tagBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    marginBottom: 10,
  },
  subtitleTag: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  wordmark: {
    ...typography.heading1,
    fontSize: 38,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  accent: {
    color: colors.primary,
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
    maxWidth: 340,
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
