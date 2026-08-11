import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { SERVICES } from '@lib/services';
import { haptic } from '@lib/haptics';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';

export default function ServicesScreen() {
  const router = useRouter();
  const { pet } = useLocalSearchParams<{ pet?: string }>();

  const openService = useCallback(
    (id: string) => {
      haptic.light();
      router.push(pet ? (`/services/${id}?pet=${pet}` as never) : (`/services/${id}` as never));
    },
    [router, pet],
  );

  return (
    <AnimatedScreen animation="fade">
      <Screen scroll>
        <View style={styles.header}>
          <Text style={styles.title}>Veterinary Services</Text>
          <Text style={styles.subtitle}>Find the care your pet needs.</Text>
        </View>

        <View style={styles.list}>
          {SERVICES.map((service) => (
            <Pressable
              key={service.id}
              accessibilityRole="button"
              accessibilityLabel={service.name}
              onPress={() => openService(service.id)}
              style={({ pressed }) => [styles.row, shadows.sm, pressed && styles.rowPressed]}
            >
              <View style={[styles.iconWrap, { backgroundColor: service.bg }]}>
                <Ionicons name={service.icon} size={24} color={service.color} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{service.name}</Text>
                <Text style={styles.rowTagline}>{service.tagline}</Text>
              </View>
              <View style={styles.chevron}>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.officeCard}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="business-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>City Veterinary Office</Text>
            <Text style={styles.rowTagline}>
              All services are delivered at the city veterinary office.
            </Text>
          </View>
        </View>
      </Screen>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  rowTagline: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    padding: spacing.sm,
  },
  officeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.xxl,
  },
});
