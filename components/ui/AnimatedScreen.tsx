import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@theme';

export type ScreenAnimation = 'fade' | 'zoom' | 'slide-up' | 'slide-right';

interface AnimatedScreenProps extends PropsWithChildren {
  animation?: ScreenAnimation;
  /** Disable the entrance animation entirely (e.g. when navigating back). */
  animated?: boolean;
  style?: object;
}

/**
 * Ultra-smooth, cinematic full-screen entrance animation.
 * Uses a subtle 0.95 -> 1.0 scale zoom with cubic bezier ease-out
 * for a silky smooth page turn without harsh bounces.
 */
export function AnimatedScreen({
  children,
  animation = 'zoom',
  animated = true,
  style,
}: AnimatedScreenProps) {
  const reducedMotion = useReducedMotion();
  const enabled = animated && !reducedMotion;
  const progress = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (enabled) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: 260,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
    }
  }, [enabled, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!enabled) {
      return { opacity: 1, transform: [{ scale: 1 }] };
    }

    if (animation === 'fade') {
      return {
        opacity: progress.value,
      };
    }

    if (animation === 'slide-up') {
      const translateY = interpolate(progress.value, [0, 1], [24, 0], Extrapolation.CLAMP);
      return {
        opacity: progress.value,
        transform: [{ translateY }],
      };
    }

    if (animation === 'slide-right') {
      const translateX = interpolate(progress.value, [0, 1], [30, 0], Extrapolation.CLAMP);
      return {
        opacity: progress.value,
        transform: [{ translateX }],
      };
    }

    // Default 'zoom': Silky smooth soft scale from 0.95 to 1.0 + fade
    const scale = interpolate(progress.value, [0, 1], [0.95, 1], Extrapolation.CLAMP);
    return {
      opacity: progress.value,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
