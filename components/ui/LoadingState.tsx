import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, typography } from '@theme';

interface LoadingStateProps {
  label?: string;
  fullScreen?: boolean;
}

export function LoadingState({ label, fullScreen = true }: LoadingStateProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => {
      progress.value = 0;
    };
  }, [progress, reducedMotion]);

  const spin = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${progress.value * 360}deg` }],
    };
  });

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
    >
      <Animated.View style={[styles.spinnerRing, spin]}>
        <View style={styles.spinnerDot} />
      </Animated.View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fullScreen: {
    flex: 1,
  },
  spinnerRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.primaryLight,
    borderTopColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 16,
    textAlign: 'center',
  },
});
