import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useReducedMotion,
  withSequence,
  withTiming,
  useSharedValue,
  useAnimatedStyle,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';

interface ErrorMessageProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(260)}
      style={styles.container}
      accessibilityRole="alert"
    >
      <View style={styles.iconWrap}>
        <Ionicons name="alert-circle" size={20} color={colors.error} />
      </View>
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        {onRetry ? (
          <Text
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.retry}
          >
            Try again
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#F6C9C9',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  message: {
    ...typography.caption,
    color: colors.errorDark,
  },
  retry: {
    ...typography.captionBold,
    color: colors.error,
    marginTop: spacing.xs,
    textDecorationLine: 'underline',
  },
});
