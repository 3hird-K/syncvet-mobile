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
}

export function QueueTicketModal({
  visible,
  appointment,
  ticket,
  onClose,
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
            {/* Ticket Hero Banner */}
            <View style={styles.heroSection}>
              <View style={styles.liveBadgeRow}>
                <View style={styles.pulsingDot} />
                <Text style={styles.liveBadgeText}>OFFICIALLY CHECKED IN • ACTIVE QUEUE</Text>
              </View>

              <Text style={styles.ticketLabel}>YOUR TICKET NUMBER</Text>
              <Text style={styles.ticketNumber}>{activeTicket.ticketNumber}</Text>

              <View style={styles.positionBadge}>
                <MaterialCommunityIcons name="account-clock" size={15} color="#0D9488" />
                <Text style={styles.positionText}>
                  Position in Queue: #{activeTicket.queueSequence}
                </Text>
              </View>
            </View>

            {/* Perforated Divider */}
            <View style={styles.perforationRow}>
              <View style={styles.cutoutLeft} />
              <View style={styles.dashLine} />
              <View style={styles.cutoutRight} />
            </View>

            {/* Ticket Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>PATIENT PET</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {appointment.petName}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>SERVICE</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {service?.name || 'Clinical Care'}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>CONSULTATION ROOM</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {activeTicket.consultationRoom || 'Consultation Desk 1'}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>CHECK-IN TIME</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {activeTicket.checkInTime || 'Today'}
                </Text>
              </View>

              <View style={[styles.detailItem, { width: '100%' }]}>
                <Text style={styles.detailLabel}>SCHEDULED DATE</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {formattedDate} • Carmen Clinic
                </Text>
              </View>
            </View>

            {/* Instruction Notice */}
            <View style={styles.noticeCard}>
              <Ionicons name="information-circle-outline" size={18} color="#0D9488" />
              <Text style={styles.noticeText}>
                Please proceed to the patient waiting area. Watch the clinic display screens or listen for your ticket number ({activeTicket.ticketNumber}) to be announced.
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 38, 0.65)',
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
    borderBottomColor: '#F3F4F6',
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
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  heroSection: {
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: radius.xl,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    ...typography.captionBold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    color: '#0D9488',
  },
  ticketLabel: {
    ...typography.caption,
    fontSize: 11,
    letterSpacing: 1,
    color: '#6B7280',
    fontFamily: typography.font.bold,
    marginTop: 2,
  },
  ticketNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: '#0F766E',
    letterSpacing: 2,
    lineHeight: 60,
  },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginTop: 8,
  },
  positionText: {
    ...typography.captionBold,
    fontSize: 12,
    color: '#0F766E',
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
    backgroundColor: 'rgba(7, 30, 38, 0.65)',
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
    backgroundColor: 'rgba(7, 30, 38, 0.65)',
    marginRight: -28,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  detailItem: {
    width: '47%',
    gap: 3,
  },
  detailLabel: {
    ...typography.caption,
    fontSize: 10,
    fontFamily: typography.font.bold,
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  detailValue: {
    ...typography.body,
    fontFamily: typography.font.bold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  noticeCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F0FDFA',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  noticeText: {
    ...typography.caption,
    fontSize: 11.5,
    color: '#115E59',
    lineHeight: 16,
    flex: 1,
  },
  doneBtn: {
    backgroundColor: '#0D9488',
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  doneBtnPressed: {
    backgroundColor: '#0F766E',
    transform: [{ scale: 0.99 }],
  },
  doneBtnText: {
    ...typography.title,
    fontSize: 14,
    fontFamily: typography.font.bold,
    color: '#FFFFFF',
  },
});
