import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { getService } from '@lib/services';
import { formatWeekdayDate } from '@lib/format';
import type { Appointment } from '@services/data';
import { StatusBadge } from './StatusBadge';

interface AppointmentCardProps {
  appointment: Appointment;
  onPress?: () => void;
  showFooterAction?: boolean;
}

export function AppointmentCard({
  appointment,
  onPress,
  showFooterAction = true,
}: AppointmentCardProps) {
  const service = getService(appointment.serviceId);
  const formattedDate = formatWeekdayDate(appointment.date);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadows.sm,
        pressed && styles.pressed,
      ]}
    >
      {/* 1. Top Header Row: Service Badge on Left & Status Badge on Right */}
      <View style={styles.topRow}>
        <View style={styles.servicePill}>
          <Ionicons
            name={service?.icon ?? 'medkit-outline'}
            size={13}
            color={colors.primaryDark}
          />
          <Text style={styles.servicePillText} numberOfLines={1}>
            {service?.name ?? 'Veterinary Service'}
          </Text>
        </View>

        <StatusBadge status={appointment.status} />
      </View>

      {/* 2. Main Pet Identity & Clinic Location */}
      <View style={styles.petIdentityRow}>
        <View style={styles.petIconWrap}>
          <Ionicons name="paw" size={18} color={colors.primary} />
        </View>

        <View style={styles.petTextCol}>
          <Text style={styles.petName} numberOfLines={1}>
            {appointment.petName}
          </Text>
          <View style={styles.clinicRow}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.clinicText} numberOfLines={1}>
              {appointment.location || 'City Veterinary Office · Main Clinic'}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Schedule Ribbon: Full-Width Date & Time Box */}
      <View style={styles.scheduleBox}>
        <View style={styles.scheduleItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={styles.scheduleDateText}>{formattedDate}</Text>
        </View>

        <View style={styles.scheduleDivider} />

        <View style={styles.scheduleItem}>
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text style={styles.scheduleTimeText}>{appointment.timeSlot}</Text>
        </View>
      </View>

      {/* 4. Bottom Footer Action (Optional) */}
      {showFooterAction ? (
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>View Appointment Details</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.07)',
    gap: 12,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  servicePillText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 11.5,
    flexShrink: 1,
  },
  petIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  petIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 168, 150, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petTextCol: {
    flex: 1,
    gap: 2,
  },
  petName: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clinicText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  scheduleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    borderRadius: radius.lg,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleDateText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  scheduleDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(7, 30, 38, 0.10)',
  },
  scheduleTimeText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(7, 30, 38, 0.05)',
  },
  footerText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
  },
});
