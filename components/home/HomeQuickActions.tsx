import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';

export function HomeQuickActions() {
  const router = useRouter();

  const actions = [
    {
      id: 'book',
      label: 'Book Visit',
      icon: 'calendar' as const,
      color: colors.primaryDark,
      bg: 'rgba(10, 110, 100, 0.12)',
      route: '/appointments/new',
    },
    {
      id: 'pets',
      label: 'My Pets',
      icon: 'paw' as const,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.12)',
      route: '/pets',
    },
    {
      id: 'services',
      label: 'Services',
      icon: 'grid' as const,
      color: colors.success,
      bg: 'rgba(16, 185, 129, 0.12)',
      route: '/services',
    },
    {
      id: 'add-pet',
      label: 'Add Pet',
      icon: 'add-circle' as const,
      color: '#2563EB',
      bg: 'rgba(37, 99, 235, 0.12)',
      route: '/pets/add',
    },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(140).duration(260)} style={styles.container}>
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.id}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              haptic.light();
              router.push(action.route as never);
            }}
            style={({ pressed }) => [
              styles.actionTile,
              shadows.sm,
              pressed && styles.tilePressed,
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: action.bg }]}>
              <Ionicons name={action.icon} size={17} color={action.color} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.08)',
    gap: 4,
  },
  tilePressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.captionBold,
    fontSize: 11,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
