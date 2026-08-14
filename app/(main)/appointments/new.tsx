import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import Animated, { FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useUser } from '@clerk/expo';

import { colors, radius, shadows, spacing, typography } from '@theme';
import {
  SERVICES,
  SERVICE_LOCATION,
  TIME_SLOTS,
  getService,
} from '@lib/services';
import {
  addDays,
  formatShortDate,
  formatDateWithYear,
  formatLongDate,
  formatWeekdayDate,
  ageFromBirthYear,
  formatAge,
  toISODate,
  todayISO,
} from '@lib/format';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { PopoutPetAvatar } from '@components/ui/PopoutPetAvatar';
import { Button } from '@components/ui/Button';
import { toast } from '@components/ui/Sonner';
import { updateClerkUnsafeMetadata } from '@lib/clerkMetadata';

const TOTAL_STEPS = 4;

const CLINICAL_REASONS: Record<string, string[]> = {
  vaccination: [
    'Annual Anti-Rabies Booster',
    'First-Time Rabies Vaccine',
    'Core 5-in-1 / DHPPiL (Canine)',
    'Core 4-in-1 / FVRCP (Feline)',
    'Puppy / Kitten Series',
  ],
  consultation: [
    'General Health Wellness Exam',
    'Skin Rash / Itch / Hair Loss',
    'Loss of Appetite / Lethargy',
    'Eye or Ear Discharge',
    'Limping or Injury Check',
    'Post-Op Followup',
  ],
  'spay-neuter': [
    'Municipal Free Kapon Program',
    'Pre-Surgery Health Assessment',
    'Routine Spaying (Female)',
    'Routine Castration (Male)',
  ],
  deworming: [
    'Routine Internal Deworming',
    'Flea & Tick Treatment Spot-On',
    'Heartworm Preventative',
  ],
  'pet-registration': [
    'Official CDO Digital Tag Registration',
    'Pet Microchipping & Passport Issue',
  ],
  other: ['General Veterinary Inquiry', 'Prescription Refill', 'Health Certificate Request'],
};

interface PetVaccinationTimeline {
  isVaccinated: boolean;
  totalDoses: number;
  lastVaccineDate?: string;
  nextBoosterDate?: string;
}

function calculatePetVaccineTimeline(
  pet: any,
  appointments: any[] = [],
): PetVaccinationTimeline {
  // Find all vaccination appointments for this specific pet
  const vaxAppts = (appointments || [])
    .filter(
      (a) => a.petId === pet.id && a.serviceId === 'vaccination' && a.status !== 'cancelled',
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const doseCountFromAppts = vaxAppts.length;
  const isVaccinated = Boolean(pet.isVaccinated) || doseCountFromAppts > 0;
  const totalDoses = Math.max(isVaccinated ? 1 : 0, doseCountFromAppts, pet.vaccinationDoses || 0);

  let lastVaccineDate = vaxAppts[0]?.date || pet.lastVaccinationDate;
  if (!lastVaccineDate && isVaccinated) {
    // If marked vaccinated but no specific date was set, use pet's registration date or 6 months ago
    lastVaccineDate = pet.createdAt ? pet.createdAt.split('T')[0] : '2025-08-14';
  }

  let nextBoosterDate: string | undefined = pet.nextVaccinationDate;
  if (!nextBoosterDate && isVaccinated && lastVaccineDate) {
    try {
      const parts = lastVaccineDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parts[1];
        const day = parts[2];
        if (!isNaN(year)) {
          nextBoosterDate = `${year + 1}-${month}-${day}`;
        }
      }
    } catch {
      nextBoosterDate = undefined;
    }
  }

  return {
    isVaccinated,
    totalDoses,
    lastVaccineDate,
    nextBoosterDate,
  };
}

export default function NewAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    petId?: string;
    petName?: string;
    serviceId?: string;
  }>();

  const { user: clerkUser } = useUser();
  const ownerId = useAuthStore((state) => state.user?.id) || 'cdo-resident-user';
  const localPets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);
  const bookAppointment = useDataStore((state) => state.bookAppointment);

  // Load STRICTLY the signed-in resident's pets (Clerk metadata priority, fallback to local user store)
  const allPets = useMemo(() => {
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];
    if (metaPets.length > 0) {
      return metaPets.map((p: any, idx: number) => ({
        id: p.id || `clerk-pet-${idx}`,
        ownerId: ownerId,
        name: p.name || 'My Pet',
        species: p.species || 'dog',
        breed: p.breed || '',
        gender: p.gender || '',
        birthYear: p.birthYear,
        isVaccinated: Boolean(p.isVaccinated),
        isSpayedNeutered: Boolean(p.isSpayedNeutered),
        weightCategory: p.weightCategory || 'Medium',
        notes: p.notes,
        avatarId: p.avatarId,
        photoUrl: p.photoUrl,
        vaccinationDoses: p.vaccinationDoses,
        lastVaccinationDate: p.lastVaccinationDate,
        nextVaccinationDate: p.nextVaccinationDate,
        createdAt: p.createdAt || new Date().toISOString(),
      }));
    }

    if (localPets && localPets.length > 0) {
      return localPets;
    }

    return [];
  }, [clerkUser?.unsafeMetadata, localPets, ownerId]);

  // Initial form values derived from params
  const initialPetId = params.petId || (allPets.length > 0 ? allPets[0].id : undefined);
  const initialServiceId = params.serviceId || 'vaccination';

  const [step, setStep] = useState(1);
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>(initialPetId);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId);
  const [clinicalReason, setClinicalReason] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [dateISO, setDateISO] = useState<string | undefined>();
  const [timeSlot, setTimeSlot] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [confirmedTicket, setConfirmedTicket] = useState<{
    id: string;
    refNumber: string;
    petName: string;
    serviceName: string;
    date: string;
    timeSlot: string;
  } | null>(null);

  const selectedPet = useMemo(
    () => allPets.find((p) => p.id === selectedPetId),
    [allPets, selectedPetId],
  );

  const selectedService = useMemo(
    () => getService(selectedServiceId) || SERVICES[0],
    [selectedServiceId],
  );

  // Available dates (Next 10 business days, skipping Sundays)
  const dateOptions = useMemo(() => {
    const today = todayISO();
    const tomorrow = toISODate(addDays(1));
    const options: { iso: string; label: string; weekday: string; isSunday: boolean }[] = [];

    let daysAdded = 0;
    let offset = 0;
    while (daysAdded < 10) {
      const dateObj = addDays(offset);
      const isSunday = dateObj.getDay() === 0;
      const iso = toISODate(dateObj);

      if (!isSunday) {
        options.push({
          iso,
          label: iso === today ? 'Today' : iso === tomorrow ? 'Tomorrow' : formatShortDate(iso),
          weekday: formatWeekdayDate(iso).split(',')[0],
          isSunday: false,
        });
        daysAdded++;
      }
      offset++;
    }
    return options;
  }, []);

  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(selectedPetId);
    if (step === 2) return Boolean(selectedServiceId);
    if (step === 3) return Boolean(dateISO && timeSlot);
    return true;
  }, [step, selectedPetId, selectedServiceId, dateISO, timeSlot]);

  const handleBack = useCallback(() => {
    haptic.light();
    if (step > 1) {
      setStep((s) => s - 1);
      setError(undefined);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/appointments' as never);
    }
  }, [step, router]);

  const handleContinue = useCallback(() => {
    haptic.light();
    setError(undefined);
    if (step === 1 && !selectedPetId) {
      setError('Please select a pet to proceed.');
      return;
    }
    if (step === 2 && !selectedServiceId) {
      setError('Please choose a veterinary service.');
      return;
    }
    if (step === 3 && (!dateISO || !timeSlot)) {
      setError('Please select an appointment date and preferred time slot.');
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }, [step, selectedPetId, selectedServiceId, dateISO, timeSlot]);

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedPet || !selectedService || !dateISO || !timeSlot) {
      haptic.warning();
      setError('Missing appointment parameters. Please review your selection.');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const fullNotes = [clinicalReason, notes.trim()].filter(Boolean).join(' — ');

      const newAppointment = await bookAppointment(ownerId, {
        petId: selectedPet.id,
        petName: selectedPet.name,
        serviceId: selectedService.id,
        date: dateISO,
        timeSlot,
        location: SERVICE_LOCATION,
        notes: fullNotes || undefined,
      });

      // Also persist to Clerk metadata for multi-device sync
      if (clerkUser) {
        const existingAppts = ((clerkUser.unsafeMetadata?.appointments as any[]) || []);
        await updateClerkUnsafeMetadata(clerkUser, {
          appointments: [
            ...existingAppts,
            {
              id: newAppointment.id,
              petId: selectedPet.id,
              petName: selectedPet.name,
              serviceId: selectedService.id,
              date: dateISO,
              timeSlot,
              location: SERVICE_LOCATION,
              notes: fullNotes || undefined,
              status: 'confirmed',
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }

      haptic.success();
      const refNumber = `CVO-${Math.floor(100000 + Math.random() * 900000)}`;
      setConfirmedTicket({
        id: newAppointment.id,
        refNumber,
        petName: selectedPet.name,
        serviceName: selectedService.name,
        date: dateISO,
        timeSlot,
      });

      toast.success('Appointment Scheduled!', {
        description: `${selectedService.name} for ${selectedPet.name} on ${formatShortDate(dateISO)}.`,
      });
    } catch (err: any) {
      console.log('Booking error:', err);
      setError('Could not confirm booking. Please try again.');
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedPet,
    selectedService,
    dateISO,
    timeSlot,
    clinicalReason,
    notes,
    ownerId,
    bookAppointment,
    clerkUser,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Top Header Bar */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>

          {confirmedTicket ? (
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Booking Confirmed</Text>
              <Text style={styles.headerSubtitle}>Official Municipal Ticket</Text>
            </View>
          ) : (
            <View style={styles.headerProgress}>
              <View style={styles.headerProgressRow}>
                <Text style={styles.stepTitle}>
                  {step === 1
                    ? 'Select Pet'
                    : step === 2
                      ? 'Choose Service'
                      : step === 3
                        ? 'Select Schedule'
                        : 'Review Booking'}
                </Text>
                <Text style={styles.stepCounter}>Step {step} of {TOTAL_STEPS}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(step / TOTAL_STEPS) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}

          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Form Body Scroll Area */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {confirmedTicket ? (
            /* Confirmation Ticket Slip */
            <Animated.View entering={ZoomIn.duration(260)} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View style={styles.ticketBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.ticketBadgeText}>Confirmed Reservation</Text>
                </View>
                <Text style={styles.ticketRef}>{confirmedTicket.refNumber}</Text>
              </View>

              <View style={styles.ticketBody}>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Patient</Text>
                  <Text style={styles.ticketValue}>{confirmedTicket.petName}</Text>
                </View>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Service</Text>
                  <Text style={styles.ticketValue}>{confirmedTicket.serviceName}</Text>
                </View>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Date & Time</Text>
                  <Text style={styles.ticketValueHighlight}>
                    {formatLongDate(confirmedTicket.date)} · {confirmedTicket.timeSlot}
                  </Text>
                </View>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Location</Text>
                  <Text style={styles.ticketValue}>{SERVICE_LOCATION}, CDO</Text>
                </View>
              </View>

              {/* Veterinary Checklist Notice */}
              <View style={styles.vetNoticeBox}>
                <View style={styles.vetNoticeHeader}>
                  <Ionicons name="medical" size={15} color={colors.primary} />
                  <Text style={styles.vetNoticeTitle}>Pre-Visit Instructions</Text>
                </View>
                <Text style={styles.vetNoticeItem}>
                  • Bring your pet on a leash (dogs) or in a secure ventilated carrier (cats).
                </Text>
                <Text style={styles.vetNoticeItem}>
                  • Arrive 10 minutes before your scheduled time slot for triage assessment.
                </Text>
                <Text style={styles.vetNoticeItem}>
                  • Anti-Rabies vaccination is free under City Health Ordinance.
                </Text>
              </View>

              {/* Ticket Actions */}
              <View style={styles.ticketActions}>
                <Button
                  title="View in Appointments"
                  variant="primary"
                  size="lg"
                  onPress={() => {
                    haptic.light();
                    router.replace('/appointments' as never);
                  }}
                  showPaw
                  fullWidth
                />
                <Button
                  title="Back to Health Passport"
                  variant="outline"
                  size="md"
                  onPress={() => {
                    haptic.light();
                    if (selectedPetId) {
                      router.replace(`/pets/${selectedPetId}` as never);
                    } else {
                      router.replace('/pets' as never);
                    }
                  }}
                  fullWidth
                />
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              key={step}
              entering={FadeInDown.duration(220)}
              exiting={FadeOut.duration(100)}
              style={styles.stepContainer}
            >
              {/* STEP 1: Select Pet */}
              {step === 1 && (
                <View style={styles.stepBlock}>
                  <Text style={styles.sectionHeading}>Who is this appointment for?</Text>
                  <Text style={styles.sectionSub}>
                    Select your registered pet to schedule their veterinary visit.
                  </Text>

                  <View style={styles.petsGrid}>
                    {allPets.map((p) => {
                      const isSelected = p.id === selectedPetId;
                      const isDog = p.species?.toLowerCase() === 'dog';
                      const vax = calculatePetVaccineTimeline(p, appointments);
                      const ageDisplay = p.birthYear ? formatAge(ageFromBirthYear(p.birthYear)) : '';

                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => {
                            haptic.light();
                            setSelectedPetId(p.id);
                            setError(undefined);
                          }}
                          style={[
                            styles.petSelectCard,
                            isSelected && styles.petSelectCardActive,
                            shadows.sm,
                          ]}
                        >
                          <PopoutPetAvatar
                            avatarId={p.avatarId}
                            species={p.species}
                            photoUrl={p.photoUrl}
                            size={76}
                            scale={1.55}
                          />

                          <View style={styles.petSelectInfo}>
                            {/* Top row: Name + Species */}
                            <View style={styles.petNameRow}>
                              <Text style={styles.petCardName}>{p.name}</Text>
                              <View
                                style={[
                                  styles.speciesChip,
                                  isDog ? styles.speciesChipDog : styles.speciesChipCat,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.speciesChipText,
                                    isDog ? styles.speciesChipTextDog : styles.speciesChipTextCat,
                                  ]}
                                >
                                  {isDog ? '🐶 Canine' : '🐱 Feline'}
                                </Text>
                              </View>
                            </View>

                            {/* Subtitle: Breed and Age */}
                            <Text style={styles.petCardBreed} numberOfLines={1}>
                              {p.breed || (isDog ? 'Dog' : 'Cat')}
                              {ageDisplay ? ` · ${ageDisplay}` : ''}
                            </Text>

                            {/* Clinical Vaccination Status & Frequency */}
                            <View style={styles.vaxStatusBox}>
                              <View style={styles.vaxBadgeRow}>
                                <View
                                  style={[
                                    styles.vaxDoseBadge,
                                    vax.isVaccinated
                                      ? styles.vaxDoseBadgeGreen
                                      : styles.vaxDoseBadgeAmber,
                                  ]}
                                >
                                  <Ionicons
                                    name={vax.isVaccinated ? 'shield-checkmark' : 'alert-circle'}
                                    size={12}
                                    color={vax.isVaccinated ? colors.success : colors.warning}
                                  />
                                  <Text
                                    style={[
                                      styles.vaxDoseBadgeText,
                                      vax.isVaccinated
                                        ? styles.vaxDoseBadgeTextGreen
                                        : styles.vaxDoseBadgeTextAmber,
                                    ]}
                                  >
                                    {vax.isVaccinated
                                      ? `${vax.totalDoses}x Vaccinated`
                                      : '0 Doses (Due)'}
                                  </Text>
                                </View>
                              </View>

                              {/* Vaccination Timing: Last Shot & Next Due Date */}
                              {vax.isVaccinated ? (
                                <View style={styles.vaxTimingRow}>
                                  {vax.lastVaccineDate ? (
                                    <Text style={styles.vaxTimingSub}>
                                      Last: {formatDateWithYear(vax.lastVaccineDate)}
                                    </Text>
                                  ) : null}
                                  {vax.nextBoosterDate ? (
                                    <Text style={styles.vaxTimingNext}>
                                      Next Due: {formatDateWithYear(vax.nextBoosterDate)}
                                    </Text>
                                  ) : null}
                                </View>
                              ) : (
                                <Text style={styles.vaxTimingDue}>
                                  ⚠️ Anti-Rabies vaccine due · Schedule now
                                </Text>
                              )}
                            </View>
                          </View>

                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleSelected,
                            ]}
                          >
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                        </Pressable>
                      );
                    })}

                    <Pressable
                      onPress={() => {
                        haptic.light();
                        router.push('/pets/add' as never);
                      }}
                      style={styles.addPetBtn}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.addPetBtnText}>Register Another Pet</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* STEP 2: Service Selection */}
              {step === 2 && (
                <View style={styles.stepBlock}>
                  <Text style={styles.sectionHeading}>Select Veterinary Service</Text>
                  <Text style={styles.sectionSub}>
                    Choose the municipal veterinary service needed for {selectedPet?.name}.
                  </Text>

                  <View style={styles.servicesGrid}>
                    {SERVICES.map((s) => {
                      const isSelected = s.id === selectedServiceId;
                      const isVaccine = s.id === 'vaccination';
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => {
                            haptic.light();
                            setSelectedServiceId(s.id);
                            setClinicalReason('');
                            setError(undefined);
                          }}
                          style={[
                            styles.serviceOptionCard,
                            isSelected && styles.serviceOptionCardActive,
                            shadows.sm,
                          ]}
                        >
                          <View
                            style={[
                              styles.serviceIconWrap,
                              { backgroundColor: s.bg },
                            ]}
                          >
                            <Ionicons name={s.icon} size={24} color={s.color} />
                          </View>

                          <View style={styles.serviceTextWrap}>
                            <View style={styles.serviceTitleRow}>
                              <Text style={styles.serviceOptionTitle}>{s.name}</Text>
                              {isVaccine && (
                                <View style={styles.freeBadge}>
                                  <Text style={styles.freeBadgeText}>Free Ordinance</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.serviceOptionDesc}>{s.tagline}</Text>
                          </View>

                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleSelected,
                            ]}
                          >
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Quick Clinical Reasons */}
                  {CLINICAL_REASONS[selectedServiceId] ? (
                    <View style={styles.reasonsSection}>
                      <Text style={styles.reasonsTitle}>Common Reasons for Visit:</Text>
                      <View style={styles.reasonsChips}>
                        {CLINICAL_REASONS[selectedServiceId].map((reason) => {
                          const isChipSelected = clinicalReason === reason;
                          return (
                            <Pressable
                              key={reason}
                              onPress={() => {
                                haptic.light();
                                setClinicalReason(isChipSelected ? '' : reason);
                              }}
                              style={[
                                styles.reasonChip,
                                isChipSelected && styles.reasonChipActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.reasonChipText,
                                  isChipSelected && styles.reasonChipTextActive,
                                ]}
                              >
                                {reason}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  {/* Notes input */}
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notes for the Veterinarian (Optional)</Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="e.g. Pet has slight cough, needs booster stamp on passport..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={3}
                      style={styles.notesInput}
                    />
                  </View>
                </View>
              )}

              {/* STEP 3: Date & Time Schedule */}
              {step === 3 && (
                <View style={styles.stepBlock}>
                  <Text style={styles.sectionHeading}>Pick Appointment Date & Time</Text>
                  <Text style={styles.sectionSub}>
                    Official clinic hours are Monday to Friday, 8:00 AM – 5:00 PM.
                  </Text>

                  {/* Date Selector */}
                  <Text style={styles.scheduleGroupLabel}>Select Date</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.datesScroll}
                  >
                    {dateOptions.map((opt) => {
                      const isSelected = opt.iso === dateISO;
                      return (
                        <Pressable
                          key={opt.iso}
                          onPress={() => {
                            haptic.light();
                            setDateISO(opt.iso);
                            setError(undefined);
                          }}
                          style={[
                            styles.datePill,
                            isSelected && styles.datePillActive,
                            shadows.sm,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dateWeekday,
                              isSelected && styles.dateWeekdayActive,
                            ]}
                          >
                            {opt.weekday}
                          </Text>
                          <Text
                            style={[
                              styles.dateLabel,
                              isSelected && styles.dateLabelActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Time Slots */}
                  <Text style={styles.scheduleGroupLabel}>Select Time Slot</Text>
                  <View style={styles.timeSlotsGrid}>
                    {TIME_SLOTS.map((slot) => {
                      const isSelected = slot === timeSlot;
                      return (
                        <Pressable
                          key={slot}
                          onPress={() => {
                            haptic.light();
                            setTimeSlot(slot);
                            setError(undefined);
                          }}
                          style={[
                            styles.timeSlotCard,
                            isSelected && styles.timeSlotCardActive,
                            shadows.sm,
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color={isSelected ? colors.primary : colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.timeSlotText,
                              isSelected && styles.timeSlotTextActive,
                            ]}
                          >
                            {slot}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* STEP 4: Review Summary */}
              {step === 4 && (
                <View style={styles.stepBlock}>
                  <Text style={styles.sectionHeading}>Review Appointment Details</Text>
                  <Text style={styles.sectionSub}>
                    Please verify your booking information before final confirmation.
                  </Text>

                  <View style={[styles.summaryCard, shadows.sm]}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Patient</Text>
                      <View style={styles.summaryValueCol}>
                        <Text style={styles.summaryValueBold}>{selectedPet?.name}</Text>
                        <Text style={styles.summaryValueSub}>{selectedPet?.breed}</Text>
                      </View>
                    </View>

                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Service</Text>
                      <View style={styles.summaryValueCol}>
                        <Text style={styles.summaryValueBold}>{selectedService.name}</Text>
                        <Text style={styles.summaryValueSub}>{selectedService.tagline}</Text>
                      </View>
                    </View>

                    {clinicalReason ? (
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Reason</Text>
                        <Text style={styles.summaryValueBold}>{clinicalReason}</Text>
                      </View>
                    ) : null}

                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Schedule</Text>
                      <View style={styles.summaryValueCol}>
                        <Text style={styles.summaryValueHighlight}>
                          {dateISO ? formatLongDate(dateISO) : ''}
                        </Text>
                        <Text style={styles.summaryValueSub}>{timeSlot}</Text>
                      </View>
                    </View>

                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Location</Text>
                      <Text style={styles.summaryValueBold}>{SERVICE_LOCATION}, CDO</Text>
                    </View>

                    {notes.trim() ? (
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Notes</Text>
                        <Text style={styles.summaryValueSub}>{notes.trim()}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>

        {/* Footer Navigation Bar */}
        {!confirmedTicket ? (
          <View style={styles.footer}>
            <Button
              title={step === TOTAL_STEPS ? 'Confirm & Book Appointment' : 'Continue'}
              variant="primary"
              size="lg"
              onPress={step === TOTAL_STEPS ? handleConfirmBooking : handleContinue}
              disabled={!canContinue}
              loading={submitting}
              showPaw
              fullWidth
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(7, 30, 38, 0.06)',
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(7, 30, 38, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  headerProgress: {
    flex: 1,
    marginHorizontal: spacing.md,
    gap: 6,
  },
  headerProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  stepCounter: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 168, 150, 0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  headerRightPlaceholder: {
    width: 36,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.20)',
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.captionBold,
    color: colors.error,
    fontSize: 12,
    flex: 1,
  },
  stepContainer: {
    gap: spacing.lg,
  },
  stepBlock: {
    gap: spacing.md,
  },
  sectionHeading: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },
  sectionSub: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: -4,
  },
  petsGrid: {
    gap: 10,
    marginTop: spacing.xs,
  },
  petSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(7, 30, 38, 0.08)',
  },
  petSelectCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FAF8',
  },
  petSelectInfo: {
    flex: 1,
    gap: 2,
  },
  petNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petCardName: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 16.5,
    fontWeight: '800',
  },
  speciesChip: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  speciesChipDog: {
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
  },
  speciesChipCat: {
    backgroundColor: 'rgba(219, 39, 119, 0.10)',
  },
  speciesChipText: {
    ...typography.captionBold,
    fontSize: 9.5,
  },
  speciesChipTextDog: {
    color: colors.primary,
  },
  speciesChipTextCat: {
    color: '#DB2777',
  },
  petCardBreed: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
  },
  vaxStatusBox: {
    marginTop: 4,
    gap: 3,
  },
  vaxBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaxDoseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  vaxDoseBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  vaxDoseBadgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  vaxDoseBadgeText: {
    ...typography.captionBold,
    fontSize: 10.5,
  },
  vaxDoseBadgeTextGreen: {
    color: colors.success,
  },
  vaxDoseBadgeTextAmber: {
    color: colors.warning,
  },
  vaxTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vaxTimingSub: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  vaxTimingNext: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11,
  },
  vaxTimingDue: {
    ...typography.small,
    color: colors.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textDisabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  addPetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    marginTop: 4,
  },
  addPetBtnText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 13,
  },
  servicesGrid: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  serviceOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(7, 30, 38, 0.08)',
  },
  serviceOptionCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FAF8',
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTextWrap: {
    flex: 1,
    gap: 2,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceOptionTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '700',
  },
  freeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  freeBadgeText: {
    ...typography.captionBold,
    color: colors.success,
    fontSize: 9.5,
  },
  serviceOptionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  reasonsSection: {
    gap: 8,
    marginTop: spacing.sm,
  },
  reasonsTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12.5,
  },
  reasonsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reasonChip: {
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonChipActive: {
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    borderColor: colors.primary,
  },
  reasonChipText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
  },
  reasonChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  notesSection: {
    gap: 6,
    marginTop: spacing.xs,
  },
  notesLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12.5,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.10)',
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  scheduleGroupLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  datesScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  datePill: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 86,
    borderWidth: 1.5,
    borderColor: 'rgba(7, 30, 38, 0.08)',
  },
  datePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateWeekday: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  dateWeekdayActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  dateLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  dateLabelActive: {
    color: colors.white,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotCard: {
    width: '31%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(7, 30, 38, 0.08)',
  },
  timeSlotCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FAF8',
  },
  timeSlotText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12.5,
  },
  timeSlotTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    gap: 14,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(7, 30, 38, 0.06)',
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    width: 70,
  },
  summaryValueCol: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 1,
  },
  summaryValueBold: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'right',
  },
  summaryValueSub: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
  },
  summaryValueHighlight: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    gap: 14,
    ...shadows.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(7, 30, 38, 0.08)',
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketBadgeText: {
    ...typography.captionBold,
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  ticketRef: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  ticketBody: {
    gap: 10,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
  },
  ticketValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13.5,
  },
  ticketValueHighlight: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  vetNoticeBox: {
    backgroundColor: '#F0FAF8',
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.15)',
    gap: 6,
  },
  vetNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vetNoticeTitle: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  vetNoticeItem: {
    ...typography.small,
    color: colors.textPrimary,
    fontSize: 11.5,
    lineHeight: 16,
  },
  ticketActions: {
    gap: 8,
    marginTop: 6,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(7, 30, 38, 0.06)',
    backgroundColor: colors.surface,
  },
});
