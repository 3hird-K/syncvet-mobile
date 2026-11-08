import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';

const STORAGE_KEY = '@syncvet_care_cards_visible';

export function HomeCareActionCards() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [procedureModalVisible, setProcedureModalVisible] = useState(false);

  // Restore saved hide/show preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved !== null) {
          setVisible(saved === 'true');
        }
      })
      .catch(() => {});
  }, []);

  const toggleVisibility = (newVal: boolean) => {
    haptic.light();
    setVisible(newVal);
    AsyncStorage.setItem(STORAGE_KEY, String(newVal)).catch(() => {});
  };

  const handleRequestClinicalCare = () => {
    haptic.light();
    // Request Clinical Care routes directly to Consultation
    router.push({
      pathname: '/appointments/new',
      params: { serviceId: 'consultation' },
    } as never);
  };

  const handleProcedureSelect = (serviceId: 'vaccination' | 'spay-neuter') => {
    haptic.light();
    setProcedureModalVisible(false);
    router.push({
      pathname: '/appointments/new',
      params: { serviceId },
    } as never);
  };

  // If collapsed/hidden: show compact strip with 'Show' toggle
  if (!visible) {
    return (
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show care services"
          onPress={() => toggleVisibility(true)}
          style={({ pressed }) => [
            styles.collapsedStrip,
            pressed && styles.collapsedStripPressed,
          ]}
        >
          <View style={styles.collapsedLeft}>
            <View style={styles.collapsedIconBox}>
              <Ionicons name="medkit-outline" size={15} color="#0D9488" />
            </View>
            <Text style={styles.collapsedTitle}>Request Care & Procedures</Text>
          </View>

          <View style={styles.showPill}>
            <Text style={styles.showPillText}>Show</Text>
            <Ionicons name="chevron-down" size={13} color="#0D9488" />
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // If expanded/visible: show toggle bar with 'Hide' + the 2 care cards
  return (
    <Animated.View entering={FadeInDown.delay(90).duration(260)} style={styles.container}>
      {/* Header bar with Hide button */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <Ionicons name="medkit" size={12} color="#0D9488" />
          <Text style={styles.toggleLabel}>CARE ACTIONS</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hide care cards"
          onPress={() => toggleVisibility(false)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.hideBtn,
            pressed && styles.hideBtnPressed,
          ]}
        >
          <Text style={styles.hideBtnText}>Hide</Text>
          <Ionicons name="chevron-up" size={12} color="#64748B" />
        </Pressable>
      </View>

      <View style={styles.row}>
        {/* Card 1: Request Clinical Care (Consultation) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Request Clinical Care"
          onPress={handleRequestClinicalCare}
          style={({ pressed }) => [
            styles.card,
            styles.careCard,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.iconBox, styles.careIconBox]}>
              <Ionicons name="medkit-outline" size={19} color="#0D9488" />
            </View>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
          </View>

          <View style={styles.cardTextContent}>
            <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              Request Clinical Care
            </Text>
            <Text style={styles.cardSubtext} numberOfLines={2}>
              Health check-up, symptom review & vitals
            </Text>
          </View>
        </Pressable>

        {/* Card 2: Schedule Procedure (Vaccination & Spay/Neuter) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Schedule Procedure"
          onPress={() => {
            haptic.light();
            setProcedureModalVisible(true);
          }}
          style={({ pressed }) => [
            styles.card,
            styles.procedureCard,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.iconBox, styles.procedureIconBox]}>
              <Ionicons name="calendar-outline" size={19} color="#2563EB" />
            </View>
            <View style={styles.quotaBadge}>
              <Text style={styles.quotaBadgeText}>QUOTAS</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
          </View>

          <View style={styles.cardTextContent}>
            <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              Schedule Procedure
            </Text>
            <Text style={styles.cardSubtext} numberOfLines={2}>
              Anti-Rabies vaccine or Kapon slot
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Procedure Selection Modal (Vaccination vs Spay/Neuter) */}
      <Modal
        visible={procedureModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProcedureModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setProcedureModalVisible(false)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderIcon}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Schedule Procedure</Text>
                <Text style={styles.sheetSubtitle}>
                  Select official City Veterinary Office municipal service
                </Text>
              </View>
              <Pressable
                onPress={() => setProcedureModalVisible(false)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Option 1: Vaccination */}
            <Pressable
              onPress={() => handleProcedureSelect('vaccination')}
              style={({ pressed }) => [
                styles.optionItem,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={[styles.optionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="shield-checkmark" size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>Anti-Rabies Vaccination</Text>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>FREE</Text>
                  </View>
                </View>
                <Text style={styles.optionDescription}>
                  Annual immunization against canine & feline rabies virus
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            {/* Option 2: Spay / Neuter (Kapon) */}
            <Pressable
              onPress={() => handleProcedureSelect('spay-neuter')}
              style={({ pressed }) => [
                styles.optionItem,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={[styles.optionIconBox, { backgroundColor: '#FAF5FF' }]}>
                <Ionicons name="cut" size={22} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>Spay & Neuter (Kapon)</Text>
                  <View style={styles.quotaBadge}>
                    <Text style={styles.quotaBadgeText}>QUOTA SLOTS</Text>
                  </View>
                </View>
                <Text style={styles.optionDescription}>
                  Surgical population control and health procedure by licensed vets
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '97%',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 4,
  },

  /* Collapsed Strip (when user selects 'Hide') */
  collapsedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...shadows.sm,
  },
  collapsedStripPressed: {
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.99 }],
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsedIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#E6F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedTitle: {
    fontFamily: typography.font.bold,
    fontSize: 12.5,
    color: '#0F172A',
  },
  showPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E6F5F2',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  showPillText: {
    fontFamily: typography.font.bold,
    fontSize: 11,
    color: '#0D9488',
  },

  /* Toggle Row (when visible) */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  toggleLabel: {
    fontFamily: typography.font.bold,
    fontSize: 11,
    color: '#0D9488',
    letterSpacing: 0.5,
  },
  hideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hideBtnPressed: {
    opacity: 0.7,
  },
  hideBtnText: {
    fontFamily: typography.font.medium,
    fontSize: 10.5,
    color: '#64748B',
  },

  /* Care Cards Row */
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 112,
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  careCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  procedureCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: '#F8FAFC',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  careIconBox: {
    backgroundColor: '#E6F5F2',
  },
  procedureIconBox: {
    backgroundColor: '#EFF6FF',
  },
  freeBadge: {
    marginLeft: 7,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  freeBadgeText: {
    fontFamily: typography.font.bold,
    fontSize: 9.5,
    color: '#047857',
    letterSpacing: 0.4,
  },
  quotaBadge: {
    marginLeft: 7,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  quotaBadgeText: {
    fontFamily: typography.font.bold,
    fontSize: 9.5,
    color: '#1D4ED8',
    letterSpacing: 0.4,
  },
  cardTextContent: {
    gap: 2,
  },
  cardTitle: {
    fontFamily: typography.font.bold,
    fontSize: 13.5,
    color: '#0F172A',
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  cardSubtext: {
    fontFamily: typography.font.regular,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },

  /* Bottom Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    ...shadows.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sheetHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E6F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontFamily: typography.font.bold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    fontFamily: typography.font.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },
  optionPressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.99 }],
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  optionTitle: {
    fontFamily: typography.font.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  optionDescription: {
    fontFamily: typography.font.regular,
    fontSize: 11.5,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
