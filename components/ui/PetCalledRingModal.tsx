import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { getService } from '@lib/services';
import type { Appointment, QueueTicketInfo } from '@services/data';

interface PetCalledRingModalProps {
  visible: boolean;
  appointment: Appointment | null;
  ticket?: QueueTicketInfo | null;
  onAcknowledge: () => void;
}

export function PetCalledRingModal({
  visible,
  appointment,
  ticket,
  onAcknowledge,
}: PetCalledRingModalProps) {
  const bellScale = useSharedValue(1);
  const bellRotate = useSharedValue(0);

  const activeTicket = ticket || appointment?.queueTicket || {
    id: `ticket_${appointment?.id}`,
    ticketNumber: 'Q-001',
    queueSequence: 1,
    status: 'called',
    consultationRoom: 'Consultation Desk 1',
    servingVet: 'Dr. Helen Ann P. Tacandong, DVM',
  };

  useEffect(() => {
    if (visible && appointment) {
      // The realtime service owns the chime/vibration; the modal owns the visual alert.
      bellScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 180 }),
          withTiming(1.0, { duration: 180 }),
        ),
        -1,
        true,
      );

      bellRotate.value = withRepeat(
        withSequence(
          withTiming(-14, { duration: 120 }),
          withTiming(14, { duration: 120 }),
          withTiming(-10, { duration: 100 }),
          withTiming(10, { duration: 100 }),
          withTiming(0, { duration: 100 }),
          withTiming(0, { duration: 800 }),
        ),
        -1,
        false,
      );
    } else {
      bellScale.value = 1;
      bellRotate.value = 0;
    }
  }, [visible, appointment, bellScale, bellRotate]);

  const animatedBellStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: bellScale.value },
      { rotate: `${bellRotate.value}deg` },
    ],
  }));

  if (!visible || !appointment) return null;

  const service = getService(appointment.serviceId);
  const room = activeTicket.consultationRoom || 'Consultation Desk 1';
  const vet = activeTicket.servingVet || 'Dr. Helen Ann P. Tacandong, DVM';

  const handleDismiss = () => {
    haptic.medium();
    onAcknowledge();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleDismiss} />

        <View style={[styles.dialogCard, shadows.lg]}>
          {/* Header bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <View style={styles.clinicLogo}>
                <Ionicons name="medical" size={16} color={colors.primaryDark} />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.clinicName}>Carmen Central Clinic</Text>
                <Text style={styles.clinicSub}>City Veterinary Office</Text>
              </View>
            </View>

            <Pressable
              onPress={handleDismiss}
              style={styles.closeBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss call alert"
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Calling hero — direct, no nested ticket card */}
          <View style={styles.hero}>
            <View style={styles.bellOuterCircle}>
              <Animated.View style={[styles.bellInnerCircle, animatedBellStyle]}>
                <MaterialCommunityIcons name="bell-ring" size={34} color={colors.white} />
              </Animated.View>
            </View>

            <View style={styles.callingBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.callingBadgeText}>NOW CALLING PATIENT</Text>
            </View>

            <Text style={styles.petNameText}>{appointment.petName}</Text>
            <Text style={styles.subtitleText}>
              Your turn has arrived. Please proceed to the clinic room.
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Ticket and visit details displayed directly */}
          <View style={styles.details}>
            <View style={styles.ticketBlock}>
              <Text style={styles.ticketLabel}>TICKET NUMBER</Text>
              <Text style={styles.ticketNumberText}>{activeTicket.ticketNumber}</Text>
              <Text style={styles.positionText}>
                Position #{activeTicket.queueSequence}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={17} color={colors.accentDark} />
              <Text style={styles.detailLabel}>Room</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {room}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="medical-outline" size={17} color={colors.accentDark} />
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {service?.name || 'Consultation'}
              </Text>
            </View>

            <View style={styles.detailRowLast}>
              <Ionicons name="person-outline" size={17} color={colors.accentDark} />
              <Text style={styles.detailLabel}>Attending</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {vet}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.noticeRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accentDark} />
            <Text style={styles.noticeText}>
              Have your pet’s passport or QR ticket ready at the door.
            </Text>
          </View>

          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [
              styles.acknowledgeBtn,
              pressed && styles.pressedBtn,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Acknowledge calling and stop ringing"
          >
            <MaterialCommunityIcons name="volume-mute" size={18} color={colors.white} />
            <Text style={styles.acknowledgeBtnText}>I’m Going In (Stop Ringing)</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  clinicLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  clinicName: {
    ...typography.captionBold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  clinicSub: {
    ...typography.small,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  bellOuterCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  bellInnerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accentDark,
  },
  callingBadgeText: {
    ...typography.smallBold,
    fontSize: 10.5,
    color: colors.accentDark,
    letterSpacing: 0.8,
  },
  petNameText: {
    ...typography.heading2,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitleText: {
    ...typography.caption,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: spacing.md,
  },
  details: {
    gap: spacing.sm + 2,
  },
  ticketBlock: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ticketLabel: {
    ...typography.smallBold,
    fontSize: 10,
    letterSpacing: 1.3,
    color: colors.textMuted,
  },
  ticketNumberText: {
    ...typography.display,
    fontSize: 46,
    lineHeight: 52,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  positionText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailRowLast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailLabel: {
    ...typography.caption,
    fontSize: 12.5,
    color: colors.textMuted,
    width: 70,
  },
  detailValue: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    flexShrink: 1,
    textAlign: 'right',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noticeText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  acknowledgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accentDark,
    paddingVertical: 14,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  pressedBtn: {
    opacity: 0.85,
  },
  acknowledgeBtnText: {
    ...typography.captionBold,
    fontSize: 14,
    color: colors.white,
  },
});
