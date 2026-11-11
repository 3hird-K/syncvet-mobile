import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, typography } from '@theme';
import { formatDateWithYear } from '@lib/format';
import { getPetAvatarSource } from '@lib/petAvatars';
import { Button } from '@components/ui/Button';
import type { OutreachRecordResult } from '@services/outreach/outreachService';

interface OutreachSuccessReceiptModalProps {
  visible: boolean;
  result: OutreachRecordResult | null;
  onClose: () => void;
}

export function OutreachSuccessReceiptModal({
  visible,
  result,
  onClose,
}: OutreachSuccessReceiptModalProps) {
  const router = useRouter();

  if (!visible || !result) return null;

  const { pet, service, serviceTitle, outreachInfo, recordNo, administeredDate, nextDueDate } =
    result;
  const isDog = pet.species?.toLowerCase() === 'dog';
  const avatarSource = getPetAvatarSource(pet.avatarId, pet.species, pet.photoUrl, pet.name);

  const handleGoToPassport = () => {
    onClose();
    router.push({
      pathname: '/pets',
      params: { id: pet.id },
    } as never);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.receiptCard, shadows.lg]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Top Seal & Heading */}
            <View style={styles.headerArea}>
              <Image
                source={require('@assets/cvo-seal.png')}
                style={styles.sealImg}
                resizeMode="contain"
              />
              <Text style={styles.headerOffice}>CITY VETERINARY OFFICE</Text>
              <Text style={styles.headerCity}>CAGAYAN DE ORO CITY • OUTREACH DESK</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.verifiedBadgeText}>OFFICIAL FIELD SERVICE RECORDED</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Patient Pet Info */}
            <View style={styles.patientRow}>
              <Image source={avatarSource} style={styles.petAvatarImg} resizeMode="contain" />
              <View style={styles.patientMeta}>
                <Text style={styles.petName} numberOfLines={1}>
                  {pet.name}
                </Text>
                <Text style={styles.petSpeciesBreed}>
                  {isDog ? 'Canine' : 'Feline'} • {pet.breed || 'Companion Pet'}
                </Text>
                <View style={styles.tagIdBadge}>
                  <Text style={styles.tagIdText}>Tag ID: #{pet.id ? pet.id.slice(0, 10) : 'CVO-PET'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Service & Operational Details */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service Rendered:</Text>
                <Text style={styles.detailValuePrimary}>{serviceTitle}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Operation ID:</Text>
                <Text style={styles.detailValue}>{outreachInfo.opId}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Outreach Venue:</Text>
                <Text style={styles.detailValue}>
                  Brgy. {outreachInfo.barangay} • {outreachInfo.venue}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date Administered:</Text>
                <Text style={styles.detailValue}>{formatDateWithYear(administeredDate)}</Text>
              </View>

              {nextDueDate ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Next Due Date:</Text>
                  <Text style={[styles.detailValue, { color: '#059669', fontWeight: '700' }]}>
                    {formatDateWithYear(nextDueDate)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Attending Vet / Admin:</Text>
                <Text style={styles.detailValue}>{outreachInfo.attendingVet}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Official Record No:</Text>
                <Text style={[styles.detailValue, styles.recordNoText]}>{recordNo}</Text>
              </View>
            </View>

            {/* Bottom Official Guarantee */}
            <View style={styles.noticeBox}>
              <Ionicons name="shield-checkmark" size={14} color="#0D9488" />
              <Text style={styles.noticeText}>
                This official municipal record has been registered in SyncVet and linked to your pet's Digital Passport and Visit History.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Button
                variant="primary"
                title="View in Pet Passport"
                onPress={handleGoToPassport}
                style={styles.passportBtn}
              />
              <Button
                variant="secondary"
                title="Done"
                onPress={onClose}
                style={styles.doneBtn}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 38, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiptCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  headerArea: {
    alignItems: 'center',
    gap: 3,
  },
  sealImg: {
    width: 58,
    height: 58,
    marginBottom: 4,
  },
  headerOffice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  headerCity: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  petAvatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
  },
  patientMeta: {
    flex: 1,
    gap: 2,
  },
  petName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  petSpeciesBreed: {
    fontSize: 12.5,
    color: '#64748B',
  },
  tagIdBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  tagIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  detailsGrid: {
    gap: 8,
    backgroundColor: '#FAFCFC',
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12.5,
    color: '#1E293B',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  detailValuePrimary: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '800',
    textAlign: 'right',
    flex: 1,
  },
  recordNoText: {
    fontFamily: typography.font.bold,
    color: '#475569',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDFA',
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  noticeText: {
    fontSize: 11.5,
    color: '#0F766E',
    lineHeight: 16,
    flex: 1,
  },
  actionsRow: {
    gap: 8,
    marginTop: 6,
  },
  passportBtn: {
    backgroundColor: '#0D9488',
    width: '100%',
  },
  doneBtn: {
    width: '100%',
  },
});

