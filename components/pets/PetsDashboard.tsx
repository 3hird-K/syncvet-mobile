import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';

interface PetsDashboardProps {
  totalCount: number;
  dogCount: number;
  catCount: number;
  needsVaccineCount: number;
}

export function PetsDashboard({
  totalCount,
  dogCount,
  catCount,
  needsVaccineCount,
}: PetsDashboardProps) {
  if (totalCount === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(50).duration(260)} style={styles.container}>
      <View style={[styles.card, shadows.sm]}>
        {/* Compliance Status Banner */}
        <View style={styles.complianceRow}>
          <View
            style={[
              styles.complianceIconRing,
              needsVaccineCount === 0 ? styles.ringGreen : styles.ringAmber,
            ]}
          >
            <Ionicons
              name={needsVaccineCount === 0 ? 'shield-checkmark' : 'alert-circle'}
              size={18}
              color={needsVaccineCount === 0 ? colors.success : colors.warning}
            />
          </View>
          <View style={styles.complianceTextCol}>
            <Text style={styles.complianceTitle}>
              {needsVaccineCount === 0
                ? '100% Immunization Protected'
                : `${needsVaccineCount} ${needsVaccineCount === 1 ? 'Pet Needs' : 'Pets Need'} Anti-Rabies`}
            </Text>
            <Text style={styles.complianceSub}>
              {needsVaccineCount === 0
                ? 'All registered pets have up-to-date rabies protection.'
                : 'Free rabies vaccines available under City Ordinance.'}
            </Text>
          </View>
        </View>

        {/* Micro-Stats Segmented Grid */}
        <View style={styles.metricsRow}>
          <View style={styles.metricSegment}>
            <Text style={styles.metricNumber}>{totalCount}</Text>
            <Text style={styles.metricLabel}>Total</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricSegment}>
            <Text style={styles.metricNumber}>{dogCount}</Text>
            <Text style={styles.metricLabel}>Dogs</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricSegment}>
            <Text style={styles.metricNumber}>{catCount}</Text>
            <Text style={styles.metricLabel}>Cats</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricSegment}>
            <Text
              style={[
                styles.metricNumber,
                needsVaccineCount > 0 ? styles.textAmber : styles.textGreen,
              ]}
            >
              {needsVaccineCount}
            </Text>
            <Text style={styles.metricLabel}>Due</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.10)',
    gap: 12,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  complianceIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  ringAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  complianceTextCol: {
    flex: 1,
    gap: 1,
  },
  complianceTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: typography.font.bold,
  },
  complianceSub: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(7, 30, 38, 0.025)',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.04)',
  },
  metricSegment: {
    alignItems: 'center',
    flex: 1,
    gap: 1,
  },
  metricNumber: {
    ...typography.heading3,
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: typography.font.bold,
  },
  metricLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(7, 30, 38, 0.08)',
  },
  textAmber: {
    color: colors.warning,
  },
  textGreen: {
    color: colors.success,
  },
});
