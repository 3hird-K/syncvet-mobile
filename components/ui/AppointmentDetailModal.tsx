import React, { useState } from 'react';
import {
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
import { formatAppointmentTimeSlot, formatDateWithYear, formatWeekdayDate, todayISO } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useDataStore } from '@store/useDataStore';
import { useAuthStore } from '@store/useAuthStore';
import { normalizeAppointmentStatus } from '@services/data/types';
import type { Appointment } from '@services/data';
import { PopoutPetAvatar } from './PopoutPetAvatar';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { toast } from './Sonner';

interface AppointmentDetailModalProps {
  visible: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onDeleted?: (appointmentId: string) => void;
}

export function AppointmentDetailModal({
  visible,
  appointment,
  onClose,
  onDeleted,
}: AppointmentDetailModalProps) {
  const { user: clerkUser } = useUser();
  const ownerId = useAuthStore((state) => state.user?.id) || 'cdo-resident-user';
  const localPets = useDataStore((state) => state.pets);
  const deleteAppointmentStore = useDataStore((state) => state.deleteAppointment);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!appointment) return null;

  const service = getService(appointment.serviceId);
  const formattedDate = formatDateWithYear(appointment.date);
  const weekdayDate = formatWeekdayDate(appointment.date);
  const appointmentTime = formatAppointmentTimeSlot(appointment.timeSlot);
  const status = normalizeAppointmentStatus(appointment.status);
  const isHistory =
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'missed' ||
    status === 'overdue' ||
    appointment.date < todayISO();
  const refCode = `CVO-${appointment.id.replace(/\D/g, '').slice(-6) || '849201'}`;

  const pet = localPets.find(
    (p: any) =>
      p.id === appointment.petId ||
      p.name?.toLowerCase().trim() === appointment.petName?.toLowerCase().trim(),
  );
  const species = pet?.species || 'dog';
  const speciesLabel = species === 'dog' ? 'Canine' : 'Feline';
  const breedText = pet?.breed ? `${speciesLabel} · ${pet.breed}` : speciesLabel;

  const handleDeleteAppointment = async () => {
    haptic.warning();
    setSubmitting(true);
    try {
      await deleteAppointmentStore(ownerId, appointment.id, clerkUser);
      haptic.success();
      toast.success('Appointment Deleted', {
        description: `The ${appointment.petName} appointment was removed from your schedule.`,
      });

      onDeleted?.(appointment.id);
      setConfirmingDelete(false);
      onClose();
    } catch {
      haptic.error();
      toast.error('Deletion Failed', {
        description: 'Unable to delete this appointment. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmingDelete(false);
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
              <StatusBadge status={status} />
              {!confirmingDelete && !isHistory ? (
                <Pressable
                  onPress={() => {
                    haptic.light();
                    setConfirmingDelete(true);
                  }}
                  style={styles.deleteBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Delete Appointment"
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              ) : null}
              <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {!confirmingDelete || isHistory ? (
              <>
                {/* Identity — displayed directly, no nested card */}
                <View style={styles.identityRow}>
                  <View style={styles.avatarWrap}>
                    {pet ? (
                      <PopoutPetAvatar
                        avatarId={pet.avatarId}
                        species={pet.species}
                        photoUrl={pet.photoUrl}
                        size={44}
                        scale={1.25}
                      />
                    ) : (
                      <View style={styles.fallbackAvatar}>
                        <Ionicons
                          name="paw"
                          size={20}
                          color={species === 'dog' ? colors.primaryDark : colors.errorDark}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.identityCopy}>
                    <Text style={styles.petName}>{appointment.petName}</Text>
                    <Text style={styles.serviceName}>
                      {service?.name || 'Veterinary Visit'}
                    </Text>
                    <Text style={styles.breedText}>{breedText}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Slip details — plain rows */}
                <View style={styles.details}>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={colors.primaryDark}
                    />
                    <View style={styles.detailCopy}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{weekdayDate}</Text>
                      <Text style={styles.detailSub}>{formattedDate}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={18} color={colors.primaryDark} />
                    <View style={styles.detailCopy}>
                      <Text style={styles.detailLabel}>Appointment Time</Text>
                      <Text style={styles.detailValueHighlight}>{appointmentTime}</Text>
                      <Text style={styles.detailSub}>Clinic hours: 8:00 AM – 5:00 PM</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={colors.primaryDark}
                    />
                    <View style={styles.detailCopy}>
                      <Text style={styles.detailLabel}>Clinic</Text>
                      <Text style={styles.detailValue}>
                        {appointment.location || SERVICE_LOCATION}, CDO
                      </Text>
                    </View>
                  </View>

                  {appointment.notes ? (
                    <View style={styles.detailRow}>
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={colors.primaryDark}
                      />
                      <View style={styles.detailCopy}>
                        <Text style={styles.detailLabel}>Resident Notes</Text>
                        <Text style={styles.detailNotes}>{appointment.notes}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={styles.divider} />

                {/* Plain pre-visit reminder — no card wrapper */}
                <View style={styles.noticeRow}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.noticeText}>
                    Please bring your pet’s physical passport or digital QR code on arrival. Dogs
                    must be leashed and cats secured in carriers.
                  </Text>
                </View>
              </>
            ) : (
              /* Delete Confirmation Step */
              <View style={styles.deleteConfirmBlock}>
                <View style={styles.deleteWarningIconWrap}>
                  <Ionicons name="trash-outline" size={24} color={colors.error} />
                </View>

                <Text style={styles.deleteHeading}>Delete Appointment?</Text>
                <Text style={styles.deleteSub}>
                  This removes the visit from your schedule permanently.
                  {'\n'}
                  <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                    {appointment.petName}
                  </Text>{' '}
                  · {formattedDate}
                </Text>

                <View style={styles.deleteActionsRow}>
                  <Button
                    title={submitting ? 'Deleting…' : 'Delete Appointment'}
                    variant="danger"
                    size="md"
                    leftIcon={<Ionicons name="trash-outline" size={16} color={colors.white} />}
                    onPress={handleDeleteAppointment}
                    loading={submitting}
                    disabled={submitting}
                    fullWidth
                  />
                  <Button
                    title="Keep Appointment"
                    variant="outline"
                    size="md"
                    onPress={handleClose}
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
    padding: spacing.lg,
    maxHeight: '94%',
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerTitleWrap: {
    gap: 2,
    flexShrink: 1,
  },
  headerEyebrow: {
    ...typography.smallBold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 10,
  },
  headerRefText: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 4,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrap: {
    width: 54,
    alignItems: 'center',
  },
  fallbackAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  petName: {
    ...typography.heading3,
    color: colors.textPrimary,
    fontSize: 18,
  },
  serviceName: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 13,
  },
  breedText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: spacing.md,
  },
  details: {
    gap: spacing.md + 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detailLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  detailValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13.5,
    lineHeight: 18,
  },
  detailValueHighlight: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 14,
    lineHeight: 18,
  },
  detailSub: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11.5,
  },
  detailNotes: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  deleteConfirmBlock: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  deleteWarningIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteHeading: {
    ...typography.heading2,
    color: colors.error,
    fontSize: 16.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  deleteSub: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 16,
    textAlign: 'center',
  },
  deleteActionsRow: {
    width: '100%',
    marginTop: 10,
    gap: 8,
  },
});
