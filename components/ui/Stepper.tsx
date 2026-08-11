import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@theme';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: (value: number) => string;
}

export function Stepper({ value, onChange, min = 0, max = 30, label }: StepperProps) {
  const decrement = () => {
    if (value > min) onChange(value - 1);
  };
  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        disabled={value <= min}
        onPress={decrement}
        style={({ pressed }) => [
          styles.btn,
          (value <= min || pressed) && styles.btnDisabled,
        ]}
      >
        <Ionicons name="remove" size={20} color={value <= min ? colors.textDisabled : colors.primaryDark} />
      </Pressable>
      <View style={styles.valueWrap}>
        <Text style={styles.value}>{label(value)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase"
        disabled={value >= max}
        onPress={increment}
        style={({ pressed }) => [
          styles.btn,
          (value >= max || pressed) && styles.btnDisabled,
        ]}
      >
        <Ionicons name="add" size={20} color={value >= max ? colors.textDisabled : colors.primaryDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  valueWrap: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    ...typography.title,
    color: colors.textPrimary,
  },
});
