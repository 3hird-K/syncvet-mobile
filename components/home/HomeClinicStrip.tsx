import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';

export function HomeClinicStrip() {
  const handleCallCVO = () => {
    haptic.light();
    void Linking.openURL('tel:0888572260').catch(() => {});
  };

  return (
    <Animated.View entering={FadeInDown.delay(260).duration(260)} style={styles.container}>
      <View style={[styles.stripCard, shadows.sm]}>
        <View style={styles.infoCol}>
          <View style={styles.liveRow}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveText}>City Veterinary Office · CDO</Text>
          </View>
          <Text style={styles.hoursText}>Mon – Fri · 8:00 AM – 5:00 PM</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Call City Veterinary Office"
          onPress={handleCallCVO}
          style={({ pressed }) => [styles.callBtn, pressed && styles.callBtnPressed]}
        >
          <Ionicons name="call" size={12} color={colors.white} />
          <Text style={styles.callBtnText}>Call CVO</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs,
  },
  stripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.10)',
    gap: spacing.sm,
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveText: {
    ...typography.captionBold,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hoursText: {
    ...typography.small,
    fontSize: 11,
    color: colors.textMuted,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  callBtnPressed: {
    opacity: 0.88,
  },
  callBtnText: {
    ...typography.captionBold,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.white,
  },
});
