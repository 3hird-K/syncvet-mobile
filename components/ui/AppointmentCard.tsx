import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, shadows, typography } from '@theme';
import { getService } from '@lib/services';
import { formatWeekdayDate, todayISO } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useDataStore } from '@store/useDataStore';
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
  const isOverdue =
    appointment.status === 'overdue' ||
    (appointment.status === 'pending' && appointment.date < today);
  const isQueued = appointment.status === 'queued' || appointment.status === 'checked_in';
  const isCalled = appointment.status === 'called' || appointment.status === 'serving';
  const isCompleted = appointment.status === 'completed';

  const effectiveStatus = isOverdue
    ? 'overdue'
    : isCalled
    ? 'called'
    : isQueued
    ? 'queued'
    : appointment.status;

  // Look up pet from data store for real avatar and species
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
      style={({ pressed }) => [
        styles.card,
        isCalled && styles.cardCalled,
        isToday && !isQueued && !isOverdue && !isCompleted && styles.cardToday,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardInner}>
        {/* 1. Left Avatar */}
        <View style={styles.avatarCol}>
          {pet ? (
            <PopoutPetAvatar
              avatarId={pet.avatarId}
              species={pet.species}
              photoUrl={pet.photoUrl}
              size={38}
              scale={1.2}
            />
          ) : (
            <View
              style={[
                styles.fallbackAvatar,
                { backgroundColor: isDog ? '#CCFBF1' : '#FCE7F3' },
              ]}
            >
              <Ionicons
                name="paw"
                size={16}
                color={isDog ? '#0D9488' : '#DB2777'}
              />
            </View>
          )}
        </View>

        {/* 2. Middle Info */}
        <View style={styles.infoCol}>
          {/* Pet Name & Breed */}
          <View style={styles.topNameRow}>
            <Text style={styles.petName} numberOfLines={1}>
              {appointment.petName}
            </Text>
            <Text style={styles.breedText} numberOfLines={1}>
              · {breedText}
            </Text>
          </View>

          {/* Service Name */}
          <Text style={styles.serviceName} numberOfLines={1}>
            {service?.name ?? 'Veterinary Service'}
          </Text>

          {/* Schedule Date & Clinic Location */}
          <View style={styles.scheduleRow}>
            <Ionicons
              name="calendar-outline"
              size={11}
              color={isToday ? '#0F766E' : '#6B7280'}
            />
            <Text style={[styles.dateText, isToday && styles.dateTextToday]} numberOfLines={1}>
              {isToday ? `Today · ${formattedDate}` : formattedDate}
            </Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {appointment.location || 'Carmen Clinic'}
            </Text>
          </View>
        </View>

        {/* 3. Right Action Area: Status & Scan Icon */}
        <View style={styles.actionCol}>
          <StatusBadge status={effectiveStatus} />

          <View style={styles.iconActionRow}>
            {isCalled ? (
              /* When called: pulsating ring icon */
              <Pressable
                onPress={handleTicketClick}
                style={styles.calledIconBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Pet is called! Tap to view details"
              >
                <MaterialCommunityIcons name="bell-ring" size={17} color="#FFFFFF" />
              </Pressable>
            ) : isQueued ? (
              /* When in queue: ticket icon */
              <Pressable
                onPress={handleTicketClick}
                style={styles.queuedIconBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="View Queue Ticket"
              >
                <MaterialCommunityIcons name="ticket-outline" size={17} color="#0D9488" />
                <Text style={styles.ticketNumText}>
                  {appointment.queueTicket?.ticketNumber || 'Q-001'}
                </Text>
              </Pressable>
            ) : isOverdue || isCompleted ? null : onScanPress ? (
              /* Just an Icon for Scan QR Code! */
              <Pressable
                onPress={handleScanClick}
                style={({ pressed }) => [
                  styles.scanIconBtn,
                  isToday && styles.scanIconBtnToday,
                  pressed && { opacity: 0.8 },
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Scan Clinic QR Code"
              >
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={16}
                  color={isToday ? '#FFFFFF' : '#0D9488'}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardToday: {
    borderColor: '#99F6E4',
    backgroundColor: '#FAFCFC',
  },
  cardCalled: {
    borderColor: '#FDBA74',
    backgroundColor: '#FFF7ED',
  },
  pressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.995 }],
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCol: {
    width: 38,
    height: 38,
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
    gap: 2,
    justifyContent: 'center',
  },
  topNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  petName: {
    ...typography.title,
    fontSize: 14.5,
    fontFamily: typography.font.bold,
    color: '#111827',
  },
  breedText: {
    ...typography.caption,
    fontSize: 11,
    color: '#6B7280',
    flexShrink: 1,
  },
  serviceName: {
    ...typography.captionBold,
    fontSize: 12,
    color: '#0D9488',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  dateText: {
    ...typography.caption,
    fontSize: 11,
    color: '#4B5563',
  },
  dateTextToday: {
    ...typography.captionBold,
    color: '#0F766E',
    fontFamily: typography.font.bold,
  },
  dotSeparator: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  locationText: {
    ...typography.caption,
    fontSize: 10.5,
    color: '#9CA3AF',
    flexShrink: 1,
  },
  actionCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  iconActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scanIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIconBtnToday: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  calledIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queuedIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  ticketNumText: {
    ...typography.captionBold,
    fontSize: 10.5,
    color: '#0D9488',
  },
});
