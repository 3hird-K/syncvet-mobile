import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radius, spacing, typography } from '@theme';

export interface ChoiceOption<T extends string> {
  label: string;
  value: T;
}

interface ChoiceChipsProps<T extends string> {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Row of selectable pill options with a subtle scale-on-press. */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
}: ChoiceChipsProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return <Chip key={option.value} label={option.label} active={active} onPress={() => onChange(option.value)} />;
      })}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPressIn={() => {
        scale.value = withSpring(reducedMotion ? 1 : 0.96, { damping: 16, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 300 });
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}
    >
      <Animated.View style={scaleStyle}>
        <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipPressed: {
    opacity: 0.8,
  },
  label: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.primaryDark,
  },
});
