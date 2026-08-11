import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '@theme';
import { todayISO } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { SegmentedControl } from '@components/ui/SegmentedControl';
import { AppointmentCard } from '@components/ui/AppointmentCard';
import { EmptyState } from '@components/ui/EmptyState';
import { LoadingState } from '@components/ui/LoadingState';

type Segment = 'upcoming' | 'past';

export default function AppointmentsScreen() {
  const router = useRouter();
  const { loading, loaded } = useResidentData();
  const appointments = useDataStore((state) => state.appointments);
  const [segment, setSegment] = useState<Segment>('upcoming');

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
          <Text style={styles.title}>Appointments</Text>
          <Text style={styles.subtitle}>
            Upcoming visits and your pet care history.
          </Text>
        </View>

        <SegmentedControl<Segment>
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
          value={segment}
          onChange={setSegment}
        />

        <View style={styles.list}>
          {list.length === 0 ? (
            <EmptyState
              icon={segment === 'upcoming' ? 'calendar-outline' : 'time-outline'}
              title={segment === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
              message={
                segment === 'upcoming'
                  ? 'Book a veterinary service and it will show up here.'
                  : 'Completed or cancelled visits will appear here.'
              }
              actionLabel={segment === 'upcoming' ? 'Book a Service' : undefined}
              onAction={() => {
                haptic.light();
                router.push('/services' as never);
              }}
            />
          ) : (
            list.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onPress={() => {
                  haptic.light();
                  router.push(`/pets/${appointment.petId}` as never);
                }}
              />
            ))
          )}
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
    marginTop: spacing.xl,
    gap: spacing.md,
  },
});
