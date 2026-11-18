import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { formatDateWithYear } from '@lib/format';
import { getService } from '@lib/services';
import type { Appointment, QueueTicketInfo } from '@services/data';

interface QueueTicketModalProps {
  visible: boolean;
  appointment: Appointment | null;
  ticket?: QueueTicketInfo | null;
  onClose: () => void;
  onSimulateCall?: () => void;
  onCompleteVisit?: () => void;
}

export function QueueTicketModal({
  visible,
  appointment,
  ticket,
  onClose,
  onSimulateCall,
  onCompleteVisit,
}: QueueTicketModalProps) {
  if (!visible || !appointment) return null;

  const activeTicket = ticket || appointment.queueTicket || {
    id: `ticket_${appointment.id}`,
    ticketNumber: 'Q-001',
    queueSequence: 1,
    status: 'waiting',
    consultationRoom: 'Consultation Desk 1',
    servingVet: 'Dr. Helen Ann P. Tacandong, DVM',
    checkInTime: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  };

  const service = getService(appointment.serviceId);
  const formattedDate = formatDateWithYear(appointment.date);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.ticketCard, shadows.lg]}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <View style={styles.clinicLogoCircle}>
                <Ionicons name="medical" size={16} color="#0D9488" />
              </View>
              <View>
                <Text style={styles.clinicName}>Carmen Central Clinic</Text>
                <Text style={styles.clinicSub}>Official City Veterinary Office Queue</Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                haptic.light();
                onClose();
              }}
              style={styles.closeBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close Queue Ticket"
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Ticket number — displayed directly, no card */}
            <View style={styles.heroSection}>
              <View style={styles.liveBadgeRow}>
                <View style={styles.pulsingDot} />
                <Text style={styles.liveBadgeText}>OFFICIALLY CHECKED IN • ACTIVE QUEUE</Text>
              </View>

              <Text style={styles.ticketLabel}>YOUR TICKET NUMBER</Text>
              <Text style={styles.ticketNumber}>{activeTicket.ticketNumber}</Text>
              <Text style={styles.positionText}>
                Position in Queue · #{activeTicket.queueSequence}
              </Text>
            </View>

            {/* Perforated Divider */}
            <View style={styles.perforationRow}>
              <View style={styles.cutoutLeft} />
              <View style={styles.dashLine} />
              <View style={styles.cutoutRight} />
            </View>

            {/* Details — plain rows */}
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Patient</Text>
                <Text style={styles.detailValue}>{appointment.petName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue}>{service?.name || 'Clinical Care'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Consultation Room</Text>
                <Text style={styles.detailValue}>
                  {activeTicket.consultationRoom || 'Consultation Desk 1'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Check-in Time</Text>
                <Text style={styles.detailValue}>{activeTicket.checkInTime || 'Today'}</Text>
              </View>
              <View style={styles.detailRowLast}>
                <Text style={styles.detailLabel}>Appointment Date</Text>
                <Text style={styles.detailValue}>{formattedDate}</Text>
              </View>
            </View>

            {/* Plain instruction text */}
            <View style={styles.noticeRow}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.noticeText}>
                Proceed to the waiting area. Watch the clinic screens or listen for ticket{' '}
                {activeTicket.ticketNumber} to be announced.
              </Text>
            </View>

            {/* Done Action Button */}
            <Pressable
              onPress={() => {
                haptic.light();
                onClose();
              }}
              style={({ pressed }) => [
                styles.doneBtn,
                pressed && styles.doneBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Dismiss Ticket"
            >
              <Text style={styles.doneBtnText}>Keep In Queue</Text>
            </Pressable>

            {/* Test Simulation Controls (Development only) */}
            {__DEV__ && (onSimulateCall || onCompleteVisit) && (
              <View style={styles.testBtnRow}>
                {onSimulateCall && (
                  <Pressable
                    onPress={() => {
                      haptic.medium();
                      onClose();
                      onSimulateCall();
                    }}
                    style={styles.testCallBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Test Call and Ring"
                  >
                    <MaterialCommunityIcons name="bell-ring" size={15} color="#EA580C" />
                    <Text style={styles.testCallBtnText}>Test Call Pet (Ring)</Text>
                  </Pressable>
                )}

                {onCompleteVisit && (
                  <Pressable
                    onPress={() => {
                      haptic.success();
                      onClose();
                      onCompleteVisit();
                    }}
                    style={styles.testCompleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Mark Done and Move to History"
                  >
                    <Ionicons name="checkmark-done" size={15} color="#0D9488" />
                    <Text style={styles.testCompleteBtnText}>Mark Done (Put in History)</Text>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>
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
  ticketCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clinicLogoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicName: {
    ...typography.title,
    fontSize: 15,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
  },
  clinicSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveBadgeText: {
    ...typography.smallBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.primary,
  },
  ticketLabel: {
    ...typography.smallBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  ticketNumber: {
    ...typography.display,
    fontSize: 54,
    lineHeight: 62,
    color: colors.primary,
    letterSpacing: 2,
    marginVertical: 2,
  },
  positionText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  cutoutLeft: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.overlay,
    marginLeft: -28,
  },
  dashLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginHorizontal: 8,
  },
  cutoutRight: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.overlay,
    marginRight: -28,
  },
  detailsList: {
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  detailRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 12,
  },
  detailLabel: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textMuted,
  },
  detailValue: {
    ...typography.captionBold,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'right',
    flexShrink: 1,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: spacing.lg,
  },
  noticeText: {
    ...typography.caption,
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  doneBtnPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.99 }],
  },
  doneBtnText: {
    ...typography.title,
    fontSize: 14,
    fontFamily: typography.font.bold,
    color: '#FFFFFF',
  },
  testBtnRow: {
    gap: 8,
    marginTop: 6,
  },
  testCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: radius.pill,
    paddingVertical: 10,
  },
  testCallBtnText: {
    ...typography.captionBold,
    fontSize: 12,
    color: '#C2410C',
  },
  testCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: radius.pill,
    paddingVertical: 10,
  },
  testCompleteBtnText: {
    ...typography.captionBold,
    fontSize: 12,
    color: '#0D9488',
  },
});
