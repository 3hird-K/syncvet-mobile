import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useReducedMotion,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { ReactNode } from 'react';

import { colors } from '@theme';

interface FloatingIllustrationProps {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
}

/**
 * Wraps an illustration with a gentle, constant float. Subtle by design.
 */
export function FloatingIllustration({
  children,
  amplitude = 6,
  duration = 3200,
}: FloatingIllustrationProps) {
  const reducedMotion = useReducedMotion();
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      translateY.value = 0;
      return;
    }
    translateY.value = withRepeat(
      withSequence(
        withTiming(-amplitude, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(amplitude, {
          duration: duration * 1.4,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => {
      translateY.value = 0;
    };
  }, [amplitude, duration, reducedMotion, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.wrap, animStyle]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
