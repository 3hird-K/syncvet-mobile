import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';

interface PetsHeaderProps {
  petsCount: number;
}

export function PetsHeader({ petsCount }: PetsHeaderProps) {
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.container}>
      <View style={styles.titleCol}>
        <Text style={styles.title}>Pet Registry</Text>
        <Text style={styles.subtitle}>
          {petsCount > 0
            ? `${petsCount} ${petsCount === 1 ? 'pet' : 'pets'} registered · Digital health passports`
            : "Keep your pets' health and veterinary information organized."}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Register a new pet"
        onPress={() => {
          haptic.light();
          router.push('/pets/add' as never);
        }}
        style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        hitSlop={6}
      >
        <Ionicons name="add" size={16} color={colors.white} />
        <Text style={styles.addBtnText}>Register Pet</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: 4,
    gap: 12,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 22,
    fontFamily: typography.font.bold,
    letterSpacing: -0.4,
  },
  subtitle: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 7.5,
    borderRadius: radius.pill,
    ...shadows.sm,
  },
  addBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  addBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12.5,
    fontFamily: typography.font.bold,
  },
});
