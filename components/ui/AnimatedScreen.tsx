import React from 'react';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInRight,
  ZoomIn,
  useReducedMotion,
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
 * Standard full-screen entrance animation used across every SyncVet screen
 * so transitions feel smooth and consistent without unnatural bouncing.
 */
export function AnimatedScreen({
  children,
  animation = 'zoom',
  animated = true,
  style,
}: AnimatedScreenProps) {
  const reducedMotion = useReducedMotion();
  const enabled = animated && !reducedMotion;

  if (!enabled) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  let entering;
  switch (animation) {
    case 'zoom':
      entering = ZoomIn.duration(260);
      break;
    case 'slide-up':
      entering = SlideInDown.duration(260);
      break;
    case 'slide-right':
      entering = SlideInRight.duration(260);
      break;
    case 'fade':
    default:
      entering = FadeIn.duration(240);
      break;
  }

  return (
    <Animated.View
      entering={entering}
      exiting={FadeOut.duration(180)}
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
