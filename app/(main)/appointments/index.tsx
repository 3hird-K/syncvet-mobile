import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { colors, spacing, typography } from '@theme';
import { todayISO } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { AppointmentSwitch, AppointmentTab } from '@components/ui/AppointmentSwitch';
import { AppointmentCard } from '@components/ui/AppointmentCard';
import { AppointmentDetailModal } from '@components/ui/AppointmentDetailModal';
import { EmptyState } from '@components/ui/EmptyState';
import { LoadingState } from '@components/ui/LoadingState';
import type { Appointment } from '@services/data';

export default function AppointmentsScreen() {
  const router = useRouter();
  const { loading, loaded } = useResidentData();
  const appointments = useDataStore((state) => state.appointments);
  const [segment, setSegment] = useState<AppointmentTab>('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const { upcoming, past } = useMemo(() => {
    const today = todayISO();
    const upcomingList = appointments
      .filter(
        (a) =>
          a.status !== 'cancelled' &&
          (a.date > today || (a.date === today && a.status !== 'completed')),
      )
      .sort((a, b) => `${a.date}${a.timeSlot}`.localeCompare(`${b.date}${b.timeSlot}`));
    const pastList = appointments
      .filter((a) => a.date < today || a.status === 'completed' || a.status === 'cancelled')
      .sort((a, b) => `${b.date}${b.timeSlot}`.localeCompare(`${a.date}${a.timeSlot}`));
    return { upcoming: upcomingList, past: pastList };
  }, [appointments]);

  if (loading && !loaded) {
    return (
      <Screen>
        <LoadingState label="Loading your appointments…" />
      </Screen>
    );
  }

  const list = segment === 'upcoming' ? upcoming : past;

  return (
    <AnimatedScreen animation="fade">
      <Screen scroll>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Appointments</Text>

            <Pressable
              onPress={() => {
                haptic.light();
                router.push('/appointments/new' as never);
              }}
              style={styles.bookHeaderBtn}
              accessibilityRole="button"
              accessibilityLabel="Book new visit"
            >
              <Ionicons name="add" size={16} color={colors.white} />
              <Text style={styles.bookHeaderBtnText}>Book Visit</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Upcoming visits and your pet care history.
          </Text>
        </View>

        {/* Dual-Pill Capsule Switch with Spring Physics & Icons */}
        <AppointmentSwitch
          activeTab={segment}
          onChange={setSegment}
          upcomingCount={upcoming.length}
          pastCount={past.length}
        />

        {/* Context subtitle bar */}
        <View style={styles.tabContextRow}>
          <Ionicons
            name={segment === 'upcoming' ? 'shield-checkmark-outline' : 'archive-outline'}
            size={13}
            color={segment === 'upcoming' ? colors.primary : colors.textSecondary}
          />
          <Text style={styles.tabContextText}>
            {segment === 'upcoming'
              ? `${upcoming.length} active ${upcoming.length === 1 ? 'booking' : 'bookings'} scheduled at City Vet`
              : `${past.length} completed or archived ${past.length === 1 ? 'visit' : 'visits'}`}
          </Text>
        </View>

        {/* Animated Card List */}
        <Animated.View key={segment} entering={FadeIn.duration(200)} style={styles.list}>
          {list.length === 0 ? (
            <EmptyState
              icon={segment === 'upcoming' ? 'calendar-outline' : 'time-outline'}
              title={segment === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
              message={
                segment === 'upcoming'
                  ? 'Schedule a veterinary checkup or vaccine visit for your pet.'
                  : 'Completed or cancelled visits will appear here.'
              }
              actionLabel={segment === 'upcoming' ? 'Book a Service' : undefined}
              onAction={() => {
                haptic.light();
                router.push('/services' as never);
              }}
            />
          ) : (
            list.map((appointment, idx) => (
              <Animated.View
                key={appointment.id}
                entering={FadeInDown.delay(idx * 50).duration(200)}
              >
                <AppointmentCard
                  appointment={appointment}
                  onPress={() => {
                    haptic.light();
                    setSelectedAppointment(appointment);
                  }}
                />
              </Animated.View>
            ))
          )}
        </Animated.View>

        {/* Appointment Details & Cancellation Modal */}
        <AppointmentDetailModal
          visible={Boolean(selectedAppointment)}
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onCancelled={() => setSelectedAppointment(null)}
        />
      </Screen>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.heading1,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 13.5,
    lineHeight: 18,
  },
  bookHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  bookHeaderBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  tabContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: 4,
  },
  tabContextText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
});
