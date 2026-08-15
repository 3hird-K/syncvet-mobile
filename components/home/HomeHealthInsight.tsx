import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';

export function HomeHealthInsight() {
  return (
    <Animated.View entering={FadeInDown.delay(220).duration(260)} style={styles.container}>
      <View style={[styles.card, shadows.sm]}>
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>VETERINARY INSIGHT</Text>
          </View>
        </View>

        <Text style={styles.title}>Annual Rabies Protection</Text>
        <Text style={styles.body}>
          Rabies is 100% preventable with timely vaccination. City Veterinary Office provides free anti-rabies immunizations for dogs and cats aged 3 months and older.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.10)',
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10, 110, 100, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
  },
  badgeText: {
    ...typography.captionBold,
    fontSize: 10,
    fontFamily: typography.font.bold,
    color: colors.primaryDark,
    letterSpacing: 0.6,
  },
  title: {
    ...typography.title,
    fontSize: 14.5,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  body: {
    ...typography.small,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
});
