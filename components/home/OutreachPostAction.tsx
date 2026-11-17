import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { formatDateWithYear } from '@lib/format';
import type {
  OutreachDetails,
  OutreachServiceType,
} from '@services/outreach/outreachService';

interface OutreachPostActionProps {
  outreachInfo: OutreachDetails;
  onScanPress: () => void;
}

type StatusTone = 'live' | 'upcoming' | 'expired';

const SERVICE_LABELS: Record<OutreachServiceType, string> = {
  vaccination: 'Vaccination',
  consultation: 'Consultation',
  'spay-neuter': 'Spay / Neuter',
};

const STATUS_COPY: Record<StatusTone, string> = {
  live: 'ON-SITE TODAY',
  upcoming: 'UPCOMING VISIT',
  expired: 'VISIT CONCLUDED',
};

const TONES: Record<StatusTone, { dot: string; text: string; pillBg: string }> = {
  live: {
    dot: colors.success,
    text: colors.primaryStrong,
    pillBg: colors.primaryLight,
  },
  upcoming: {
    dot: colors.warning,
    text: colors.accentDark,
    pillBg: colors.accentLight,
  },
  expired: {
    dot: '#94A3B8',
    text: '#475569',
    pillBg: '#F1F5F9',
  },
};

export function OutreachPostAction({ outreachInfo, onScanPress }: OutreachPostActionProps) {
  const tone: StatusTone =
    outreachInfo.availability === 'expired'
      ? 'expired'
      : outreachInfo.availability === 'upcoming'
        ? 'upcoming'
        : 'live';

  const palette = TONES[tone];
  const isExpired = tone === 'expired';
  const location = [outreachInfo.barangay ? `Brgy. ${outreachInfo.barangay}` : null, outreachInfo.venue]
    .filter(Boolean)
    .join(' · ');
  const detailLine = [formatDateWithYear(outreachInfo.date), outreachInfo.time, location]
    .filter(Boolean)
    .join('  ·  ');
  const purpose = outreachInfo.servicesOffered
    .map((service) => SERVICE_LABELS[service])
    .join(' · ');

  const handlePress = () => {
    if (!outreachInfo.canScanQr) return;
    haptic.medium();
    onScanPress();
  };

  return (
    <View style={styles.section}>
      <View style={styles.copy}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
          <Text style={[styles.statusText, { color: palette.text }]}>{STATUS_COPY[tone]}</Text>
          <Text style={styles.opId}>· {outreachInfo.opId}</Text>
        </View>

        {purpose ? (
          <View style={styles.purposeRow}>
            <Ionicons name="medical" size={12} color={palette.text} />
            <Text style={[styles.purposeText, { color: palette.text }]} numberOfLines={1}>
              For: {purpose}
            </Text>
          </View>
        ) : null}

        <Text style={styles.detailLine} numberOfLines={2}>
          {detailLine}
        </Text>
      </View>

      {outreachInfo.canScanQr ? (
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [styles.qrButton, pressed && styles.qrButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Scan the CVO outreach station QR for ${location}`}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={15} color={colors.white} />
          <Text style={styles.qrButtonText}>Scan QR</Text>
        </Pressable>
      ) : (
        <View
          style={[styles.inactivePill, { backgroundColor: palette.pillBg }]}
          accessibilityLabel={
            isExpired
              ? `Outreach concluded on ${formatDateWithYear(outreachInfo.date)}`
              : `Outreach scheduled on ${formatDateWithYear(outreachInfo.date)}`
          }
        >
          <Ionicons
            name={isExpired ? 'checkmark-done-circle-outline' : 'calendar-outline'}
            size={13}
            color={palette.text}
          />
          <Text style={[styles.inactiveText, { color: palette.text }]}>
            {isExpired ? 'Closed' : 'Scheduled'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginTop: 2,
    paddingTop: 9,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontFamily: typography.font.bold,
    letterSpacing: 0.6,
  },
  opId: {
    fontSize: 10,
    fontFamily: typography.font.medium,
    color: colors.textMuted,
  },
  purposeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  purposeText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: typography.font.bold,
  },
  detailLine: {
    fontSize: 12,
    fontFamily: typography.font.medium,
    color: colors.textSecondary,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  qrButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  qrButtonText: {
    fontSize: 12,
    fontFamily: typography.font.bold,
    color: colors.white,
  },
  inactivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  inactiveText: {
    fontSize: 11.5,
    fontFamily: typography.font.bold,
  },
});
