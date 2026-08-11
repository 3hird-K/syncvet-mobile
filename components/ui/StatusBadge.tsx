import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@theme';
import type { AppointmentStatus } from '@services/data';

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'Pending', color: colors.warningDark, bg: colors.warningLight },
  confirmed: { label: 'Confirmed', color: colors.info, bg: colors.infoLight },
  completed: { label: 'Completed', color: colors.successDark, bg: colors.successLight },
  cancelled: { label: 'Cancelled', color: colors.textMuted, bg: colors.surfaceMuted },
};

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...typography.smallBold,
  },
});
