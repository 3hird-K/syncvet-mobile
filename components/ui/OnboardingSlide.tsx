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
import { Ionicons } from '@expo/vector-icons';

import { colors, shadows, typography } from '@theme';
import { AnimatedBubbleBackground } from './AnimatedBubbleBackground';

interface OnboardingSlideProps {
  illustration: ReactNode;
  title: string;
  description: string;
  subtitle?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  accentBg?: string;
  badgeColor?: string;
  /** When provided, the slide animates in sync with horizontal scroll. */
  scrollX?: SharedValue<number>;
  index?: number;
}

export function OnboardingSlide({
  illustration,
  title,
  description,
  subtitle,
  iconName = 'paw',
  accentBg = '#E6F5F2',
  badgeColor = colors.primary,
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
      opacity: interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP),
        },
        {
          translateY: interpolate(scrollX.value, inputRange, [20, 0, 20], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    if (!animated || !scrollX) return {};
    return {
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollX.value, inputRange, [24, 0, -24], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: accentBg }]}>
      {/* Top Hero Section with Floating Animated Bubbles */}
      <View style={styles.topSection}>
        <AnimatedBubbleBackground />
        <Animated.View style={[styles.illustrationWrap, illustrationStyle]}>
          {illustration}
        </Animated.View>
      </View>

      {/* Bottom Sheet Card Container */}
      <View style={[styles.cardSheet, shadows.lg]}>
        {/* Floating Overlap Icon Badge */}
        <View style={[styles.floatingBadge, { backgroundColor: badgeColor }, shadows.md]}>
          <Ionicons name={iconName} size={26} color={colors.white} />
        </View>

        <Animated.View style={[styles.textWrap, contentStyle]}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </Animated.View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  topSection: {
    flex: 1.15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
    minHeight: 280,
  },
  floatingBadge: {
    position: 'absolute',
    top: -26,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  textWrap: {
    alignItems: 'center',
    width: '100%',
  },
  subtitle: {
    ...typography.captionBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 310,
  },
});

