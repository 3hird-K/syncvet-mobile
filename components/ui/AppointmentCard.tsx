import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@theme';
import { getService } from '@lib/services';
import { relativeDay } from '@lib/format';
import type { Appointment } from '@services/data';
import { StatusBadge } from './StatusBadge';
import { Avatar } from './Avatar';

interface AppointmentCardProps {
  appointment: Appointment;
  onPress?: () => void;
}

export function AppointmentCard({ appointment, onPress }: AppointmentCardProps) {
  const service = getService(appointment.serviceId);
  const dayLabel = relativeDay(appointment.date);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <View style={styles.dateTile}>
          <Text style={styles.dateDay}>{dayLabel}</Text>
          <Text style={styles.dateTime}>{appointment.timeSlot}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.petName}>{appointment.petName}</Text>
          <StatusBadge status={appointment.status} />
        </View>
        <View style={styles.metaRow}>
          <Ionicons
            name={service?.icon ?? 'medkit-outline'}
            size={14}
            color={colors.primaryDark}
          />
          <Text style={styles.service}>{service?.name ?? 'Veterinary service'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.location} numberOfLines={1}>
            {appointment.location}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  left: {
    justifyContent: 'center',
  },
  dateTile: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minWidth: 76,
  },
  dateDay: {
    ...typography.captionBold,
    color: colors.primaryDark,
    textAlign: 'center',
  },
  dateTime: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  petName: {
    ...typography.title,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  service: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  location: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
});
