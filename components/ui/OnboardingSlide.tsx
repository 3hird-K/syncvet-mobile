import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
} from 'react-native-reanimated';
import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { colors, typography } from '@theme';

interface OnboardingSlideProps {
  illustration: ReactNode;
  title: string;
  description: string;
  subtitle?: string;
  /** When provided, the slide animates in sync with horizontal scroll. */
  scrollX?: SharedValue<number>;
  index?: number;
}

export function OnboardingSlide({
  illustration,
  title,
  description,
  subtitle,
  scrollX,
  index = 0,
}: OnboardingSlideProps) {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const animated = Boolean(scrollX) && !reducedMotion;

  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const illustrationStyle = useAnimatedStyle(() => {
    if (!animated || !scrollX) return {};
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    if (!animated || !scrollX) return {};
    return {
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollX.value, inputRange, [16, 0, -16], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.illustrationWrap, illustrationStyle]}>
        {illustration}
      </Animated.View>
      <Animated.View style={[styles.textWrap, textStyle]}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  textWrap: {
    alignItems: 'center',
  },
  subtitle: {
    ...typography.captionBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
});
