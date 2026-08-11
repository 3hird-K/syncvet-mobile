import React from 'react';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInRight,
  useReducedMotion,
} from 'react-native-reanimated';

import { colors } from '@theme';

export type ScreenAnimation = 'fade' | 'slide-up' | 'slide-right';

interface AnimatedScreenProps extends PropsWithChildren {
  animation?: ScreenAnimation;
  /** Disable the entrance animation entirely (e.g. when navigating back). */
  animated?: boolean;
  style?: object;
}

const ENTRANCE_MAP = {
  fade: FadeIn,
  'slide-up': SlideInDown,
  'slide-right': SlideInRight,
} as const;

type EntranceKey = keyof typeof ENTRANCE_MAP;
type EntranceBuilder = (typeof ENTRANCE_MAP)[EntranceKey];

/**
 * Standard full-screen entrance animation used across every SyncVet screen
 * so transitions feel consistent. Respects reduced-motion preferences.
 */
export function AnimatedScreen({
  children,
  animation = 'fade',
  animated = true,
  style,
}: AnimatedScreenProps) {
  const reducedMotion = useReducedMotion();
  const enabled = animated && !reducedMotion;

  if (!enabled) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  const builder = ENTRANCE_MAP[animation] as EntranceBuilder;
  const entering = animation === 'slide-up'
    ? SlideInDown.duration(320).springify().damping(18)
    : builder.duration(280);

  return (
    <Animated.View
      entering={entering}
      exiting={FadeOut.duration(200)}
      style={[styles.container, style]}
    >
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
