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
  footer?: ReactNode;
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
  footer,
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
      opacity: interpolate(scrollX.value, inputRange, [0.15, 1, 0.15], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.55, 1, 0.55], Extrapolation.CLAMP),
        },
        {
          translateY: interpolate(scrollX.value, inputRange, [44, 0, 44], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    if (!animated || !scrollX) return {};
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.76, 1, 0.76], Extrapolation.CLAMP),
        },
        {
          translateY: interpolate(scrollX.value, inputRange, [32, 0, 32], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const badgeAnimatedStyle = useAnimatedStyle(() => {
    if (!animated || !scrollX) return {};
    const rotation = interpolate(scrollX.value, inputRange, [-20, 0, 20], Extrapolation.CLAMP);
    return {
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP),
        },
        {
          rotate: `${rotation}deg`,
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
          scale: interpolate(scrollX.value, inputRange, [0.84, 1, 0.84], Extrapolation.CLAMP),
        },
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
      <Animated.View style={[styles.cardSheet, cardAnimatedStyle, shadows.lg]}>
        {/* Floating Center Badge Bubble */}
        <Animated.View
          style={[
            styles.floatingBadge,
            { backgroundColor: badgeColor },
            badgeAnimatedStyle,
            shadows.md,
          ]}
        >
          <Ionicons name="paw" size={24} color={colors.white} />
        </Animated.View>

        <Animated.View style={[styles.textWrap, contentStyle]}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {footer ? <View style={styles.footerContainer}>{footer}</View> : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  topSection: {
    flex: 1.35,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    overflow: 'visible',
    zIndex: 1,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: -32,
    zIndex: 1,
  },
  cardSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
    minHeight: 220,
    zIndex: 10,
    shadowColor: '#071D19',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 16,
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
    shadowColor: '#09231F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 8,
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
  footerContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
});

