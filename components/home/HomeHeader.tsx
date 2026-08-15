import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { getFirstName } from '@lib/format';
import { haptic } from '@lib/haptics';
import { Avatar } from '@components/ui/Avatar';

interface HomeHeaderProps {
  displayName: string;
  displayPhoto?: string | null;
  petsCount: number;
  hasUpcomingAppointments: boolean;
}

export function HomeHeader({
  displayName,
  displayPhoto,
  petsCount,
  hasUpcomingAppointments,
}: HomeHeaderProps) {
  const router = useRouter();
  const firstName = getFirstName(displayName) || 'Resident';

  const subtitle =
    petsCount > 0
      ? `${petsCount} ${petsCount === 1 ? 'Pet' : 'Pets'} Registered`
      : 'Pet Health Registry';

  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.container}>
      {/* 1. Left: Profile Avatar */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View Profile"
        onPress={() => {
          haptic.light();
          router.push('/profile' as never);
        }}
        style={styles.avatarWrap}
        hitSlop={6}
      >
        <Avatar name={displayName} size={42} photoUrl={displayPhoto} />
      </Pressable>

      {/* 2. Middle: Greeting & Pet Count */}
      <View style={styles.textCol}>
        <Text style={styles.greeting} numberOfLines={1}>
          Hello, {firstName} 👋
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {/* 3. Right: Notification Action Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View Notifications & Visits"
        onPress={() => {
          haptic.light();
          router.push('/appointments' as never);
        }}
        style={({ pressed }) => [
          styles.iconBtn,
          shadows.sm,
          pressed && styles.iconBtnPressed,
        ]}
        hitSlop={6}
      >
        <Ionicons name="notifications-outline" size={18} color={colors.textPrimary} />
        {hasUpcomingAppointments && <View style={styles.notifDot} />}
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
  avatarWrap: {
    borderRadius: 21,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    ...typography.heading3,
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: typography.font.bold,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.96 }],
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryDark,
  },
});
