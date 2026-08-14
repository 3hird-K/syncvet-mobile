import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { getService } from '@lib/services';
import { formatWeekdayDate } from '@lib/format';
import { useDataStore } from '@store/useDataStore';
import type { Appointment } from '@services/data';
import { useUser } from '@clerk/expo';
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
  const { user: clerkUser } = useUser();
  const service = getService(appointment.serviceId);
  const formattedDate = formatWeekdayDate(appointment.date);

  // Look up pet from Clerk metadata and data store for real avatar and species
  const localPets = useDataStore((state) => state.pets);
  const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
  const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];
  const petPool = metaPets.length > 0 ? metaPets : localPets;

  const pet = petPool.find(
    (p: any) =>
      p.id === appointment.petId ||
      p.name?.toLowerCase().trim() === appointment.petName?.toLowerCase().trim(),
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
      {/* 1. Header: Pet Avatar + Name & Breed + Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.avatarWrap}>
          {pet ? (
            <PopoutPetAvatar
              avatarId={pet.avatarId}
              species={pet.species}
              photoUrl={pet.photoUrl}
              size={40}
              scale={1.25}
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
                size={18}
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
        </View>

        <StatusBadge status={appointment.status} />
      </View>

      {/* 2. Compact Service & Schedule Bar */}
      <View style={styles.metaBar}>
        <View style={styles.servicePill}>
          <Ionicons
            name={service?.icon ?? 'medkit-outline'}
            size={12}
            color={colors.primaryDark}
          />
          <Text style={styles.servicePillText} numberOfLines={1}>
            {service?.name ?? 'Veterinary Service'}
          </Text>
        </View>

        <View style={styles.schedulePill}>
          <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
          <Text style={styles.scheduleText} numberOfLines={1}>
            {formattedDate} · {appointment.timeSlot}
          </Text>
        </View>
      </View>

      {/* 3. Bottom Compact Action Footer */}
      {showFooterAction ? (
        <View style={styles.footerRow}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>
              {appointment.location || 'City Veterinary Office'}
            </Text>
          </View>
          <View style={styles.detailsAction}>
            <Text style={styles.footerText}>Details</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.primary} />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 8,
  },
  pressed: {
    backgroundColor: '#F8FAFA',
    transform: [{ scale: 0.995 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petTextCol: {
    flex: 1,
    gap: 1,
  },
  petName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '800',
  },
  petBreedText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(7, 30, 38, 0.025)',
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 9,
    gap: 6,
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  servicePillText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  schedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(7, 30, 38, 0.04)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  locationText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  detailsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  footerText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11,
  },
});
