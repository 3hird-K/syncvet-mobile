import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { getService, SERVICE_LOCATION, TIME_SLOTS } from '@lib/services';
import { addDays, formatShortDate, formatLongDate, toISODate, todayISO } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { Button } from '@components/ui/Button';
import { Avatar } from '@components/ui/Avatar';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { SuccessMessage } from '@components/ui/SuccessMessage';

const TOTAL_STEPS = 4;

export default function ServiceDetailScreen() {
  const router = useRouter();
  const { id, pet } = useLocalSearchParams<{ id: string; pet?: string }>();
  const service = getService(id ?? '');

  const { ownerId } = useResidentData();
  const pets = useDataStore((state) => state.pets);
  const bookAppointment = useDataStore((state) => state.bookAppointment);

  const [step, setStep] = useState(1);
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>(pet);
  const [notes, setNotes] = useState('');
  const [dateISO, setDateISO] = useState<string | undefined>();
  const [timeSlot, setTimeSlot] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const dateOptions = useMemo(() => {
    const today = todayISO();
    const tomorrow = toISODate(addDays(1));
    const options: { iso: string; label: string }[] = [];
    for (let i = 0; i < 7; i += 1) {
      const iso = toISODate(addDays(i));
      options.push({
        iso,
        label: iso === today ? 'Today' : iso === tomorrow ? 'Tomorrow' : formatShortDate(iso),
      });
    }
    return options;
  }, []);

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId),
    [pets, selectedPetId],
  );

  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(selectedPetId);
    if (step === 2) return true;
    if (step === 3) return Boolean(dateISO && timeSlot);
    return true;
  }, [step, selectedPetId, dateISO, timeSlot]);

  const handleBack = useCallback(() => {
    haptic.light();
    if (step > 1) {
      setStep((s) => s - 1);
      setError(undefined);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/services' as never);
    }
  }, [step, router]);

  const handleContinue = useCallback(() => {
    haptic.light();
    setError(undefined);
    if (step === 3) {
      setStep(4);
    } else {
      setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    }
  }, [step]);

  const handleSubmit = useCallback(async () => {
    if (!selectedPet || !dateISO || !timeSlot) {
      haptic.warning();
      setError('Please choose a pet, date, and time to continue.');
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await bookAppointment(ownerId, {
        petId: selectedPet.id,
        petName: selectedPet.name,
        serviceId: service?.id ?? '',
        date: dateISO,
        timeSlot,
        location: SERVICE_LOCATION,
        notes: notes.trim() || undefined,
      });
      haptic.success();
      setSubmitted(true);
    } catch {
      setError('We couldn’t submit your request. Please try again.');
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [selectedPet, dateISO, timeSlot, notes, ownerId, service?.id, bookAppointment]);

  if (!service) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.missing}>
          <Text style={styles.missingText}>Service not found.</Text>
          <Button title="Back to Services" onPress={() => router.replace('/services' as never)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBack}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        {submitted ? (
          <Text style={styles.headerTitle}>Request Submitted</Text>
        ) : (
          <View style={styles.headerProgress}>
            <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]}
              />
            </View>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.serviceCard}>
          <View style={[styles.serviceIcon, { backgroundColor: service.bg }]}>
            <Ionicons name={service.icon} size={26} color={service.color} />
          </View>
          <View style={styles.serviceBody}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceTagline}>{service.tagline}</Text>
          </View>
        </View>

        {submitted ? (
          <Animated.View entering={FadeInDown.duration(320)}>
            <SuccessMessage
              title="Request submitted!"
              message={`${service.name} for ${selectedPet?.name ?? 'your pet'} on ${
                dateISO ? formatLongDate(dateISO) : ''
              } at ${timeSlot}.`}
            />
            <View style={styles.successActions}>
              <Button
                title="View My Appointments"
                size="lg"
                onPress={() => {
                  haptic.light();
                  router.replace('/appointments' as never);
                }}
              />
              <Button
                title="Back to Home"
                variant="ghost"
                size="md"
                onPress={() => {
                  haptic.light();
                  router.replace('/');
                }}
              />
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            key={step}
            entering={FadeInDown.duration(260)}
            exiting={FadeOut.duration(120)}
          >
            {step === 1 ? (
              <StepPet
                pets={pets}
                selectedPetId={selectedPetId}
                onSelect={setSelectedPetId}
                onAddPet={() => router.push('/pets/add' as never)}
              />
            ) : null}

            {step === 2 ? (
              <StepDetails notes={notes} onChange={setNotes} serviceName={service.name} />
            ) : null}

            {step === 3 ? (
              <StepSchedule
                dateOptions={dateOptions}
                dateISO={dateISO}
                timeSlot={timeSlot}
                onSelectDate={setDateISO}
                onSelectTime={setTimeSlot}
              />
            ) : null}

            {step === 4 ? (
              <StepReview
                petName={selectedPet?.name ?? ''}
                serviceName={service.name}
                dateISO={dateISO}
                timeSlot={timeSlot}
                notes={notes}
              />
            ) : null}
          </Animated.View>
        )}
      </ScrollView>

      {!submitted ? (
        <View style={styles.footer}>
          {error ? <ErrorMessage message={error} /> : null}
          <Button
            title={
              step === 1
                ? 'Continue'
                : step === 2
                  ? 'Continue'
                  : step === 3
                    ? 'Review Booking'
                    : 'Submit Request'
            }
            size="lg"
            disabled={!canContinue}
            loading={submitting}
            onPress={step === 4 ? handleSubmit : handleContinue}
            rightIcon={<Ionicons name="arrow-forward" size={20} color={colors.white} />}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function StepPet({
  pets,
  selectedPetId,
  onSelect,
  onAddPet,
}: {
  pets: { id: string; name: string }[];
  selectedPetId?: string;
  onSelect: (id: string) => void;
  onAddPet: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Which pet is this for?</Text>
      <Text style={styles.stepSubtitle}>
        Select the pet you’d like to bring in for this service.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petOptions}>
        {pets.map((pet) => {
          const selected = pet.id === selectedPetId;
          return (
            <Pressable
              key={pet.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                haptic.light();
                onSelect(pet.id);
              }}
              style={({ pressed }) => [
                styles.petOption,
                selected && styles.petOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Avatar name={pet.name} size={52} icon="paw" />
              <Text style={[styles.petOptionName, selected && styles.petOptionNameSelected]}>
                {pet.name}
              </Text>
            </Pressable>
          );
        })}
        {pets.length === 0 ? (
          <Pressable accessibilityRole="button" onPress={onAddPet} style={styles.petOption}>
            <View style={styles.addPetCircle}>
              <Ionicons name="add" size={24} color={colors.primary} />
            </View>
            <Text style={styles.petOptionName}>Add a pet</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function StepDetails({
  notes,
  onChange,
  serviceName,
}: {
  notes: string;
  onChange: (value: string) => void;
  serviceName: string;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Anything we should know?</Text>
      <Text style={styles.stepSubtitle}>
        Add a short note about your pet or the reason for this {serviceName.toLowerCase()} visit.
      </Text>
      <View style={styles.textareaWrap}>
        <Ionicons name="create-outline" size={20} color={colors.textMuted} />
        <TextInputMultiline value={notes} onChange={onChange} />
      </View>
      <Text style={styles.hint}>Optional — you can also explain this at the office.</Text>
    </View>
  );
}

function TextInputMultiline({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextInputStyled value={value} onChangeText={onChange} />
  );
}

function TextInputStyled({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      multiline
      numberOfLines={4}
      placeholder="e.g. Milo has been sneezing since yesterday…"
      placeholderTextColor={colors.textDisabled}
      style={styles.textarea}
    />
  );
}

function StepSchedule({
  dateOptions,
  dateISO,
  timeSlot,
  onSelectDate,
  onSelectTime,
}: {
  dateOptions: { iso: string; label: string }[];
  dateISO?: string;
  timeSlot?: string;
  onSelectDate: (iso: string) => void;
  onSelectTime: (slot: string) => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Pick a date & time</Text>
      <Text style={styles.stepSubtitle}>
        Choose from the next 7 days at the City Veterinary Office.
      </Text>

      <Text style={styles.fieldLabel}>Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateOptions}>
        {dateOptions.map((option) => {
          const selected = option.iso === dateISO;
          return (
            <Pressable
              key={option.iso}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                haptic.light();
                onSelectDate(option.iso);
              }}
              style={({ pressed }) => [
                styles.dateOption,
                selected && styles.dateOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.dateOptionLabel, selected && styles.dateOptionTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.fieldLabel}>Time</Text>
      <View style={styles.timeGrid}>
        {TIME_SLOTS.map((slot) => {
          const selected = slot === timeSlot;
          return (
            <Pressable
              key={slot}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                haptic.light();
                onSelectTime(slot);
              }}
              style={({ pressed }) => [
                styles.timeOption,
                selected && styles.timeOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.timeOptionLabel, selected && styles.timeOptionTextSelected]}>
                {slot}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StepReview({
  petName,
  serviceName,
  dateISO,
  timeSlot,
  notes,
}: {
  petName: string;
  serviceName: string;
  dateISO?: string;
  timeSlot?: string;
  notes: string;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Review your request</Text>
      <Text style={styles.stepSubtitle}>Confirm the details before submitting.</Text>

      <View style={styles.reviewCard}>
        <ReviewRow label="Service" value={serviceName} />
        <ReviewRow label="Pet" value={petName} />
        {dateISO ? <ReviewRow label="Date" value={formatLongDate(dateISO)} /> : null}
        {timeSlot ? <ReviewRow label="Time" value={timeSlot} /> : null}
        <ReviewRow label="Location" value={SERVICE_LOCATION} />
        {notes.trim() ? <ReviewRow label="Notes" value={notes.trim()} /> : null}
      </View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    flex: 1,
  },
  headerProgress: {
    flex: 1,
    gap: 6,
  },
  stepLabel: {
    ...typography.smallBold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    ...shadows.sm,
  },
  serviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBody: {
    flex: 1,
  },
  serviceName: {
    ...typography.title,
    color: colors.textPrimary,
  },
  serviceTagline: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  step: {
    gap: spacing.md,
  },
  stepTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  stepSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  petOptions: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  petOption: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 120,
  },
  petOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLighter,
  },
  petOptionName: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  petOptionNameSelected: {
    color: colors.primaryDark,
  },
  addPetCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  textareaWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  textarea: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 100,
    padding: 0,
    textAlignVertical: 'top',
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  dateOptions: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dateOption: {
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dateOptionLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  dateOptionTextSelected: {
    color: colors.primaryDark,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  timeOption: {
    width: '31%',
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  timeOptionLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  timeOptionTextSelected: {
    color: colors.primaryDark,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  reviewLabel: {
    ...typography.caption,
    color: colors.textMuted,
    width: 84,
  },
  reviewValue: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  successActions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  missingText: {
    ...typography.title,
    color: colors.textPrimary,
  },
});
