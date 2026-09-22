import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { getPetAvatarSource } from '@lib/petAvatars';
import { Button } from '@components/ui/Button';
import { Avatar } from '@components/ui/Avatar';
import {
  parsePetTagPayload,
  CVO_HOTLINE,
  CVO_HOTLINE_DISPLAY,
  type PetTagPayload,
} from '@lib/petQrTag';

interface PetQrScannerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PetQrScannerModal({ visible, onClose }: PetQrScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scannedRecord, setScannedRecord] = useState<PetTagPayload | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const isScanningRef = useRef(true);

  // Reset scanner state when modal opens
  useEffect(() => {
    if (visible) {
      setScannedRecord(null);
      setScanError(null);
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

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!isScanningRef.current || scannedRecord) return;
      isScanningRef.current = false;

      haptic.medium();
      const parsed = parsePetTagPayload(data);

      if (parsed) {
        haptic.success();
        setScannedRecord(parsed);
        setScanError(null);
      } else {
        haptic.warning();
        setScanError('This QR code is not an official SyncVet Pet Tag.');
      }
    },
    [scannedRecord],
  );

  const handleScanAgain = () => {
    haptic.light();
    setScannedRecord(null);
    setScanError(null);
    isScanningRef.current = true;
  };

  const handleCallOwner = (phone: string) => {
    if (!phone) return;
    haptic.light();
    void Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {});
  };

  const handleSmsOwner = (phone: string) => {
    if (!phone) return;
    haptic.light();
    void Linking.openURL(`sms:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {});
  };

  const handleCallCVO = () => {
    haptic.light();
    void Linking.openURL(`tel:${CVO_HOTLINE}`).catch(() => {});
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Permission Check */}
        {!permission?.granted ? (
          <SafeAreaView style={styles.permissionContainer}>
            <View style={styles.permissionCard}>
              <View style={styles.permissionIconWrap}>
                <Ionicons name="camera-outline" size={36} color={colors.primary} />
              </View>
              <Text style={styles.permissionTitle}>Camera Permission Required</Text>
              <Text style={styles.permissionSub}>
                SyncVet needs camera access to scan pet digital tags, read official credentials,
                and contact registered owners.
              </Text>

              <View style={styles.permissionActions}>
                <Button
                  title="Allow Camera Access"
                  variant="primary"
                  onPress={requestPermission}
                  fullWidth
                />
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={onClose}
                  fullWidth
                />
              </View>
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
              onBarcodeScanned={scannedRecord ? undefined : handleBarcodeScanned}
            />

            {/* Dark Mask & Viewfinder */}
            <SafeAreaView style={styles.overlayRoot}>
              {/* Header Bar */}
              <View style={styles.topBar}>
                <Pressable
                  onPress={onClose}
                  style={styles.circleBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close scanner"
                >
                  <Ionicons name="close" size={22} color={colors.white} />
                </Pressable>

                <View style={styles.topTitleBox}>
                  <Text style={styles.topTitle}>Scan Pet Tag</Text>
                  <Text style={styles.topSub}>Align QR code inside box</Text>
                </View>

                <Pressable
                  onPress={() => {
                    haptic.light();
                    setTorch((prev) => !prev);
                  }}
                  style={[styles.circleBtn, torch && styles.circleBtnActive]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle flashlight"
                >
                  <Ionicons
                    name={torch ? 'flash' : 'flash-outline'}
                    size={20}
                    color={torch ? colors.primary : colors.white}
                  />
                </Pressable>
              </View>

              {/* Viewfinder Target */}
              <View style={styles.viewfinderCenter}>
                <View style={styles.viewfinderBox}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  {/* Scanning Laser Line */}
                  {!scannedRecord && <View style={styles.laserLine} />}
                </View>
                <Text style={styles.helperText}>
                  Point at official collar tag or digital pet ID
                </Text>
              </View>

              {/* Unrecognized Code Alert */}
              {scanError && !scannedRecord && (
                <View style={[styles.errorSheet, shadows.md]}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                  <Text style={styles.errorText}>{scanError}</Text>
                  <Button
                    title="Scan Again"
                    variant="outline"
                    size="sm"
                    onPress={handleScanAgain}
                  />
                </View>
              )}

              {/* Scanned Verified Record Sheet */}
              {scannedRecord && (
                <View style={[styles.resultSheet, shadows.lg]}>
                  <View style={styles.resultGovBadge}>
                    <Ionicons name="shield-checkmark" size={13} color={colors.success} />
                    <Text style={styles.resultGovBadgeText}>
                      VERIFIED PET · {scannedRecord.tagId}
                    </Text>
                  </View>

                  {/* Pet Row */}
                  <View style={styles.resultPetRow}>
                    <Avatar
                      name={scannedRecord.pet.name}
                      size={54}
                      photoUrl={
                        scannedRecord.pet.photoUrl ||
                        (scannedRecord.pet.avatarId
                          ? getPetAvatarSource(scannedRecord.pet.avatarId)
                          : undefined)
                      }
                      icon="paw"
                    />
                    <View style={styles.resultPetInfo}>
                      <Text style={styles.resultPetName}>{scannedRecord.pet.name}</Text>
                      <Text style={styles.resultPetMeta}>
                        {scannedRecord.pet.species.toUpperCase()}
                        {scannedRecord.pet.breed ? ` · ${scannedRecord.pet.breed}` : ''}
                        {scannedRecord.pet.gender
                          ? ` · ${scannedRecord.pet.gender.toUpperCase()}`
                          : ''}
                      </Text>
                      <View
                        style={[
                          styles.vaxPill,
                          {
                            backgroundColor: scannedRecord.pet.isVaccinated
                              ? 'rgba(16, 185, 129, 0.12)'
                              : 'rgba(239, 68, 68, 0.10)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            scannedRecord.pet.isVaccinated
                              ? 'shield-checkmark'
                              : 'alert-circle'
                          }
                          size={11}
                          color={
                            scannedRecord.pet.isVaccinated ? colors.success : colors.error
                          }
                        />
                        <Text
                          style={[
                            styles.vaxPillText,
                            {
                              color: scannedRecord.pet.isVaccinated
                                ? colors.success
                                : colors.error,
                            },
                          ]}
                        >
                          {scannedRecord.pet.isVaccinated
                            ? 'Rabies Vaccinated (CVO Record)'
                            : 'Unvaccinated'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Owner Contact Information */}
                  <View style={styles.ownerBox}>
                    <Text style={styles.ownerBoxTitle}>Owner Information</Text>
                    <View style={styles.ownerBoxRow}>
                      <Ionicons name="person" size={13} color={colors.primary} />
                      <Text style={styles.ownerBoxText}>{scannedRecord.owner.name}</Text>
                    </View>

                    {scannedRecord.owner.phone ? (
                      <View style={styles.ownerBoxRow}>
                        <Ionicons name="call" size={13} color={colors.primary} />
                        <Text style={styles.ownerBoxText}>{scannedRecord.owner.phone}</Text>
                      </View>
                    ) : null}

                    {scannedRecord.owner.address ? (
                      <View style={styles.ownerBoxRow}>
                        <Ionicons name="location" size={13} color={colors.primary} />
                        <Text style={styles.ownerBoxText} numberOfLines={2}>
                          {scannedRecord.owner.address}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Contact Action Buttons */}
                  <View style={styles.contactActionsRow}>
                    {scannedRecord.owner.phone ? (
                      <>
                        <Pressable
                          style={[styles.contactBtn, styles.callBtn]}
                          onPress={() => handleCallOwner(scannedRecord.owner.phone)}
                        >
                          <Ionicons name="call" size={15} color={colors.white} />
                          <Text style={styles.contactBtnText}>Call Owner</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.contactBtn, styles.smsBtn]}
                          onPress={() => handleSmsOwner(scannedRecord.owner.phone)}
                        >
                          <Ionicons name="chatbubble" size={15} color={colors.primaryDark} />
                          <Text style={[styles.contactBtnText, { color: colors.primaryDark }]}>
                            SMS Owner
                          </Text>
                        </Pressable>
                      </>
                    ) : null}

                    <Pressable
                      style={[styles.contactBtn, styles.cvoBtn]}
                      onPress={handleCallCVO}
                    >
                      <Ionicons name="business" size={15} color={colors.textSecondary} />
                      <Text style={[styles.contactBtnText, { color: colors.textSecondary }]}>
                        Call CVO
                      </Text>
                    </Pressable>
                  </View>

                  {/* Scan Another Button */}
                  <Button
                    title="Scan Another Tag"
                    variant="outline"
                    size="sm"
                    onPress={handleScanAgain}
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}
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
    backgroundColor: colors.black,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  permissionCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.xxl,
    alignItems: 'center',
    ...shadows.md,
    maxWidth: 360,
    width: '100%',
  },
  permissionIconWrap: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  permissionTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  permissionSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  permissionActions: {
    width: '100%',
    gap: spacing.sm,
  },
  overlayRoot: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnActive: {
    backgroundColor: colors.white,
  },
  topTitleBox: {
    alignItems: 'center',
  },
  topTitle: {
    ...typography.heading3,
    color: colors.white,
    fontSize: 17,
  },
  topSub: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
  },
  viewfinderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderBox: {
    width: 250,
    height: 250,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.lg,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: radius.md,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: radius.md,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: radius.md,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: radius.md,
  },
  laserLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  helperText: {
    ...typography.caption,
    color: colors.white,
    marginTop: spacing.md,
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.50)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  errorSheet: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.xl,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 12.5,
    textAlign: 'center',
  },
  resultSheet: {
    marginHorizontal: spacing.md,
    marginBottom: Platform.OS === 'ios' ? spacing.sm : spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.xxl,
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },
  resultGovBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  resultGovBadgeText: {
    ...typography.captionBold,
    color: colors.success,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  resultPetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  resultPetInfo: {
    flex: 1,
  },
  resultPetName: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  resultPetMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  vaxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  vaxPillText: {
    ...typography.captionBold,
    fontSize: 9.5,
  },
  ownerBox: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: 4,
    marginBottom: spacing.sm,
  },
  ownerBoxTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  ownerBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerBoxText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 12,
    flex: 1,
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  callBtn: {
    backgroundColor: colors.primary,
  },
  smsBtn: {
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
  },
  cvoBtn: {
    backgroundColor: 'rgba(7, 30, 38, 0.06)',
  },
  contactBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 11.5,
  },
});
