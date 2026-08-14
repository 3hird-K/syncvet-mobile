import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { getService, SERVICE_LOCATION } from '@lib/services';
import { formatWeekdayDate, formatDateWithYear } from '@lib/format';
import { haptic } from '@lib/haptics';
import { updateClerkUnsafeMetadata } from '@lib/clerkMetadata';
import { useDataStore } from '@store/useDataStore';
import { useAuthStore } from '@store/useAuthStore';
import type { Appointment } from '@services/data';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { toast } from './Sonner';

interface AppointmentDetailModalProps {
  visible: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onCancelled?: (appointmentId: string) => void;
}

const CANCEL_REASONS = [
  'Schedule conflict / Busy',
  'Pet already treated elsewhere',
  'Need to reschedule date or time',
  'Other reason',
];

export function AppointmentDetailModal({
  visible,
  appointment,
  onClose,
  onCancelled,
}: AppointmentDetailModalProps) {
  const { user: clerkUser } = useUser();
  const ownerId = useAuthStore((state) => state.user?.id) || 'cdo-resident-user';
  const cancelAppointmentStore = useDataStore((state) => state.cancelAppointment);

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [submitting, setSubmitting] = useState(false);

  if (!appointment) return null;

  const service = getService(appointment.serviceId);
  const isCancellable =
    appointment.status === 'pending' || appointment.status === 'confirmed';
  const formattedDate = formatWeekdayDate(appointment.date);
  const refCode = `CVO-${appointment.id.replace(/\D/g, '').slice(-6) || '849201'}`;

  const handleCancelAppointment = async () => {
    haptic.warning();
    setSubmitting(true);
    try {
      // 1. Update Zustand store
      await cancelAppointmentStore(ownerId, appointment.id);

      // 2. Sync with Clerk user unsafeMetadata
      if (clerkUser) {
        const metadata = (clerkUser.unsafeMetadata || {}) as Record<string, any>;
        const metaAppointments = Array.isArray(metadata.appointments)
          ? metadata.appointments
          : [];
        const updatedAppointments = metaAppointments.map((a: any) =>
          a.id === appointment.id
            ? { ...a, status: 'cancelled', cancelReason: selectedReason }
            : a,
        );
        await updateClerkUnsafeMetadata(clerkUser, {
          appointments: updatedAppointments,
        });
      }

      haptic.success();
      toast.success('Appointment Cancelled', {
        description: `Scheduled visit for ${appointment.petName} on ${formattedDate} was cancelled.`,
      });
      onCancelled?.(appointment.id);
      setConfirmingCancel(false);
      onClose();
    } catch {
      haptic.error();
      toast.error('Cancellation Failed', {
        description: 'Unable to cancel this appointment. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmingCancel(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={[styles.modalCard, shadows.lg]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerEyebrow}>Appointment Slip</Text>
              <Text style={styles.headerRefText}>Ref #{refCode}</Text>
            </View>

            <View style={styles.headerRight}>
              <StatusBadge status={appointment.status} />
              <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {!confirmingCancel ? (
              <>
                {/* Pet & Service Identity Card */}
                <View style={styles.identityCard}>
                  <View style={styles.petAvatarPill}>
                    <Ionicons name="paw" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.identityInfo}>
                    <Text style={styles.petName}>{appointment.petName}</Text>
                    <Text style={styles.serviceName}>{service?.name || 'Veterinary Visit'}</Text>
                  </View>
                </View>

                {/* Clinical Schedule Details */}
                <View style={styles.detailsBlock}>
                  <View style={styles.detailRow}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Scheduled Date</Text>
                      <Text style={styles.detailValue}>{formattedDate}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="time-outline" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Assigned Time Slot</Text>
                      <Text style={styles.detailValueHighlight}>{appointment.timeSlot}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="location-outline" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Clinic Location</Text>
                      <Text style={styles.detailValue}>
                        {appointment.location || SERVICE_LOCATION}, CDO
                      </Text>
                    </View>
                  </View>

                  {appointment.notes ? (
                    <View style={styles.detailRow}>
                      <View style={styles.iconCircle}>
                        <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                      </View>
                      <View style={styles.detailTextWrap}>
                        <Text style={styles.detailLabel}>Resident Notes</Text>
                        <Text style={styles.detailNotes}>{appointment.notes}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Pre-Visit Veterinary Reminder */}
                <View style={styles.reminderCard}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primaryDark} />
                  <Text style={styles.reminderText}>
                    Please bring your pet’s physical passport or digital QR code on arrival. Dogs must be leashed and cats secured in carriers.
                  </Text>
                </View>

                {/* Cancel Action Button (Only for active appointments) */}
                {isCancellable && (
                  <Pressable
                    onPress={() => {
                      haptic.light();
                      setConfirmingCancel(true);
                    }}
                    style={styles.cancelLinkBtn}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={colors.error} />
                    <Text style={styles.cancelLinkText}>Cancel This Appointment</Text>
                  </Pressable>
                )}
              </>
            ) : (
              /* Cancellation Confirmation Step */
              <View style={styles.cancelConfirmBlock}>
                <View style={styles.cancelWarningIconWrap}>
                  <Ionicons name="alert-circle" size={24} color={colors.error} />
                </View>

                <Text style={styles.cancelHeading}>Cancel Appointment?</Text>
                <Text style={styles.cancelSub}>
                  Are you sure you want to cancel the visit for{' '}
                  <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                    {appointment.petName}
                  </Text>{' '}
                  on {formattedDate}?
                </Text>

                <Text style={styles.reasonLabel}>Please select a cancellation reason:</Text>
                <View style={styles.reasonsList}>
                  {CANCEL_REASONS.map((r) => {
                    const isSelected = selectedReason === r;
                    return (
                      <Pressable
                        key={r}
                        onPress={() => {
                          haptic.light();
                          setSelectedReason(r);
                        }}
                        style={[
                          styles.reasonOption,
                          isSelected && styles.reasonOptionSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <Text
                          style={[
                            styles.reasonText,
                            isSelected && styles.reasonTextSelected,
                          ]}
                        >
                          {r}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.cancelActionsRow}>
                  <Button
                    title={submitting ? 'Cancelling…' : 'Cancel Appointment'}
                    variant="danger"
                    size="md"
                    onPress={handleCancelAppointment}
                    loading={submitting}
                    disabled={submitting}
                    fullWidth
                  />
                </View>
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
    backgroundColor: 'rgba(7, 30, 38, 0.65)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.md,
    maxHeight: '94%',
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(7, 30, 38, 0.10)',
    marginBottom: spacing.sm,
  },
  headerTitleWrap: {
    gap: 1,
  },
  headerEyebrow: {
    ...typography.captionBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 10.5,
  },
  headerRefText: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: spacing.sm,
    paddingBottom: 4,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 168, 150, 0.06)',
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.15)',
  },
  petAvatarPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 168, 150, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: {
    flex: 1,
    gap: 2,
  },
  petName: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  serviceName: {
    ...typography.small,
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 12.5,
  },
  detailsBlock: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  detailTextWrap: {
    flex: 1,
    gap: 1,
  },
  detailLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 13,
  },
  detailValueHighlight: {
    ...typography.body,
    color: colors.primary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  detailNotes: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(0, 168, 150, 0.05)',
    padding: 10,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  reminderText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  cancelLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  cancelLinkText: {
    ...typography.captionBold,
    color: colors.error,
    fontSize: 13,
  },
  cancelConfirmBlock: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  cancelWarningIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  cancelHeading: {
    ...typography.heading2,
    color: colors.error,
    fontSize: 16.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  cancelSub: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 16,
    textAlign: 'center',
  },
  reasonLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  reasonsList: {
    width: '100%',
    gap: 6,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonOptionSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(239, 68, 68, 0.30)',
  },
  radioCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
    borderColor: colors.textDisabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.error,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  reasonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 12,
    flex: 1,
  },
  reasonTextSelected: {
    color: colors.error,
    fontWeight: '700',
  },
  cancelActionsRow: {
    width: '100%',
    marginTop: 10,
  },
});
