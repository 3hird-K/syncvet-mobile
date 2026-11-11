import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import type { OutreachDetails } from '@services/outreach/outreachService';

interface OutreachPostActionProps {
  outreachInfo: OutreachDetails;
  onScanPress: () => void;
}

export function OutreachPostAction({ outreachInfo, onScanPress }: OutreachPostActionProps) {
  const handlePress = () => {
    haptic.medium();
    onScanPress();
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Row: Official Badge & Op ID */}
      <View style={styles.topRow}>
        <View style={styles.liveBadge}>
          <View style={styles.pulsingDot} />
          <Text style={styles.liveBadgeText}>BARANGAY OUTREACH STATION</Text>
        </View>

        <View style={styles.opIdPill}>
          <Text style={styles.opIdPillText}>{outreachInfo.opId}</Text>
        </View>
      </View>

      {/* 2. Venue & Attending Vet Details */}
      <View style={styles.infoCol}>
        <View style={styles.venueRow}>
          <Ionicons name="location-sharp" size={14} color="#0D9488" />
          <Text style={styles.venueText} numberOfLines={1}>
            Brgy. {outreachInfo.barangay} • {outreachInfo.venue}
          </Text>
        </View>

        <Text style={styles.vetSubtext} numberOfLines={1}>
          Attending: {outreachInfo.attendingVet}
        </Text>
      </View>

      {/* 3. Services Offered Tags */}
      <View style={styles.servicesRow}>
        {outreachInfo.servicesOffered.map((srv) => {
          const label =
            srv === 'vaccination'
              ? 'Anti-Rabies Vaccine'
              : srv === 'consultation'
              ? 'Clinical Exam'
              : 'Spay & Neuter';
          return (
            <View key={srv} style={styles.serviceChip}>
              <Ionicons
                name={
                  srv === 'vaccination'
                    ? 'shield-checkmark'
                    : srv === 'consultation'
                    ? 'medical'
                    : 'cut'
                }
                size={11}
                color="#065F46"
              />
              <Text style={styles.serviceChipText}>{label}</Text>
            </View>
          );
        })}
      </View>

      {/* 4. Action Button: Scan Admin Outreach QR */}
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.scanBtn,
          pressed && styles.scanBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Scan Admin Outreach QR for Barangay ${outreachInfo.barangay}`}
      >
        <MaterialCommunityIcons name="qrcode-scan" size={17} color="#FFFFFF" />
        <View style={styles.scanBtnTextCol}>
          <Text style={styles.scanBtnTitle}>Scan Admin Outreach QR</Text>
          <Text style={styles.scanBtnSubtitle}>
            Record vaccination, consultation or kapon on-site
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  liveBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  opIdPill: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  opIdPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#047857',
    fontFamily: typography.font.bold,
  },
  infoCol: {
    gap: 2,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  venueText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#064E3B',
    flex: 1,
  },
  vetSubtext: {
    fontSize: 12,
    color: '#047857',
    marginLeft: 19,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  serviceChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0D9488',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  scanBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  scanBtnTextCol: {
    flex: 1,
  },
  scanBtnTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scanBtnSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 1,
  },
});

