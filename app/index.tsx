import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, shadows, typography } from '@theme';

const SPLASH_DURATION = 1800;

export default function SplashScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const iconScale = useSharedValue(0.6);
  const iconOpacity = useSharedValue(0);
  const iconY = useSharedValue(24);
  const pawOpacity = useSharedValue(0);
  const pawY = useSharedValue(18);
  const textOpacity = useSharedValue(0);
  const progress = useSharedValue(0);
  const done = useRef(false);

  useEffect(() => {
    if (reducedMotion) {
      iconScale.value = 1;
      iconOpacity.value = 1;
      iconY.value = 0;
      pawOpacity.value = 1;
      pawY.value = 0;
      textOpacity.value = 1;
      progress.value = 1;
      const t = setTimeout(() => {
        if (!done.current) {
          done.current = true;
          routeToNext();
        }
      }, 700);
      return () => clearTimeout(t);
    }

    iconScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.6)) });
    iconOpacity.value = withTiming(1, { duration: 500 });
    iconY.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) });
    pawOpacity.value = withDelay(350, withTiming(1, { duration: 500 }));
    pawY.value = withDelay(350, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    textOpacity.value = withDelay(450, withTiming(1, { duration: 500 }));
    progress.value = withTiming(1, { duration: SPLASH_DURATION - 300, easing: Easing.inOut(Easing.cubic) });

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
    // Testing phase: always show the 3-slide onboarding carousel after the
    // splash so the first-run screens can be reviewed on every launch.
    router.replace('/onboarding');
  };

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }, { translateY: iconY.value }],
  }));

  const pawStyle = useAnimatedStyle(() => ({
    opacity: pawOpacity.value,
    transform: [{ translateY: pawY.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Image
          source={require('@assets/boy-child.png')}
          style={styles.appIcon}
          resizeMode="cover"
          accessibilityRole="image"
          accessibilityLabel="SyncVet logo"
        />
      </Animated.View>

      <Animated.View style={[styles.pawWrap, pawStyle]}>
        <Text style={styles.paw}>🐾</Text>
      </Animated.View>

      <Animated.View style={[styles.textWrap, textStyle]}>
        <Text style={styles.wordmark}>
          Sync<Text style={styles.accent}>Vet</Text>
        </Text>
        <Text style={styles.tagline}>Your pet’s care, connected to your city.</Text>
      </Animated.View>

      <Animated.View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  iconWrap: {
    alignItems: 'center',
  },
  appIcon: {
    width: 96,
    height: 96,
    borderRadius: radius.xxl,
    ...shadows.md,
  },
  pawWrap: {
    marginTop: -18,
    marginBottom: 18,
  },
  paw: {
    fontSize: 26,
  },
  textWrap: {
    alignItems: 'center',
    marginTop: 6,
  },
  wordmark: {
    ...typography.heading1,
    fontSize: 34,
    color: colors.textPrimary,
  },
  accent: {
    color: colors.primary,
  },
  tagline: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 90,
    width: 96,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
