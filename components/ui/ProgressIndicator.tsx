import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
} from 'react-native-reanimated';

import { colors } from '@theme';

interface ProgressIndicatorProps {
  count: number;
  current: number;
  activeColor?: string;
}

export function ProgressIndicator({ count, current, activeColor = colors.primary }: ProgressIndicatorProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${count}`}
      accessibilityValue={{ min: 0, max: count, now: current + 1 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} active={i === current} done={i < current} activeColor={activeColor} />
      ))}
    </View>
  );
}

function Dot({ active, done, activeColor }: { active: boolean; done: boolean; activeColor: string }) {
  const reducedMotion = useReducedMotion();

  const animStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(active ? 26 : 8, {
        damping: 16,
        stiffness: 220,
        mass: 0.8,
      }),
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        animStyle,
        active && { backgroundColor: activeColor },
        done && styles.dotDone,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  dotDone: {
    backgroundColor: colors.primaryLight,
  },
});

