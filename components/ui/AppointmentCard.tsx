import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, shadows, typography } from '@theme';
import { getService } from '@lib/services';
import { formatAppointmentTimeSlot, formatWeekdayDate, todayISO } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useDataStore } from '@store/useDataStore';
import { normalizeAppointmentStatus } from '@services/data/types';
import type { Appointment } from '@services/data';
import { PopoutPetAvatar } from './PopoutPetAvatar';
import { StatusBadge } from './StatusBadge';

interface AppointmentCardProps {
  appointment: Appointment;
  onPress?: () => void;
  onScanPress?: () => void;
  onViewTicketPress?: () => void;
  showFooterAction?: boolean;
}

export function AppointmentCard({
  appointment,
  onPress,
  onScanPress,
  onViewTicketPress,
}: AppointmentCardProps) {
  const service = getService(appointment.serviceId);
  const formattedDate = formatWeekdayDate(appointment.date);
  const today = todayISO();
  const isToday = appointment.date === today;
  const status = normalizeAppointmentStatus(appointment.status);
  const isOverdue = status === 'overdue';
  const isMissed = status === 'missed';
  const isInactive = isOverdue || isMissed;
  const isQueued = status === 'queued' || status === 'checked_in';
  const isCalled = status === 'called' || status === 'serving';
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';

  const effectiveStatus = isCalled
    ? 'called'
    : isQueued
      ? 'queued'
      : status;

  const localPets = useDataStore((state) => state.pets);
  const pet = localPets.find(
    (p: any) =>
      p.id === appointment.petId ||
      p.name?.toLowerCase().trim() === appointment.petName?.toLowerCase().trim(),
  );

  const species = pet?.species || 'dog';
  const isDog = species === 'dog';
  const speciesLabel = isDog ? 'Canine' : 'Feline';
  const breedText = pet?.breed ? `${speciesLabel} · ${pet.breed}` : speciesLabel;

  const handleScanClick = (e: any) => {
    e.stopPropagation?.();
    haptic.medium();
    onScanPress?.();
  };

  const handleTicketClick = (e: any) => {
    e.stopPropagation?.();
    haptic.light();
    onViewTicketPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.avatarCol}>
          {pet ? (
            <PopoutPetAvatar
              avatarId={pet.avatarId}
              species={pet.species}
              photoUrl={pet.photoUrl}
              size={36}
              scale={1.05}
            />
          ) : (
            <View
              style={[
                styles.fallbackAvatar,
                { backgroundColor: isDog ? colors.primaryLight : colors.errorLight },
              ]}
            >
              <Ionicons
                name="paw"
                size={16}
                color={isDog ? colors.primaryDark : colors.errorDark}
              />
            </View>
          )}
        </View>

        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.petName} numberOfLines={1}>
              {appointment.petName}
            </Text>
            <Text style={styles.breedText} numberOfLines={1}>
              {breedText}
            </Text>
          </View>

          <Text style={styles.serviceName} numberOfLines={1}>
            {service?.name ?? 'Veterinary Service'}
          </Text>

          <View style={styles.scheduleRow}>
            <Ionicons
              name="calendar-outline"
              size={11}
              color={isToday ? colors.primaryDark : colors.textMuted}
            />
            <Text style={[styles.dateText, isToday && styles.dateTextToday]} numberOfLines={1}>
              {isToday ? `Today · ${formattedDate}` : formattedDate}
            </Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.timeText} numberOfLines={1}>
              {formatAppointmentTimeSlot(appointment.timeSlot)}
            </Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={11} color={colors.textDisabled} />
            <Text style={styles.locationText} numberOfLines={1}>
              {appointment.location || 'Carmen Clinic'}
            </Text>
          </View>
        </View>

        <View style={styles.actionCol}>
          <StatusBadge status={effectiveStatus} />

          <View style={styles.actionRow}>
            {isCalled ? (
              <Pressable
                onPress={handleTicketClick}
                style={[styles.actionBtn, styles.calledBtn]}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Pet is called! Tap to view details"
              >
                <MaterialCommunityIcons name="bell-ring" size={15} color={colors.white} />
              </Pressable>
            ) : isQueued ? (
              <Pressable
                onPress={handleTicketClick}
                style={styles.ticketBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="View Queue Ticket"
              >
                <MaterialCommunityIcons
                  name="ticket-outline"
                  size={14}
                  color={colors.primaryDark}
                />
                <Text style={styles.ticketNumText} numberOfLines={1}>
                  {appointment.queueTicket?.ticketNumber || 'Q-001'}
                </Text>
              </Pressable>
            ) : !isToday || isInactive || isCompleted || isCancelled || !onScanPress ? null : (
              <Pressable
                onPress={handleScanClick}
                style={({ pressed }) => [styles.actionBtn, styles.scanBtn, pressed && styles.pressedBtn]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Scan Clinic QR Code"
              >
                <MaterialCommunityIcons name="qrcode-scan" size={15} color={colors.white} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...shadows.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCol: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  petName: {
    ...typography.title,
    fontSize: 14,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  breedText: {
    ...typography.caption,
    fontSize: 10.5,
    color: colors.textMuted,
    flexShrink: 1,
  },
  serviceName: {
    ...typography.captionBold,
    fontSize: 11.5,
    color: colors.primaryDark,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    minWidth: 0,
  },
  dateText: {
    ...typography.caption,
    fontSize: 10.5,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  dateTextToday: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontFamily: typography.font.bold,
  },
  separator: {
    fontSize: 9,
    color: colors.textDisabled,
  },
  timeText: {
    ...typography.captionBold,
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  locationText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    flexShrink: 1,
  },
  actionCol: {
    width: 100,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    flexShrink: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtn: {
    backgroundColor: colors.primary,
  },
  calledBtn: {
    backgroundColor: colors.accentDark,
  },
  pressedBtn: {
    opacity: 0.85,
  },
  ticketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  ticketNumText: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.primaryDark,
  },
});
