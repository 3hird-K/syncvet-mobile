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

import { colors, radius, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { startQueueRing, stopQueueRing } from '@lib/sound';
import type { Appointment, QueueTicketInfo } from '@services/data';

interface PetCalledRingModalProps {
  visible: boolean;
  appointment: Appointment | null;
  ticket?: QueueTicketInfo | null;
  onAcknowledge: () => void;
  onCompleteVisit?: () => void;
}

export function PetCalledRingModal({
  visible,
  appointment,
  ticket,
  onAcknowledge,
  onCompleteVisit,
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
      // Start ringing & vibration
      startQueueRing(
        appointment.petName,
        activeTicket.ticketNumber,
        activeTicket.consultationRoom || 'Consultation Desk 1',
      );

      // Start ringing bell animation
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
      stopQueueRing();
      bellScale.value = 1;
      bellRotate.value = 0;
    }

    return () => {
      stopQueueRing();
    };
  }, [visible, appointment, activeTicket.ticketNumber, activeTicket.consultationRoom, bellScale, bellRotate]);

  const animatedBellStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: bellScale.value },
      { rotate: `${bellRotate.value}deg` },
    ],
  }));

  if (!visible || !appointment) return null;

  const handleDismiss = () => {
    stopQueueRing();
    haptic.medium();
    onAcknowledge();
  };

  const handleComplete = () => {
    stopQueueRing();
    haptic.success();
    onCompleteVisit?.();
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
          {/* Pulsing Bell Hero */}
          <View style={styles.bellOuterCircle}>
            <Animated.View style={[styles.bellInnerCircle, animatedBellStyle]}>
              <MaterialCommunityIcons name="bell-ring" size={38} color="#FFFFFF" />
            </Animated.View>
          </View>

          {/* Calling Header */}
          <View style={styles.callingBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.callingBadgeText}>NOW CALLING PATIENT</Text>
          </View>

          <Text style={styles.petNameText}>{appointment.petName}</Text>
          <Text style={styles.subtitleText}>Your turn has arrived! Please enter the clinic room.</Text>

          {/* Ticket Number Highlight */}
          <View style={styles.ticketCard}>
            <Text style={styles.ticketLabel}>TICKET NUMBER</Text>
            <Text style={styles.ticketNumberText}>{activeTicket.ticketNumber}</Text>
            <View style={styles.roomRow}>
              <Ionicons name="location" size={15} color="#0D9488" />
              <Text style={styles.roomText}>
                {activeTicket.consultationRoom || 'Consultation Desk 1'}
              </Text>
            </View>
            <Text style={styles.vetText}>
              Attending: {activeTicket.servingVet || 'Dr. Helen Ann P. Tacandong, DVM'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonCol}>
            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.acknowledgeBtn,
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Acknowledge Calling and Stop Ringing"
            >
              <MaterialCommunityIcons name="volume-mute" size={18} color="#FFFFFF" />
              <Text style={styles.acknowledgeBtnText}>I'm Going In (Stop Ringing)</Text>
            </Pressable>

            {onCompleteVisit && (
              <Pressable
                onPress={handleComplete}
                style={({ pressed }) => [
                  styles.completeBtn,
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Mark Consultation as Completed and move to history"
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#0D9488" />
                <Text style={styles.completeBtnText}>Mark as Done (Put in History)</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 38, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xxl,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
  },
  bellOuterCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  bellInnerCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EA580C',
  },
  callingBadgeText: {
    ...typography.captionBold,
    fontSize: 11,
    color: '#C2410C',
    letterSpacing: 0.6,
  },
  petNameText: {
    ...typography.title,
    fontSize: 22,
    fontFamily: typography.font.bold,
    color: '#111827',
    textAlign: 'center',
  },
  subtitleText: {
    ...typography.caption,
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  ticketCard: {
    width: '100%',
    backgroundColor: '#F0FDFA',
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 18,
  },
  ticketLabel: {
    ...typography.caption,
    fontSize: 10,
    fontFamily: typography.font.bold,
    color: '#6B7280',
    letterSpacing: 1,
  },
  ticketNumberText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0D9488',
    letterSpacing: 1.5,
    marginVertical: 2,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  roomText: {
    ...typography.body,
    fontFamily: typography.font.bold,
    fontSize: 13.5,
    color: '#0F766E',
  },
  vetText: {
    ...typography.caption,
    fontSize: 11,
    color: '#115E59',
    marginTop: 2,
  },
  buttonCol: {
    width: '100%',
    gap: 10,
  },
  acknowledgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    paddingVertical: 13,
    borderRadius: radius.pill,
    width: '100%',
  },
  acknowledgeBtnText: {
    ...typography.body,
    fontFamily: typography.font.bold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingVertical: 11,
    borderRadius: radius.pill,
    width: '100%',
  },
  completeBtnText: {
    ...typography.captionBold,
    color: '#0D9488',
    fontSize: 12.5,
  },
});
