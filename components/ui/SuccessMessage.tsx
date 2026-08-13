import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  variant?: 'success' | 'error';
}

export function SuccessMessage({
  title,
  message,
  variant = 'success',
}: SuccessMessageProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(0);
  const check = useSharedValue(0);

  const isError = variant === 'error';
  const mainColor = isError ? colors.error : colors.success;
  const bgColor = isError ? colors.errorLight : colors.successLight;

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
      <Animated.View
        style={[styles.iconWrap, { backgroundColor: bgColor, borderColor: mainColor }, ringStyle]}
      >
        <Animated.View style={checkStyle}>
          <Ionicons name="paw" size={36} color={mainColor} />
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.heading3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
});
