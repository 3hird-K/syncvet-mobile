import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { getFirstName, todayISO } from '@lib/format';
import { SERVICES } from '@lib/services';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { SectionHeader } from '@components/ui/SectionHeader';
import { PetCard } from '@components/ui/PetCard';
import { ServiceCard } from '@components/ui/ServiceCard';
import { AppointmentCard } from '@components/ui/AppointmentCard';
import { ActivityRow } from '@components/ui/ActivityRow';
import { EmptyState } from '@components/ui/EmptyState';
import { LoadingState } from '@components/ui/LoadingState';
import { Avatar } from '@components/ui/Avatar';

const HOME_SERVICES = SERVICES.slice(0, 4);

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const { loading } = useResidentData();
  const pets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);
  const activity = useDataStore((state) => state.activity);

  const displayName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    user?.fullName ||
    'Resident';
  const displayPhoto = clerkUser?.imageUrl || user?.photoUrl;

  const upcoming = useMemo(() => {
    const today = todayISO();
    return appointments
      .filter((a) => (a.status === 'pending' || a.status === 'confirmed') && a.date >= today)
      .sort((a, b) => (a.date === b.date ? a.timeSlot.localeCompare(b.timeSlot) : a.date.localeCompare(b.date)))[0];
  }, [appointments]);

  const recentActivity = useMemo(() => activity.slice(0, 4), [activity]);

  const goService = useCallback(
    (id: string) => {
      haptic.light();
      router.push(`/services/${id}` as never);
    },
    [router],
  );

  return (
    <AnimatedScreen animation="fade">
      <Screen scroll>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              {greeting()}, {getFirstName(displayName)} 👋
            </Text>
            <Text style={styles.subtitle}>
              Here’s what’s happening with your pets.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => {
                haptic.light();
                router.push('/appointments' as never);
              }}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
              <View style={styles.notifDot} />
            </Pressable>
            <Avatar name={displayName} size={42} photoUrl={displayPhoto} />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="My Pets"
            actionLabel="Manage"
            onAction={() => router.push('/pets' as never)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.petRow}
          >
            {pets.map((pet) => (
              <View key={pet.id} style={styles.petItem}>
                <PetCard
                  pet={pet}
                  compact
                  onPress={() => router.push(`/pets/${pet.id}` as never)}
                />
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a pet"
              onPress={() => {
                haptic.light();
                router.push('/pets/add' as never);
              }}
              style={({ pressed }) => [styles.addPet, pressed && styles.addPetPressed]}
            >
              <View style={styles.addPetIcon}>
                <Ionicons name="add" size={26} color={colors.primary} />
              </View>
              <Text style={styles.addPetText}>Add Pet</Text>
            </Pressable>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Services"
            actionLabel="See all"
            onAction={() => router.push('/services' as never)}
          />
          <View style={styles.grid}>
            {HOME_SERVICES.map((service) => (
              <View key={service.id} style={styles.gridItem}>
                <ServiceCard
                  title={service.name}
                  subtitle={service.tagline}
                  icon={<Ionicons name={service.icon} size={22} color={service.color} />}
                  iconBackground={service.bg}
                  onPress={() => goService(service.id)}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Upcoming Appointment" />
          {upcoming ? (
            <View style={styles.upcomingWrap}>
              <AppointmentCard
                appointment={upcoming}
                onPress={() => router.push('/appointments' as never)}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptic.light();
                  router.push('/appointments' as never);
                }}
                style={({ pressed }) => [styles.viewDetails, pressed && styles.viewDetailsPressed]}
              >
                <Text style={styles.viewDetailsText}>View Details</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
              </Pressable>
            </View>
          ) : (
            <EmptyState
              icon="calendar-clear-outline"
              title="No upcoming appointments"
              message="Book a service when you and your pet are ready."
              actionLabel="Book a Service"
              onAction={() => router.push('/services' as never)}
            />
          )}
        </View>

        {recentActivity.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Recent Activity" />
            <View style={styles.activityCard}>
              {recentActivity.map((item, index) => (
                <ActivityRow
                  key={item.id}
                  title={item.title}
                  detail={item.detail}
                  date={item.date}
                  type={item.type}
                  isLast={index === recentActivity.length - 1}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.footerSpacing} />
      </Screen>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  greeting: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  section: {
    marginBottom: spacing.xxxl,
  },
  petRow: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  petItem: {
    width: 168,
  },
  addPet: {
    width: 168,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  addPetPressed: {
    backgroundColor: colors.surfacePressed,
  },
  addPetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPetText: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  upcomingWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  viewDetailsPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  viewDetailsText: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  footerSpacing: {
    height: spacing.xl,
  },
});
