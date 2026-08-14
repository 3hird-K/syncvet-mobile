import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { getService } from '@lib/services';
import { formatWeekdayDate } from '@lib/format';
import { useDataStore } from '@store/useDataStore';
import type { Appointment } from '@services/data';
import { PopoutPetAvatar } from './PopoutPetAvatar';
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

  // Look up pet from data store for real avatar and species
  const pets = useDataStore((state) => state.pets);
  const pet = pets.find(
    (p) =>
      p.id === appointment.petId ||
      p.name.toLowerCase() === appointment.petName.toLowerCase(),
  );

  const species = pet?.species || 'dog';
  const isDog = species === 'dog';
  const speciesLabel = isDog ? 'Canine' : 'Feline';
  const breedText = pet?.breed ? `${speciesLabel} · ${pet.breed}` : speciesLabel;

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
      {/* 1. Header: Service Type Pill & Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.servicePill}>
          <Ionicons
            name={service?.icon ?? 'medkit-outline'}
            size={13}
            color={colors.primary}
          />
          <Text style={styles.servicePillText} numberOfLines={1}>
            {service?.name ?? 'Veterinary Service'}
          </Text>
        </View>

        <StatusBadge status={appointment.status} />
      </View>

      {/* 2. Pet Identity Row with 3D Avatar */}
      <View style={styles.petIdentityRow}>
        <View style={styles.avatarWrap}>
          {pet ? (
            <PopoutPetAvatar
              avatarId={pet.avatarId}
              species={pet.species}
              photoUrl={pet.photoUrl}
              size={46}
              scale={1.3}
            />
          ) : (
            <View
              style={[
                styles.fallbackAvatar,
                { backgroundColor: isDog ? 'rgba(0, 168, 150, 0.12)' : 'rgba(219, 39, 119, 0.12)' },
              ]}
            >
              <Ionicons
                name="paw"
                size={22}
                color={isDog ? colors.primary : '#DB2777'}
              />
            </View>
          )}
        </View>

        <View style={styles.petTextCol}>
          <Text style={styles.petName} numberOfLines={1}>
            {appointment.petName}
          </Text>
          <Text style={styles.petBreedText} numberOfLines={1}>
            {breedText}
          </Text>
          <View style={styles.clinicRow}>
            <Ionicons name="location-sharp" size={11} color={colors.textMuted} />
            <Text style={styles.clinicText} numberOfLines={1}>
              {appointment.location || 'City Veterinary Office'}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Modern Schedule Box */}
      <View style={styles.scheduleBox}>
        <View style={styles.scheduleItem}>
          <Ionicons name="calendar" size={14} color={colors.primary} />
          <Text style={styles.scheduleDateText}>{formattedDate}</Text>
        </View>

        <View style={styles.scheduleDivider} />

        <View style={styles.scheduleItem}>
          <Ionicons name="time" size={14} color={colors.primary} />
          <Text style={styles.scheduleTimeText}>{appointment.timeSlot}</Text>
        </View>
      </View>

      {/* 4. Bottom Clinical Slip Action */}
      {showFooterAction ? (
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>View Appointment Details</Text>
          <View style={styles.chevronCircle}>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </View>
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
    borderColor: 'rgba(7, 30, 38, 0.08)',
    gap: 12,
  },
  pressed: {
    backgroundColor: '#F8FAFA',
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
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  servicePillText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 11.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  petIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petTextCol: {
    flex: 1,
    gap: 1.5,
  },
  petName: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 17.5,
    fontWeight: '800',
  },
  petBreedText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    marginTop: 1,
  },
  clinicText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11.5,
    flex: 1,
  },
  scheduleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(7, 30, 38, 0.035)',
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
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(7, 30, 38, 0.05)',
  },
  footerText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  chevronCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 168, 150, 0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
