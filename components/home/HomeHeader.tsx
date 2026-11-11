import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { getFirstName } from '@lib/format';
import { haptic } from '@lib/haptics';
import { Avatar } from '@components/ui/Avatar';

interface HomeHeaderProps {
  displayName: string;
  displayPhoto?: string | null;
  petsCount: number;
  hasUpcomingAppointments?: boolean;
  notificationCount?: number;
  unreadMessageCount?: number;
  onScanPress?: () => void;
}

export function HomeHeader({
  displayName,
  displayPhoto,
  petsCount,
  unreadMessageCount = 0,
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

      {/* 3. Right: Action Buttons (CVO Telemedicine Messenger) */}
      <View style={styles.rightActionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open CVO Telemedicine Messenger${unreadMessageCount > 0 ? `, ${unreadMessageCount} new messages` : ''}`}
          onPress={() => {
            haptic.light();
            router.push('/messages' as never);
          }}
          style={({ pressed }) => [
            styles.iconBtn,
            shadows.sm,
            pressed && styles.iconBtnPressed,
          ]}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="facebook-messenger" size={20} color="#111827" />
          {unreadMessageCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '97%',
    alignSelf: 'center',
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
  rightActionsRow: {
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});
