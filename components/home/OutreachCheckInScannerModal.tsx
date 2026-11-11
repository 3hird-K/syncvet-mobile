import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import { playWebChime } from '@lib/sound';
import { getPetAvatarSource } from '@lib/petAvatars';
import { useDataStore } from '@store/useDataStore';
import { useAuthStore } from '@store/useAuthStore';
import { toast } from '@components/ui/Sonner';
import { Button } from '@components/ui/Button';
import {
  parseOutreachAdminQr,
  recordOutreachService,
  validateOutreachQrForEvent,
  type OutreachDetails,
  type OutreachRecordResult,
  type OutreachServiceType,
} from '@services/outreach/outreachService';
import type { Pet } from '@services/data/types';

interface OutreachCheckInScannerModalProps {
  visible: boolean;
  outreachInfo: OutreachDetails | null;
  onClose: () => void;
  onSuccess: (result: OutreachRecordResult) => void;
}

export function OutreachCheckInScannerModal({
  visible,
  outreachInfo,
  onClose,
  onSuccess,
}: OutreachCheckInScannerModalProps) {
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((s) => s.user);
  const ownerId = authUser?.id || clerkUser?.id || '';
  const ownerName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    authUser?.fullName ||
    'Resident';
  const ownerPhone = authUser?.mobileNumber || '';

  const localPets = useDataStore((s) => s.pets);
  const userPets: Pet[] = localPets || [];

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isScanningRef = useRef(true);

  // Selected pet for outreach service
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  // Selected service type: vaccination, consultation, spay-neuter
  const [selectedService, setSelectedService] = useState<OutreachServiceType>('vaccination');

  // Set default pet and service when modal opens
  useEffect(() => {
    if (visible) {
      setIsProcessing(false);
      setErrorMessage(null);
      setTorch(false);
      isScanningRef.current = true;

      if (userPets.length > 0 && !selectedPetId) {
        setSelectedPetId(userPets[0].id);
      }

      if (outreachInfo?.servicesOffered && outreachInfo.servicesOffered.length > 0) {
        setSelectedService(outreachInfo.servicesOffered[0]);
      }
    }
  }, [visible, userPets, outreachInfo, selectedPetId]);

  // Hardware back button handler on Android
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const activePet = userPets.find((p) => p.id === selectedPetId) || userPets[0] || null;

  const processQrPayload = useCallback(
    async (rawData: string) => {
      if (!outreachInfo || !isScanningRef.current || !activePet) return;
      isScanningRef.current = false;
      setIsProcessing(true);
      setErrorMessage(null);
      haptic.medium();

      try {
        const parsed = parseOutreachAdminQr(rawData);
        const validation = validateOutreachQrForEvent(
          parsed,
          outreachInfo,
          selectedService,
        );

          if (!validation.valid) {
            haptic.warning();
            setErrorMessage(validation.message);
            setIsProcessing(false);
            setTimeout(() => {
              isScanningRef.current = true;
            }, 1500);
            return;
          }

          const effectiveService: OutreachServiceType = validation.service;

          // Execute municipal service record registration
          const recordResult = await recordOutreachService({
            pet: activePet,
            ownerId,
            ownerName,
            ownerPhone,
            service: effectiveService,
            outreachInfo: {
              ...outreachInfo,
              attendingVet: parsed.vetName || outreachInfo.attendingVet,
              barangay: parsed.barangay || outreachInfo.barangay,
              opId: parsed.opId || outreachInfo.opId,
            },
          });

          // Trigger celebratory sound & haptics
          playWebChime();
          haptic.success();

          toast.success(`Outreach Service Logged: ${recordResult.serviceTitle}`, {
            description: `${activePet.name} has been officially recorded at Brgy. ${outreachInfo.barangay}.`,
          });

          onSuccess(recordResult);
          onClose();
        } catch (err: any) {
          haptic.error();
          console.error('Outreach record error:', err);
          setErrorMessage(err?.message || 'Failed to record outreach visit. Please try again.');
          setIsProcessing(false);
          isScanningRef.current = true;
        }
      },
      [activePet, onClose, onSuccess, outreachInfo, ownerId, ownerName, ownerPhone, selectedService],
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!isScanningRef.current || isProcessing) return;
      processQrPayload(data);
    },
    [isProcessing, processQrPayload],
  );

  // Instant Test Simulator
  const handleSimulateAdminQr = () => {
    if (!outreachInfo) return;
    const samplePayload = `https://veterinaryoffice-cdo.vercel.app/outreach-checkin?opId=${encodeURIComponent(outreachInfo.opId)}&barangay=${encodeURIComponent(outreachInfo.barangay)}&date=${encodeURIComponent(outreachInfo.date)}&service=${encodeURIComponent(selectedService)}&vet=${encodeURIComponent(outreachInfo.attendingVet)}&token=cvo-outreach-valid`;
    processQrPayload(samplePayload);
  };

  if (!visible || !outreachInfo) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {!permission?.granted ? (
          <SafeAreaView style={styles.permissionContainer}>
            <View style={styles.permissionCard}>
              <View style={styles.permissionIconCircle}>
                <Ionicons name="camera" size={36} color="#0D9488" />
              </View>
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionDesc}>
                SyncVet needs camera access to scan the Admin's QR code at the Barangay {outreachInfo.barangay} outreach station.
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
              <Pressable onPress={handleSimulateAdminQr} style={styles.simulateLink}>
                <Text style={styles.simulateLinkText}>⚡ Test / Simulate Admin QR (No Camera)</Text>
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
              {/* Top Header */}
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
                  <Text style={styles.headerTitle}>Outreach Station Check-in</Text>
                  <Text style={styles.headerSub}>
                    Brgy. {outreachInfo.barangay} • {outreachInfo.opId}
                  </Text>
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

              {/* Step 1: Select Pet */}
              {userPets.length > 0 ? (
                <View style={styles.stepCardWrap}>
                  <Text style={styles.stepCardTitle}>1. SELECT COMPANION BEING TREATED</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.petScrollRow}
                  >
                    {userPets.map((p) => {
                      const isSelected = p.id === (activePet?.id || '');
                      const pAvatar = getPetAvatarSource(p.avatarId, p.species, p.photoUrl, p.name);
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => {
                            haptic.light();
                            setSelectedPetId(p.id);
                          }}
                          style={[
                            styles.petSelectorPill,
                            isSelected && styles.petSelectorPillActive,
                          ]}
                        >
                          <Image source={pAvatar} style={styles.petPillImg} resizeMode="contain" />
                          <Text
                            style={[
                              styles.petPillText,
                              isSelected && styles.petPillTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {p.name}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={14} color="#0D9488" />
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {/* Step 2: Select Service Received */}
              <View style={styles.serviceSelectorWrap}>
                <Text style={styles.stepCardTitle}>2. SERVICE RECEIVED ON-SITE</Text>
                <View style={styles.serviceButtonsRow}>
                  {(
                    [
                      { id: 'vaccination', label: 'Vaccine', icon: 'shield-checkmark' },
                      { id: 'consultation', label: 'Clinical Care', icon: 'medical' },
                      { id: 'spay-neuter', label: 'Kapon', icon: 'cut' },
                    ] as const
                  )
                    .filter((opt) => outreachInfo.servicesOffered.includes(opt.id))
                    .map((opt) => (
                      <Pressable
                        key={opt.id}
                        onPress={() => {
                          haptic.light();
                          setSelectedService(opt.id);
                        }}
                        style={[
                          styles.serviceSelectBtn,
                          selectedService === opt.id && styles.serviceSelectBtnActive,
                        ]}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={13}
                          color={selectedService === opt.id ? '#FFFFFF' : '#94A3B8'}
                        />
                        <Text
                          style={[
                            styles.serviceSelectBtnText,
                            selectedService === opt.id && styles.serviceSelectBtnTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              </View>

              {/* Scanner Frame Viewfinder */}
              <View style={styles.viewfinderContainer}>
                <View style={styles.viewfinderFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />

                  {isProcessing && (
                    <View style={styles.processingOverlay}>
                      <ActivityIndicator size="large" color="#0D9488" />
                      <Text style={styles.processingText}>Verifying Admin Outreach QR...</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.viewfinderInstructions}>
                  Align the Admin's or Veterinarian's Outreach QR inside frame
                </Text>
                <Text style={styles.viewfinderSub}>
                  Official CVO verification for Barangay {outreachInfo.barangay}
                </Text>
              </View>

              {/* Error Banner */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={17} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Bottom Test / Simulator Button */}
              <View style={styles.bottomActions}>
                <Pressable
                  onPress={handleSimulateAdminQr}
                  disabled={isProcessing}
                  style={({ pressed }) => [
                    styles.simulateBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Simulate Admin QR"
                >
                  <MaterialCommunityIcons name="qrcode-scan" size={16} color="#FFFFFF" />
                  <Text style={styles.simulateBtnText}>
                    ⚡ Test Scan Admin QR (Simulate On-Site Record)
                  </Text>
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
    backgroundColor: 'rgba(7, 30, 38, 0.52)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    color: 'rgba(255, 255, 255, 0.85)',
  },
  stepCardWrap: {
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    marginHorizontal: 16,
    marginTop: 6,
    padding: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 8,
  },
  stepCardTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  petScrollRow: {
    gap: 8,
  },
  petSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  petSelectorPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0D9488',
  },
  petPillImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  petPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  petPillTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  serviceSelectorWrap: {
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    marginHorizontal: 16,
    marginTop: 6,
    padding: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 8,
  },
  serviceButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  serviceSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  serviceSelectBtnActive: {
    backgroundColor: '#0D9488',
    borderColor: '#5EEAD4',
  },
  serviceSelectBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  serviceSelectBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  viewfinderFrame: {
    width: 230,
    height: 230,
    borderRadius: 18,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#0D9488',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 30, 38, 0.85)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12,
  },
  viewfinderInstructions: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12.5,
    marginTop: 14,
    textAlign: 'center',
  },
  viewfinderSub: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  errorText: {
    ...typography.caption,
    color: '#B91C1C',
    fontSize: 12,
    flex: 1,
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    paddingVertical: 12,
    borderRadius: radius.pill,
    ...shadows.md,
  },
  simulateBtnText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: typography.font.bold,
  },
});
