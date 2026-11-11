import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
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
  showFooterAction = true,
}: AppointmentCardProps) {
  const service = getService(appointment.serviceId);
  const formattedDate = formatWeekdayDate(appointment.date);
  const today = todayISO();
  const isToday = appointment.date === today;
  const isOverdue = appointment.status === 'overdue' || (appointment.status === 'pending' && appointment.date < today);
  const isQueued = appointment.status === 'queued' || appointment.status === 'checked_in';
  const effectiveStatus = isOverdue ? 'overdue' : isQueued ? 'queued' : appointment.status;

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
        shadows.sm,
        isToday && !isQueued && !isOverdue && styles.todayCardGlow,
        pressed && styles.pressed,
      ]}
    >
      {/* 1. Top Minimalist Header: Avatar + Identity + Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.avatarWrap}>
          {pet ? (
            <PopoutPetAvatar
              avatarId={pet.avatarId}
              species={pet.species}
              photoUrl={pet.photoUrl}
              size={42}
              scale={1.22}
            />
          ) : (
            <View
              style={[
                styles.fallbackAvatar,
                { backgroundColor: isDog ? 'rgba(13, 148, 136, 0.12)' : 'rgba(219, 39, 119, 0.12)' },
              ]}
            >
              <Ionicons
                name="paw"
                size={18}
                color={isDog ? '#0D9488' : '#DB2777'}
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

        <View style={styles.badgeCol}>
          {appointment._pendingSync && (
            <View style={styles.pendingBadge}>
              <Ionicons name="cloud-upload-outline" size={9.5} color={colors.warning} />
              <Text style={styles.pendingBadgeText}>Offline</Text>
            </View>
          )}
          <StatusBadge status={effectiveStatus} />
        </View>
      </View>

      {/* 2. Minimalist Schedule & Service Row (No morning/afternoon session) */}
      <View style={styles.metaRow}>
        {/* Service Chip */}
        <View style={styles.serviceChip}>
          <Ionicons
            name={service?.icon ?? 'medkit-outline'}
            size={12.5}
            color="#0D9488"
          />
          <Text style={styles.serviceChipText} numberOfLines={1}>
            {service?.name ?? 'Veterinary Service'}
          </Text>
        </View>

        {/* Clean Date Chip (Session removed) */}
        <View style={[styles.dateChip, isToday && styles.dateChipToday]}>
          <Ionicons
            name="calendar-outline"
            size={12}
            color={isToday ? '#0F766E' : '#4B5563'}
          />
          <Text style={[styles.dateChipText, isToday && styles.dateChipTextToday]} numberOfLines={1}>
            {isToday ? `Today · ${formattedDate}` : formattedDate}
          </Text>
        </View>
      </View>

      {/* 3. Location info */}
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={11.5} color="#9CA3AF" />
        <Text style={styles.locationText} numberOfLines={1}>
          {appointment.location || 'Carmen Central Clinic · CDO'}
        </Text>
      </View>

      {/* 4. Queuing / Check-in QR Action Area */}
      {isQueued ? (
        /* Checked In: Active Queue Ticket Pill */
        <Pressable
          onPress={handleTicketClick}
          style={({ pressed }) => [
            styles.queuedTicketBar,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="View Clinic Queue Ticket"
        >
          <View style={styles.queuePillLeft}>
            <View style={styles.queuePulseDot} />
            <MaterialCommunityIcons name="qrcode-scan" size={14} color="#0D9488" />
            <Text style={styles.queueTicketText}>
              Ticket {appointment.queueTicket?.ticketNumber || 'Q-001'} • In Queue
              {appointment.queueTicket?.queueSequence ? ` (#${appointment.queueTicket.queueSequence})` : ''}
            </Text>
          </View>
          <View style={styles.viewPassLink}>
            <Text style={styles.viewPassLinkText}>View Pass</Text>
            <Ionicons name="chevron-forward" size={12} color="#0D9488" />
          </View>
        </Pressable>
      ) : isOverdue ? (
        /* Overdue Notice Bar */
        <View style={styles.overdueBar}>
          <Ionicons name="alert-circle" size={14} color="#DC2626" />
          <Text style={styles.overdueBarText} numberOfLines={1}>
            Missed scheduled date ({formattedDate}) • Status Overdue
          </Text>
        </View>
      ) : onScanPress ? (
        /* Active: Scan QR Code Action */
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleScanClick}
            style={({ pressed }) => [
              styles.scanQrBtn,
              isToday ? styles.scanQrBtnToday : styles.scanQrBtnFuture,
              pressed && styles.scanQrBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Scan Clinic Queue Check-in QR"
          >
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={15}
              color={isToday ? '#FFFFFF' : '#0D9488'}
            />
            <Text style={[styles.scanQrBtnText, isToday && styles.scanQrBtnTextToday]}>
              Scan QR to Check In
            </Text>
            {isToday && (
              <View style={styles.validTodayPill}>
                <Text style={styles.validTodayPillText}>Valid Today</Text>
              </View>
            )}
          </Pressable>

          {showFooterAction && (
            <View style={styles.detailsOnlyAction}>
              <Text style={styles.detailsOnlyText}>Details</Text>
              <Ionicons name="chevron-forward" size={12} color="#9CA3AF" />
            </View>
          )}
        </View>
      ) : showFooterAction ? (
        <View style={styles.footerRow}>
          <View style={styles.detailsOnlyAction}>
            <Text style={styles.detailsOnlyText}>View Details</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.primary} />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 9,
  },
  todayCardGlow: {
    borderColor: '#99F6E4',
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    backgroundColor: '#FAFAFA',
    transform: [{ scale: 0.995 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petTextCol: {
    flex: 1,
    gap: 1.5,
  },
  petName: {
    ...typography.title,
    color: '#111827',
    fontSize: 15,
    fontFamily: typography.font.bold,
  },
  petBreedText: {
    ...typography.caption,
    color: '#6B7280',
    fontSize: 11.5,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.22)',
  },
  pendingBadgeText: {
    ...typography.captionBold,
    fontSize: 9,
    fontFamily: typography.font.bold,
    color: colors.warning,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8.5,
    paddingVertical: 4.5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    flexShrink: 1,
  },
  serviceChipText: {
    ...typography.captionBold,
    color: '#0D9488',
    fontSize: 11.5,
    fontFamily: typography.font.bold,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8.5,
    paddingVertical: 4.5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateChipToday: {
    backgroundColor: '#CCFBF1',
    borderColor: '#99F6E4',
  },
  dateChipText: {
    ...typography.captionBold,
    color: '#374151',
    fontSize: 11.5,
    fontFamily: typography.font.bold,
  },
  dateChipTextToday: {
    color: '#0F766E',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 1,
  },
  locationText: {
    ...typography.caption,
    color: '#9CA3AF',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  scanQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    borderRadius: radius.pill,
  },
  scanQrBtnToday: {
    backgroundColor: '#0D9488',
  },
  scanQrBtnFuture: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  scanQrBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  scanQrBtnText: {
    ...typography.captionBold,
    color: '#0D9488',
    fontSize: 12,
    fontFamily: typography.font.bold,
  },
  scanQrBtnTextToday: {
    color: '#FFFFFF',
  },
  validTodayPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
    marginLeft: 2,
  },
  validTodayPillText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 9.5,
  },
  detailsOnlyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  detailsOnlyText: {
    ...typography.captionBold,
    color: '#6B7280',
    fontSize: 11.5,
  },
  queuedTicketBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginTop: 2,
  },
  queuePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  queuePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  queueTicketText: {
    ...typography.captionBold,
    color: '#0F766E',
    fontSize: 12,
    fontFamily: typography.font.bold,
    flexShrink: 1,
  },
  viewPassLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewPassLinkText: {
    ...typography.captionBold,
    color: '#0D9488',
    fontSize: 11,
  },
  overdueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    paddingVertical: 6.5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 2,
  },
  overdueBarText: {
    ...typography.captionBold,
    color: '#DC2626',
    fontSize: 11.5,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
});
