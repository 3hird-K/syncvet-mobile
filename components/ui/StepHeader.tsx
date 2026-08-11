import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@theme';
import { ProgressIndicator } from './ProgressIndicator';

interface StepHeaderProps {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
}

export function StepHeader({ step, total, title, subtitle }: StepHeaderProps) {
  return (
    <View style={styles.container}>
      <ProgressIndicator count={total} current={step - 1} />
      <Text style={styles.stepLabel}>Step {step} of {total}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  stepLabel: {
    ...typography.smallBold,
    color: colors.primaryDark,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    ...typography.heading1,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    maxWidth: 320,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    maxWidth: 340,
  },
});
