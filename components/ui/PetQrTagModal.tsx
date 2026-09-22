import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { Avatar } from '@components/ui/Avatar';
import { getPetAvatarSource } from '@lib/petAvatars';
import { toast } from '@components/ui/Sonner';
import {
  buildPetTagString,
  generateTagId,
  downloadPetTag,
} from '@lib/petQrTag';
import type { Pet } from '@services/data';

interface PetQrTagModalProps {
  visible: boolean;
  onClose: () => void;
  pet: Pet | null;
  owner: {
    id?: string;
    fullName?: string;
    mobileNumber?: string;
    address?: string;
  };
}

export function PetQrTagModal({
  visible,
  onClose,
  pet,
  owner,
}: PetQrTagModalProps) {
  const qrRef = useRef<any>(null);
  const [downloading, setDownloading] = useState(false);
  const screenHeight = Dimensions.get('window').height;

  // Handle hardware back button on Android
  React.useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!pet) return null;

  const tagId = generateTagId(pet.id);
  const qrString = buildPetTagString(pet, owner);

  const handleDownload = async () => {
    try {
      haptic.medium();
      setDownloading(true);
      const res = await downloadPetTag(qrRef.current, pet.name);
      if (res.success) {
        toast.success('Pet Tag Saved', {
          description: 'Tag image saved to your device.',
        });
      } else if (res.error) {
        toast.error('Download Note', { description: res.error });
      }
    } catch (err: any) {
      toast.error('Could not save tag', { description: err?.message || 'Try again.' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Tap backdrop to dismiss */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* 3/4 Height Full-Width Sheet Container */}
        <View style={[styles.sheetContainer, { height: Math.round(screenHeight * 0.75) }]}>
          {/* Subtle Pull Indicator */}
          <View style={styles.pullIndicatorRow}>
            <View style={styles.pullIndicator} />
          </View>

          {/* Top Header Bar */}
          <View style={styles.headerBar}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.navCloseBtn,
                pressed && styles.btnPressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close Tag"
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Digital Pet Tag
              </Text>
            </View>

            <Pressable
              onPress={handleDownload}
              disabled={downloading}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.btnPressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Save Tag Image"
            >
              {downloading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={15} color={colors.white} />
                  <Text style={styles.saveBtnText}>Save</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Direct Content Display (No Inner Box / No Container) */}
          <View style={styles.contentWrap}>
            {/* Pet Profile Header */}
            <View style={styles.petHeaderRow}>
              <Avatar
                name={pet.name}
                size={48}
                photoUrl={
                  pet.photoUrl ||
                  (pet.avatarId ? getPetAvatarSource(pet.avatarId) : undefined)
                }
                icon="paw"
              />
              <View style={styles.petTextWrap}>
                <View style={styles.nameRow}>
                  <Text style={styles.petName} numberOfLines={1}>
                    {pet.name}
                  </Text>
                  <View style={styles.tagIdBadge}>
                    <Text style={styles.tagIdText}>{tagId}</Text>
                  </View>
                </View>
                <Text style={styles.petMetaText} numberOfLines={1}>
                  {pet.breed || (pet.species === 'dog' ? 'Dog' : 'Cat')} · {pet.species.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* QR Code Canvas */}
            <View style={styles.qrCanvasWrap}>
              <QRCode
                value={qrString}
                size={185}
                color={colors.textPrimary}
                backgroundColor={colors.surface}
                getRef={(c) => (qrRef.current = c)}
              />
              <Text style={styles.scanHint}>
                Scan to identify pet and contact owner
              </Text>
            </View>

            {/* Thin Divider */}
            <View style={styles.divider} />

            {/* Owner & Contact Details */}
            <View style={styles.contactRow}>
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>OWNER</Text>
                <Text style={styles.contactValue} numberOfLines={1}>
                  {owner.fullName || 'SyncVet Resident'}
                </Text>
              </View>

              <View style={styles.contactDivider} />

              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>CONTACT</Text>
                <Text style={styles.contactValue} numberOfLines={1}>
                  {owner.mobileNumber || 'N/A'}
                </Text>
              </View>
            </View>

            {/* Status Pill Footer */}
            <View style={styles.cardFooter}>
              <View
                style={[
                  styles.statusPill,
                  pet.isVaccinated ? styles.statusPillProtected : styles.statusPillDue,
                ]}
              >
                <Ionicons
                  name={pet.isVaccinated ? 'shield-checkmark' : 'alert-circle'}
                  size={12}
                  color={pet.isVaccinated ? '#059669' : '#D97706'}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    pet.isVaccinated ? styles.statusTextProtected : styles.statusTextDue,
                  ]}
                >
                  {pet.isVaccinated ? 'Anti-Rabies Protected' : 'Vaccine Due'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 38, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    ...shadows.lg,
  },
  pullIndicatorRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  pullIndicator: {
    width: 38,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(7, 30, 38, 0.14)',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(7, 30, 38, 0.08)',
  },
  navCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(7, 30, 38, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.heading3,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  saveBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  petHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  petTextWrap: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  petName: {
    ...typography.heading3,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  tagIdBadge: {
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.20)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  tagIdText: {
    ...typography.captionBold,
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.3,
  },
  petMetaText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  qrCanvasWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  scanHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(7, 30, 38, 0.08)',
    marginVertical: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  contactItem: {
    flex: 1,
    gap: 1.5,
  },
  contactDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(7, 30, 38, 0.08)',
    marginHorizontal: 12,
  },
  contactLabel: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  contactValue: {
    ...typography.bodyMedium,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardFooter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusPillProtected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusPillDue: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusPillText: {
    ...typography.captionBold,
    fontSize: 10.5,
    fontWeight: '600',
  },
  statusTextProtected: {
    color: '#059669',
  },
  statusTextDue: {
    color: '#D97706',
  },
});
