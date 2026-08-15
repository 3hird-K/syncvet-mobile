import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';

interface PetsEmptyStateProps {
  type: 'no_pets' | 'no_results';
  onClearFilter?: () => void;
}

export function PetsEmptyState({ type, onClearFilter }: PetsEmptyStateProps) {
  const router = useRouter();

  if (type === 'no_results') {
    return (
      <Animated.View entering={FadeInDown.duration(220)} style={[styles.card, shadows.sm]}>
        <View style={styles.iconCircleMuted}>
          <Ionicons name="search-outline" size={24} color={colors.textMuted} />
        </View>
        <Text style={styles.title}>No matching pets found</Text>
        <Text style={styles.sub}>
          Try searching with a different name, breed, or category filter.
        </Text>
        {onClearFilter ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search and filters"
            onPress={() => {
              haptic.light();
              onClearFilter();
            }}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.clearBtnText}>Clear Filters</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(260)} style={[styles.card, shadows.sm]}>
      <View style={styles.iconCircle}>
        <Ionicons name="paw" size={28} color={colors.primaryDark} />
      </View>
      <Text style={styles.title}>Your pets deserve a profile</Text>
      <Text style={styles.sub}>
        Register your dog or cat with the City Veterinary Office to track vaccinations, generate official health passports, and schedule clinic checkups.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Register your first pet"
        onPress={() => {
          haptic.light();
          router.push('/pets/add' as never);
        }}
        style={({ pressed }) => [styles.registerBtn, pressed && styles.btnPressed]}
      >
        <Ionicons name="add-circle" size={16} color={colors.white} />
        <Text style={styles.registerBtnText}>Register Your First Pet</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.10)',
    gap: 6,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(10, 110, 100, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconCircleMuted: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(7, 30, 38, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    ...typography.heading3,
    fontSize: 17,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sub: {
    ...typography.small,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 290,
    marginBottom: 8,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    alignSelf: 'stretch',
  },
  registerBtnText: {
    ...typography.captionBold,
    fontSize: 13,
    fontFamily: typography.font.bold,
    color: colors.white,
  },
  clearBtn: {
    backgroundColor: 'rgba(7, 30, 38, 0.06)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  clearBtnText: {
    ...typography.captionBold,
    fontSize: 12,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
  },
});
