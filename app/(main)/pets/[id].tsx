import React, { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { getService } from '@lib/services';
import { formatShortDate, formatWeekdayDate, ageFromBirthYear, formatAge } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { BackButton } from '@components/ui/BackButton';
import { Avatar } from '@components/ui/Avatar';
import { InfoRow } from '@components/ui/InfoRow';
import { SectionHeader } from '@components/ui/SectionHeader';
import { StatusBadge } from '@components/ui/StatusBadge';
import { EmptyState } from '@components/ui/EmptyState';
import { Button } from '@components/ui/Button';

export default function PetProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ownerId = useAuthStore((state) => state.user?.id);
  const pets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);
  const deletePet = useDataStore((state) => state.deletePet);

  const pet = useMemo(() => pets.find((p) => p.id === id), [pets, id]);

  const petAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.petId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [appointments, id],
  );

  const vaccineHistory = useMemo(
    () =>
      petAppointments.filter(
        (a) => a.serviceId === 'vaccination' && a.status !== 'cancelled',
      ),
    [petAppointments],
  );

  if (!pet) {
    return (
      <Screen scroll>
        <View style={styles.headerRow}>
          <BackButton />
        </View>
        <EmptyState
          icon="paw-outline"
          title="Pet not found"
          message="This pet may have been removed."
          actionLabel="Back to My Pets"
          onAction={() => router.replace('/pets' as never)}
        />
      </Screen>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      `Remove ${pet.name}?`,
      'This will permanently delete their records and appointment history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!ownerId) return;
            try {
              await deletePet(ownerId, pet.id);
              haptic.success();
              router.replace('/pets' as never);
            } catch {
              haptic.error();
            }
          },
        },
      ],
    );
  };

  return (
    <AnimatedScreen animation="slide-up">
      <Screen scroll>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={styles.headerTitle}>Pet Profile</Text>
        </View>

        <View style={[styles.hero, shadows.sm]}>
          <Avatar name={pet.name} size={84} icon="paw" />
          <Text style={styles.heroName}>{pet.name}</Text>
          <Text style={styles.heroMeta}>
            {pet.species === 'dog' ? 'Dog' : 'Cat'} · {pet.breed} ·{' '}
            {formatAge(ageFromBirthYear(pet.birthYear))}
          </Text>
        </View>

        <SectionHeader title="Details" />
        <View style={styles.card}>
          <InfoRow label="Species" value={pet.species === 'dog' ? 'Dog' : 'Cat'} icon="paw-outline" />
          <InfoRow label="Breed" value={pet.breed} icon="ribbon-outline" />
          <InfoRow label="Gender" value={pet.gender === 'male' ? 'Male' : 'Female'} icon="male-outline" />
          <InfoRow label="Age" value={formatAge(ageFromBirthYear(pet.birthYear))} icon="calendar-outline" />
          <InfoRow
            label="Registered"
            value={formatShortDate(pet.createdAt.slice(0, 10))}
            icon="shield-checkmark-outline"
          />
        </View>

        <SectionHeader
          title="Vaccination History"
          actionLabel={vaccineHistory.length > 0 ? undefined : 'Schedule'}
          onAction={() => router.push(`/services/vaccination?pet=${pet.id}` as never)}
        />
        {vaccineHistory.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyRowText}>
              No vaccination records yet. Schedule your pet’s next vaccine.
            </Text>
            <Button
              title="Schedule Vaccination"
              variant="secondary"
              size="sm"
              onPress={() => router.push(`/services/vaccination?pet=${pet.id}` as never)}
            />
          </View>
        ) : (
          <View style={styles.card}>
            {vaccineHistory.map((appointment) => (
              <View key={appointment.id} style={styles.vaxRow}>
                <View style={styles.vaxDate}>
                  <Text style={styles.vaxDateLabel}>{formatWeekdayDate(appointment.date)}</Text>
                  <Text style={styles.vaxTime}>{appointment.timeSlot}</Text>
                </View>
                <View style={styles.vaxBody}>
                  <Text style={styles.vaxTitle}>
                    {getService('vaccination')?.name ?? 'Vaccination'}
                  </Text>
                  <StatusBadge status={appointment.status} />
                </View>
              </View>
            ))}
          </View>
        )}

        <SectionHeader
          title="Appointments"
          actionLabel={petAppointments.length > 0 ? 'See all' : undefined}
          onAction={() => router.push('/appointments' as never)}
        />
        {petAppointments.length === 0 ? (
          <EmptyState
            compact
            icon="calendar-outline"
            title="No appointments yet"
            message={`Book a service for ${pet.name} to get started.`}
            actionLabel="Book a Service"
            onAction={() => router.push(`/services?pet=${pet.id}` as never)}
          />
        ) : (
          <View style={styles.card}>
            {petAppointments.slice(0, 3).map((appointment) => {
              const service = getService(appointment.serviceId);
              return (
                <View key={appointment.id} style={styles.apptRow}>
                  <View style={styles.apptMeta}>
                    <Text style={styles.apptService}>{service?.name ?? 'Veterinary service'}</Text>
                    <Text style={styles.apptDate}>
                      {formatWeekdayDate(appointment.date)} · {appointment.timeSlot}
                    </Text>
                  </View>
                  <StatusBadge status={appointment.status} />
                </View>
              );
            })}
          </View>
        )}

        <Button
          title={`Book a Service for ${pet.name}`}
          size="lg"
          onPress={() => {
            haptic.light();
            router.push(`/services?pet=${pet.id}` as never);
          }}
          rightIcon={<Ionicons name="arrow-forward" size={20} color={colors.white} />}
        />

        <Button
          title="Remove Pet"
          variant="ghost"
          size="md"
          onPress={handleDelete}
          leftIcon={<Ionicons name="trash-outline" size={18} color={colors.error} />}
        />
      </Screen>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  heroName: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  heroMeta: {
    ...typography.caption,
    color: colors.textSecondary,
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
  emptyRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  emptyRowText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  vaxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  vaxDate: {
    width: 110,
    gap: 2,
  },
  vaxDateLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  vaxTime: {
    ...typography.small,
    color: colors.textMuted,
  },
  vaxBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  vaxTitle: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  apptMeta: {
    flex: 1,
    gap: 2,
  },
  apptService: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  apptDate: {
    ...typography.small,
    color: colors.textMuted,
  },
});
