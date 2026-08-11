import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useReducedMotion,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

import { colors, radius, spacing, typography } from '@theme';

interface SuccessMessageProps {
  title: string;
  message?: string;
}

export function SuccessMessage({ title, message }: SuccessMessageProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      check.value = 1;
      return;
    }
    scale.value = withSpring(1, { damping: 12, stiffness: 160 });
    check.value = withDelay(
      180,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
  }, [scale, check, reducedMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: withTiming(check.value, { duration: 120 }),
    transform: [{ scale: check.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={styles.container}
      accessibilityRole="summary"
    >
      <Animated.View style={[styles.iconWrap, ringStyle]}>
        <Animated.View style={checkStyle}>
          <Text style={styles.check}>✓</Text>
        </Animated.View>
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successLight,
    borderWidth: 2,
    borderColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  check: {
    fontSize: 34,
    color: colors.success,
    fontWeight: '700',
  },
  title: {
    ...typography.heading3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
