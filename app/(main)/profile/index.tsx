import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { todayISO, formatShortDate } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { Avatar } from '@components/ui/Avatar';
import { InfoRow } from '@components/ui/InfoRow';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const pets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);
  useResidentData();

  const stats = useMemo(() => {
    const today = todayISO();
    const upcoming = appointments.filter(
      (a) => a.status !== 'cancelled' && a.status !== 'completed' && a.date >= today,
    ).length;
    const completed = appointments.filter((a) => a.status === 'completed').length;
    return { pets: pets.length, upcoming, completed };
  }, [pets, appointments]);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          haptic.light();
          signOut().catch(() => {});
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <AnimatedScreen animation="fade">
      <Screen scroll>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={[styles.identity, shadows.sm]}>
          <Avatar name={user.fullName} size={72} photoUrl={user.photoUrl} />
          <View style={styles.identityBody}>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Pets" value={stats.pets} icon="paw-outline" color={colors.primaryDark} />
          <StatCard label="Upcoming" value={stats.upcoming} icon="calendar-outline" color={colors.info} />
          <StatCard label="Completed" value={stats.completed} icon="checkmark-done-outline" color={colors.successDark} />
        </View>

        <View style={styles.card}>
          <InfoRow label="Mobile" value={user.mobileNumber || '—'} icon="call-outline" />
          <InfoRow label="Address" value={user.address || '—'} icon="home-outline" />
          <InfoRow
            label="Member since"
            value={formatShortDate(user.createdAt.slice(0, 10))}
            icon="shield-checkmark-outline"
          />
        </View>

        <View style={styles.officeCard}>
          <View style={styles.officeIcon}>
            <Ionicons name="business-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.officeBody}>
            <Text style={styles.officeTitle}>City Veterinary Office</Text>
            <Text style={styles.officeText}>
              Vaccinations, consultations, and spay & neuter services for city residents.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </Screen>
    </AnimatedScreen>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}14` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  identityBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  email: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    gap: 2,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xl,
  },
  officeCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  officeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  officeBody: {
    flex: 1,
    gap: 2,
  },
  officeTitle: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  officeText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 50,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.errorLight,
    backgroundColor: colors.surface,
  },
  signOutPressed: {
    backgroundColor: colors.errorLight,
  },
  signOutText: {
    ...typography.button,
    color: colors.error,
  },
});
