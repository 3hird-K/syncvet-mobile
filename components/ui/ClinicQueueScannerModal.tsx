import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';

import { colors, radius, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { todayISO, formatDateWithYear } from '@lib/format';
import { getService } from '@lib/services';
import { useDataStore } from '@store/useDataStore';
import { useAuthStore } from '@store/useAuthStore';
import {
  parseClinicQueueQr,
  validateCheckInEligibility,
  checkInAppointmentToQueue,
  markAppointmentOverdue,
} from '@services/queue/queueService';
import type { Appointment, QueueTicketInfo } from '@services/data';
import { toast } from '@components/ui/Sonner';
import { Button } from '@components/ui/Button';

interface ClinicQueueScannerModalProps {
  visible: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onSuccess: (ticket: QueueTicketInfo) => void;
}

export function ClinicQueueScannerModal({
  visible,
  appointment,
  onClose,
  onSuccess,
}: ClinicQueueScannerModalProps) {
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((state) => state.user);
  const ownerId = authUser?.id || clerkUser?.id || 'cdo-resident-user';
  const updateAppointmentStatus = useDataStore((state) => state.updateAppointmentStatus);
  const localPets = useDataStore((state) => state.pets);

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isScanningRef = useRef(true);

  const pet = localPets.find((p) => p.id === appointment?.petId || p.name === appointment?.petName);
  const service = appointment ? getService(appointment.serviceId) : null;

  // Reset scanner state when modal opens
  useEffect(() => {
    if (visible) {
      setIsProcessing(false);
      setErrorMessage(null);
      setTorch(false);
      isScanningRef.current = true;
    }
  }, [visible]);

  // Handle hardware back on Android
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const processQrData = useCallback(
    async (rawData: string) => {
      if (!appointment || !isScanningRef.current) return;
      isScanningRef.current = false;
      setIsProcessing(true);
      setErrorMessage(null);
      haptic.medium();

      try {
        const parsed = parseClinicQueueQr(rawData);

        if (!parsed.valid || !parsed.date) {
          haptic.warning();
          setErrorMessage('Scanned code is not a valid Clinic Queue Check-in QR station.');
          setIsProcessing(false);
          isScanningRef.current = true;
          return;
        }

        const eligibility = validateCheckInEligibility(appointment, parsed);

        if (!eligibility.eligible) {
          if (eligibility.reason === 'overdue') {
            haptic.error();
            // Mark overdue in database and store
            await markAppointmentOverdue(appointment.id);
            await updateAppointmentStatus(ownerId, appointment.id, 'overdue');
            toast.error('Appointment Overdue', {
              description: eligibility.message,
            });
            Alert.alert(
              'Appointment Overdue',
              `Your appointment for ${appointment.petName} was scheduled for ${formatDateWithYear(appointment.date)} and was not attended on that day. Status has been updated to Overdue.`,
              [{ text: 'OK', onPress: onClose }],
            );
          } else {
            haptic.warning();
            toast.warning('Check-in Unavailable', {
              description: eligibility.message,
            });
            Alert.alert('Check-in Notice', eligibility.message, [
              {
                text: 'OK',
                onPress: () => {
                  setIsProcessing(false);
                  isScanningRef.current = true;
                },
              },
            ]);
          }
          setIsProcessing(false);
          return;
        }

        // If already queued
        if (eligibility.alreadyQueued && eligibility.ticket) {
          haptic.success();
          toast.info('Already in Queue', {
            description: `Ticket ${eligibility.ticket.ticketNumber} is active.`,
          });
          onSuccess(eligibility.ticket);
          onClose();
          return;
        }

        // Process queue check-in
        const ticket = await checkInAppointmentToQueue({
          appointment,
          stationName: parsed.station,
          user: clerkUser,
          pet,
        });

        // Update local store and query cache
        await updateAppointmentStatus(
          ownerId,
          appointment.id,
          'queued',
          ticket,
          `[Checked in: Ticket ${ticket.ticketNumber}]`,
        );

        haptic.success();
        toast.success(`Checked In: Ticket ${ticket.ticketNumber}`, {
          description: `You are #${ticket.queueSequence} in queue at ${parsed.station}.`,
        });

        onSuccess(ticket);
        onClose();
      } catch (err: any) {
        haptic.error();
        console.error('Queue check-in error:', err);
        setErrorMessage(err?.message || 'Failed to complete clinic check-in. Please try again.');
        setIsProcessing(false);
        isScanningRef.current = true;
      }
    },
    [appointment, clerkUser, onClose, onSuccess, ownerId, pet, updateAppointmentStatus],
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!isScanningRef.current || isProcessing) return;
      processQrData(data);
    },
    [isProcessing, processQrData],
  );

  // Test / Simulator helper with sample QR valid for today
  const handleSimulateSampleQr = () => {
    const today = appointment?.date || todayISO();
    const sampleUrl = `https://veterinaryoffice-cdo.vercel.app/queue-checkin?date=${today}&station=cvo-carmen&token=cvo-queue-${today}`;
    processQrData(sampleUrl);
  };

  if (!visible || !appointment) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Permission Request View */}
        {!permission?.granted ? (
          <SafeAreaView style={styles.permissionContainer}>
            <View style={styles.permissionCard}>
              <View style={styles.permissionIconCircle}>
                <Ionicons name="camera" size={38} color="#0D9488" />
              </View>
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionDesc}>
                SyncVet needs camera access to scan the Clinic Queue Check-in QR code at the reception counter.
              </Text>
              <View style={styles.permissionBtnRow}>
                <Button variant="secondary" title="Cancel" onPress={onClose} style={{ flex: 1 }} />
                <Button
                  variant="primary"
                  title="Enable Camera"
                  onPress={requestPermission}
                  style={{ flex: 1, backgroundColor: '#0D9488' }}
                />
              </View>
              <Pressable onPress={handleSimulateSampleQr} style={styles.simulateLink}>
                <Text style={styles.simulateLinkText}>⚡ Test with Sample QR (No Camera)</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        ) : (
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={isProcessing ? undefined : handleBarcodeScanned}
            />

            <SafeAreaView style={styles.overlaySafe} edges={['top', 'bottom']}>
              {/* Top Controls Header */}
              <View style={styles.topHeader}>
                <Pressable
                  onPress={onClose}
                  style={styles.circleControlBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close QR Scanner"
                >
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </Pressable>

                <View style={styles.headerTitleWrap}>
                  <Text style={styles.headerTitle}>Clinic Queue Check-in</Text>
                  <Text style={styles.headerSub}>Carmen Central Clinic</Text>
                </View>

                <Pressable
                  onPress={() => {
                    haptic.light();
                    setTorch((t) => !t);
                  }}
                  style={[styles.circleControlBtn, torch && styles.circleControlBtnActive]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Flashlight"
                >
                  <Ionicons
                    name={torch ? 'flash' : 'flash-off'}
                    size={19}
                    color={torch ? '#0D9488' : '#FFFFFF'}
                  />
                </Pressable>
              </View>

              {/* Target Appointment Info Pill */}
              <View style={styles.targetInfoPill}>
                <View style={styles.targetAvatarCircle}>
                  <Ionicons name="paw" size={14} color="#0D9488" />
                </View>
                <View style={styles.targetTextCol}>
                  <Text style={styles.targetPetName} numberOfLines={1}>
                    Checking in: {appointment.petName}
                  </Text>
                  <Text style={styles.targetScheduleText} numberOfLines={1}>
                    {service?.name || 'Veterinary Visit'} • {formatDateWithYear(appointment.date)}
                  </Text>
                </View>
              </View>

              {/* Scanner Frame Viewfinder */}
              <View style={styles.viewfinderContainer}>
                <View style={styles.viewfinderFrame}>
                  {/* Four Corner Accents */}
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />

                  {isProcessing && (
                    <View style={styles.processingOverlay}>
                      <ActivityIndicator size="large" color="#0D9488" />
                      <Text style={styles.processingText}>Verifying Queue...</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.viewfinderInstructions}>
                  Align the clinic's "Queue Check-in QR" inside the frame
                </Text>
                <Text style={styles.viewfinderSub}>
                  Valid today only for scheduled clinic appointments
                </Text>
              </View>

              {/* Error Banner if any */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Bottom Simulator / Helper Action */}
              <View style={styles.bottomActions}>
                <Pressable
                  onPress={handleSimulateSampleQr}
                  disabled={isProcessing}
                  style={({ pressed }) => [
                    styles.simulateBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Scan Sample Today QR"
                >
                  <MaterialCommunityIcons name="qrcode-scan" size={16} color="#FFFFFF" />
                  <Text style={styles.simulateBtnText}>Test Check-in QR (Sample Valid Today)</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071E26',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xxl,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  permissionIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  permissionTitle: {
    ...typography.title,
    fontSize: 18,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  permissionDesc: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  permissionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  simulateLink: {
    paddingVertical: 10,
  },
  simulateLinkText: {
    ...typography.captionBold,
    fontSize: 12,
    color: '#0D9488',
  },
  overlaySafe: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(7, 30, 38, 0.45)',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  circleControlBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleControlBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.title,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: typography.font.bold,
  },
  headerSub: {
    ...typography.caption,
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  targetInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    gap: 10,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: 10,
  },
  targetAvatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetTextCol: {
    flexShrink: 1,
  },
  targetPetName: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12,
  },
  targetScheduleText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10.5,
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  viewfinderFrame: {
    width: 260,
    height: 260,
    borderRadius: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#0D9488',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  processingText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  viewfinderInstructions: {
    ...typography.body,
    fontFamily: typography.font.bold,
    color: '#FFFFFF',
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  viewfinderSub: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    ...typography.caption,
    color: '#B91C1C',
    fontSize: 12,
    flex: 1,
  },
  bottomActions: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    ...shadows.md,
  },
  simulateBtnText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12.5,
  },
});
