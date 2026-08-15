import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import { useUser } from '@clerk/expo';

import { colors, radius, shadows, spacing, typography } from '@theme';
import {
  SERVICES,
  SERVICE_LOCATION,
  MORNING_SLOTS,
  AFTERNOON_SLOTS,
  TIME_SLOTS,
  isSlotAvailable,
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
import { BackButton } from '@components/ui/BackButton';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { toast } from '@components/ui/Sonner';
import { updateClerkUnsafeMetadata } from '@lib/clerkMetadata';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<BookingStepIndex>);

const BOOKING_STEPS = [1, 2, 3, 4] as const;
type BookingStepIndex = (typeof BOOKING_STEPS)[number];

const STEP_SUBTITLES: Record<BookingStepIndex, string> = {
  1: 'Select Pet',
  2: 'Choose Service',
  3: 'Select Schedule',
  4: 'Review Booking',
};

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

interface SlideWrapperProps {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  children: React.ReactNode;
}

function SlideWrapper({ index, scrollX, width, children }: SlideWrapperProps) {
  const reducedMotion = useReducedMotion();
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.92, 1, 0.92], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <View style={{ width }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={[styles.slideInner, animatedStyle]}>
          {children}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

export default function NewAppointmentScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
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

  const listRef = useRef<FlatList<BookingStepIndex>>(null);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  // Load resident's real registered pets exclusively from Clerk metadata
  const allPets = useMemo(() => {
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];
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
  }, [clerkUser?.unsafeMetadata, ownerId]);

  // Initial form values derived from params
  const initialPetId = params.petId || (allPets.length > 0 ? allPets[0].id : undefined);
  const initialServiceId = params.serviceId || 'vaccination';

  const [step, setStep] = useState<BookingStepIndex>(1);
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

  const lastToastTimeRef = useRef<number>(0);

  const selectedPet = useMemo(
    () => allPets.find((p) => p.id === selectedPetId),
    [allPets, selectedPetId],
  );

  const selectedService = useMemo(
    () => getService(selectedServiceId) || SERVICES[0],
    [selectedServiceId],
  );

  // Available dates (Next 10 municipal business days: Monday to Friday)
  const dateOptions = useMemo(() => {
    const today = todayISO();
    const tomorrow = toISODate(addDays(1));
    const options: {
      iso: string;
      label: string;
      weekday: string;
      isToday: boolean;
      hasAvailableSlots: boolean;
    }[] = [];

    let daysAdded = 0;
    let offset = 0;
    while (daysAdded < 10) {
      const dateObj = addDays(offset);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const iso = toISODate(dateObj);

      if (!isWeekend) {
        const isToday = iso === today;
        const hasAvailableSlots = isToday
          ? TIME_SLOTS.some((s) => isSlotAvailable(iso, s))
          : true;

        options.push({
          iso,
          label: isToday ? 'Today' : iso === tomorrow ? 'Tomorrow' : formatShortDate(iso),
          weekday: formatWeekdayDate(iso).split(',')[0],
          isToday,
          hasAvailableSlots,
        });
        daysAdded++;
      }
      offset++;
    }
    return options;
  }, []);

  // Auto-select first available date with open slots
  useEffect(() => {
    if (!dateISO && dateOptions.length > 0) {
      const firstOpen = dateOptions.find((d) => d.hasAvailableSlots) || dateOptions[0];
      setDateISO(firstOpen.iso);
    }
  }, [dateOptions, dateISO]);

  // If selected time slot is unavailable on the chosen date, reset it
  useEffect(() => {
    if (dateISO && timeSlot) {
      if (!isSlotAvailable(dateISO, timeSlot)) {
        setTimeSlot(undefined);
      }
    }
  }, [dateISO, timeSlot]);

  const canAdvanceFromStep = useCallback(
    (currentStep: number): boolean => {
      if (currentStep === 1) {
        if (!selectedPetId) {
          haptic.warning();
          if (Date.now() - lastToastTimeRef.current > 1200) {
            lastToastTimeRef.current = Date.now();
            toast.error('Pet Selection Required', {
              id: 'booking-pet-required',
              description: 'Please select a pet to schedule this appointment.',
            });
          }
          return false;
        }
        return true;
      }
      if (currentStep === 2) {
        if (!selectedServiceId) {
          haptic.warning();
          if (Date.now() - lastToastTimeRef.current > 1200) {
            lastToastTimeRef.current = Date.now();
            toast.error('Service Required', {
              id: 'booking-service-required',
              description: 'Please choose a veterinary service for this visit.',
            });
          }
          return false;
        }
        return true;
      }
      if (currentStep === 3) {
        if (!dateISO || !timeSlot) {
          haptic.warning();
          if (Date.now() - lastToastTimeRef.current > 1200) {
            lastToastTimeRef.current = Date.now();
            toast.error('Schedule Required', {
              id: 'booking-schedule-required',
              description: 'Please select an appointment date and preferred time slot.',
            });
          }
          return false;
        }
        return true;
      }
      return true;
    },
    [selectedPetId, selectedServiceId, dateISO, timeSlot],
  );

  const goToSlide = useCallback(
    (index: number) => {
      setStep((index + 1) as BookingStepIndex);
      listRef.current?.scrollToOffset({ offset: index * width, animated: true });
    },
    [width],
  );

  const handleNextStep = useCallback(
    (currentPart: number) => {
      if (!canAdvanceFromStep(currentPart)) return;
      haptic.light();
      goToSlide(currentPart);
    },
    [canAdvanceFromStep, goToSlide],
  );

  const handlePrevStep = useCallback(
    (currentPart: number) => {
      haptic.light();
      goToSlide(currentPart - 2);
    },
    [goToSlide],
  );

  const handleStepPress = (targetStep: BookingStepIndex) => {
    haptic.light();
    if (targetStep < step) {
      goToSlide(targetStep - 1);
      return;
    }
    for (let s = step; s < targetStep; s++) {
      if (!canAdvanceFromStep(s)) {
        return;
      }
    }
    goToSlide(targetStep - 1);
  };

  const handleBack = () => {
    if (confirmedTicket || step === 1) {
      router.replace('/appointments' as never);
    } else {
      handlePrevStep(step);
    }
  };

  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const targetIndex = Math.round(e.nativeEvent.contentOffset.x / width);
      const targetStep = Math.max(1, Math.min(4, targetIndex + 1)) as BookingStepIndex;

      if (targetStep > step) {
        for (let s = step; s < targetStep; s++) {
          if (!canAdvanceFromStep(s)) {
            // Validation failed! Snap back to incomplete step
            listRef.current?.scrollToOffset({
              offset: (s - 1) * width,
              animated: true,
            });
            setStep(s as BookingStepIndex);
            return;
          }
        }
      }

      setStep(targetStep);
    },
    [width, step, canAdvanceFromStep],
  );

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
        id: 'appointment-scheduled-success',
        description: `${selectedService.name} for ${selectedPet.name} on ${formatShortDate(dateISO)}.`,
      });
    } catch (err: any) {
      console.log('Booking error:', err);
      setError('Could not confirm booking. Please try again.');
      haptic.error();
      toast.error('Booking Failed', {
        id: 'booking-failed-error',
        description: 'Unable to schedule this visit. Please check your connection and try again.',
      });
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

  const renderItem = useCallback(
    ({ item }: { item: BookingStepIndex }) => {
      const index = item - 1;

      if (item === 1) {
        return (
          <SlideWrapper index={index} scrollX={scrollX} width={width}>
            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionTitle}>Select Pet</Text>
              <Text style={styles.sectionDesc}>
                Choose your registered pet for this veterinary appointment.
              </Text>
            </View>

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
                            {isDog ? 'Canine' : 'Feline'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.petCardBreed} numberOfLines={1}>
                        {p.breed || (isDog ? 'Canine' : 'Feline')}
                        {ageDisplay ? ` · ${ageDisplay}` : ''}
                      </Text>

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
                            <Text
                              style={[
                                styles.vaxDoseBadgeText,
                                vax.isVaccinated
                                  ? styles.vaxDoseBadgeTextGreen
                                  : styles.vaxDoseBadgeTextAmber,
                              ]}
                            >
                              {vax.isVaccinated
                                ? `${vax.totalDoses} ${vax.totalDoses === 1 ? 'Dose' : 'Doses'} Recorded`
                                : '0 Doses (Vaccine Due)'}
                            </Text>
                          </View>
                        </View>

                        {vax.isVaccinated && vax.nextBoosterDate ? (
                          <Text style={styles.vaxTimingNext} numberOfLines={1}>
                            Next Booster: {formatDateWithYear(vax.nextBoosterDate)}
                          </Text>
                        ) : !vax.isVaccinated ? (
                          <Text style={styles.vaxTimingDue} numberOfLines={1}>
                            Anti-Rabies due · Schedule now
                          </Text>
                        ) : null}
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

            {/* Swipe to continue prompt */}
            <Pressable
              onPress={() => handleNextStep(1)}
              style={styles.swipePromptPill}
              accessibilityRole="button"
              accessibilityLabel="Swipe or tap to proceed to Service Selection"
            >
              <Text style={styles.swipePromptText}>Swipe or tap to continue</Text>
              <View style={styles.swipePromptIconWrap}>
                <Ionicons name="arrow-forward" size={13} color={colors.primary} />
              </View>
            </Pressable>
          </SlideWrapper>
        );
      }

      if (item === 2) {
        return (
          <SlideWrapper index={index} scrollX={scrollX} width={width}>
            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionTitle}>Veterinary Service</Text>
              <Text style={styles.sectionDesc}>
                Choose municipal service needed for {selectedPet?.name || 'your pet'}.
              </Text>
            </View>

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

            {/* Swipe to continue prompt */}
            <Pressable
              onPress={() => handleNextStep(2)}
              style={styles.swipePromptPill}
              accessibilityRole="button"
              accessibilityLabel="Swipe or tap to proceed to Schedule Selection"
            >
              <Text style={styles.swipePromptText}>Swipe or tap to continue</Text>
              <View style={styles.swipePromptIconWrap}>
                <Ionicons name="arrow-forward" size={13} color={colors.primary} />
              </View>
            </Pressable>
          </SlideWrapper>
        );
      }

      if (item === 3) {
        return (
          <SlideWrapper index={index} scrollX={scrollX} width={width}>
            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionTitle}>Date & Time Schedule</Text>
              <Text style={styles.sectionDesc}>
                Official clinic hours are Monday to Friday, 8:00 AM – 5:00 PM.
              </Text>
            </View>

            {/* Date Selector */}
            <Text style={styles.scheduleGroupLabel}>Select Date (Monday – Friday)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.datesScroll}
            >
              {dateOptions.map((opt) => {
                const isSelected = opt.iso === dateISO;
                const isClosed = !opt.hasAvailableSlots;

                return (
                  <Pressable
                    key={opt.iso}
                    onPress={() => {
                      if (isClosed) {
                        haptic.warning();
                        return;
                      }
                      haptic.light();
                      setDateISO(opt.iso);
                      setError(undefined);
                    }}
                    style={[
                      styles.datePill,
                      isSelected && styles.datePillActive,
                      isClosed && styles.datePillDisabled,
                      shadows.sm,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateWeekday,
                        isSelected && styles.dateWeekdayActive,
                        isClosed && styles.dateWeekdayDisabled,
                      ]}
                    >
                      {opt.weekday}
                    </Text>
                    <Text
                      style={[
                        styles.dateLabel,
                        isSelected && styles.dateLabelActive,
                        isClosed && styles.dateLabelDisabled,
                      ]}
                    >
                      {isClosed && opt.isToday ? 'Closed Today' : opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Morning Session Time Slots */}
            <View style={styles.sessionHeaderRow}>
              <Ionicons name="sunny-outline" size={16} color={colors.warning} />
              <Text style={styles.sessionHeaderTitle}>Morning Session (8:30 AM – 11:30 AM)</Text>
            </View>
            <View style={styles.timeSlotsGrid}>
              {MORNING_SLOTS.map((slot) => {
                const isSelected = slot === timeSlot;
                const available = isSlotAvailable(dateISO || '', slot);

                return (
                  <Pressable
                    key={slot}
                    onPress={() => {
                      if (!available) {
                        haptic.warning();
                        return;
                      }
                      haptic.light();
                      setTimeSlot(slot);
                      setError(undefined);
                    }}
                    style={[
                      styles.timeSlotCard,
                      isSelected && styles.timeSlotCardActive,
                      !available && styles.timeSlotCardDisabled,
                      shadows.sm,
                    ]}
                  >
                    <Ionicons
                      name={available ? 'time-outline' : 'close-circle-outline'}
                      size={16}
                      color={
                        !available
                          ? colors.textDisabled
                          : isSelected
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <View style={styles.slotTextWrap}>
                      <Text
                        style={[
                          styles.timeSlotText,
                          isSelected && styles.timeSlotTextActive,
                          !available && styles.timeSlotTextDisabled,
                        ]}
                      >
                        {slot}
                      </Text>
                      {!available && (
                        <Text style={styles.slotUnavailableTag}>Passed</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Afternoon Session Time Slots */}
            <View style={[styles.sessionHeaderRow, { marginTop: spacing.sm }]}>
              <Ionicons name="partly-sunny-outline" size={16} color={colors.primary} />
              <Text style={styles.sessionHeaderTitle}>Afternoon Session (1:30 PM – 4:30 PM)</Text>
            </View>
            <View style={styles.timeSlotsGrid}>
              {AFTERNOON_SLOTS.map((slot) => {
                const isSelected = slot === timeSlot;
                const available = isSlotAvailable(dateISO || '', slot);

                return (
                  <Pressable
                    key={slot}
                    onPress={() => {
                      if (!available) {
                        haptic.warning();
                        return;
                      }
                      haptic.light();
                      setTimeSlot(slot);
                      setError(undefined);
                    }}
                    style={[
                      styles.timeSlotCard,
                      isSelected && styles.timeSlotCardActive,
                      !available && styles.timeSlotCardDisabled,
                      shadows.sm,
                    ]}
                  >
                    <Ionicons
                      name={available ? 'time-outline' : 'close-circle-outline'}
                      size={16}
                      color={
                        !available
                          ? colors.textDisabled
                          : isSelected
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <View style={styles.slotTextWrap}>
                      <Text
                        style={[
                          styles.timeSlotText,
                          isSelected && styles.timeSlotTextActive,
                          !available && styles.timeSlotTextDisabled,
                        ]}
                      >
                        {slot}
                      </Text>
                      {!available && (
                        <Text style={styles.slotUnavailableTag}>Passed</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Swipe to continue prompt */}
            <Pressable
              onPress={() => handleNextStep(3)}
              style={styles.swipePromptPill}
              accessibilityRole="button"
              accessibilityLabel="Swipe or tap to proceed to Review Details"
            >
              <Text style={styles.swipePromptText}>Swipe or tap to continue</Text>
              <View style={styles.swipePromptIconWrap}>
                <Ionicons name="arrow-forward" size={13} color={colors.primary} />
              </View>
            </Pressable>
          </SlideWrapper>
        );
      }

      // Step 4: Review Summary
      return (
        <SlideWrapper index={index} scrollX={scrollX} width={width}>
          <View style={styles.sectionHeadingWrap}>
            <Text style={styles.sectionTitle}>Review & Confirm</Text>
            <Text style={styles.sectionDesc}>
              Please verify your booking details before final scheduling.
            </Text>
          </View>

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

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.finalSubmitRow}>
            <Button
              title="Confirm & Book Appointment"
              variant="primary"
              size="lg"
              onPress={handleConfirmBooking}
              loading={submitting}
              disabled={submitting}
              showPaw
              fullWidth
            />
          </View>
        </SlideWrapper>
      );
    },
    [
      scrollX,
      width,
      allPets,
      selectedPetId,
      appointments,
      selectedPet,
      selectedService,
      selectedServiceId,
      clinicalReason,
      notes,
      dateOptions,
      dateISO,
      timeSlot,
      submitting,
      error,
      handleNextStep,
      handleConfirmBooking,
      router,
    ],
  );

  if (confirmedTicket) {
    return (
      <AnimatedScreen animation="zoom">
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {/* Top Header Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarRow}>
              <BackButton onPress={() => router.replace('/appointments' as never)} />
              <View style={styles.headerTitleWrap}>
                <Text style={styles.topBarTitle}>Booking Confirmed</Text>
                <Text style={styles.topBarSubtitle}>Official Municipal Ticket</Text>
              </View>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Confirmation Ticket Slip */}
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
          </ScrollView>
        </SafeAreaView>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen animation="zoom">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          {/* Top Header with Back Navigation & Step Capsule */}
          <View style={styles.topBar}>
            <View style={styles.topBarRow}>
              <BackButton onPress={handleBack} />
              <View style={styles.headerTitleWrap}>
                <Text style={styles.topBarTitle}>Schedule Clinic Visit</Text>
                <Text style={styles.topBarSubtitle}>
                  {step === 1
                    ? 'Step 1 of 4: Select Pet'
                    : step === 2
                    ? 'Step 2 of 4: Choose Service'
                    : step === 3
                    ? 'Step 3 of 4: Select Schedule'
                    : 'Step 4 of 4: Review Booking'}
                </Text>
              </View>
              <View style={styles.stepCapsule}>
                <Text style={styles.stepCapsuleText}>Step {step} of 4</Text>
              </View>
            </View>

            {/* Multi-Segment Connected Progress Track */}
            <View style={styles.progressTrackRow}>
              {BOOKING_STEPS.map((s) => {
                const isFilled = s <= step;
                return (
                  <Pressable
                    key={s}
                    onPress={() => handleStepPress(s)}
                    style={styles.progressSegmentTouch}
                    hitSlop={8}
                  >
                    <View
                      style={[
                        styles.progressSegment,
                        isFilled ? styles.progressSegmentFilled : styles.progressSegmentUnfilled,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Animated Horizontal FlatList Wizard */}
          <AnimatedFlatList
            ref={listRef}
            data={BOOKING_STEPS}
            keyExtractor={(item) => String(item)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={scrollHandler}
            onMomentumScrollEnd={onMomentumScrollEnd}
            renderItem={renderItem}
            style={styles.flatList}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AnimatedScreen>
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
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(7, 30, 38, 0.05)',
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 1,
  },
  topBarTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  topBarSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  stepCapsule: {
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.16)',
  },
  stepCapsuleText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrackRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  progressSegmentTouch: {
    flex: 1,
    paddingVertical: 4,
  },
  progressSegment: {
    height: 4,
    borderRadius: 2,
  },
  progressSegmentFilled: {
    backgroundColor: colors.primary,
  },
  progressSegmentUnfilled: {
    backgroundColor: 'rgba(7, 30, 38, 0.08)',
  },
  flatList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110,
  },
  slideInner: {
    gap: spacing.md,
  },
  sectionHeadingWrap: {
    marginBottom: 4,
  },
  sectionTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  sectionDesc: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
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
    marginTop: 4,
  },
  errorText: {
    ...typography.captionBold,
    color: colors.error,
    fontSize: 12,
    flex: 1,
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
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 14.5,
    fontFamily: typography.font.bold,
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
    fontFamily: typography.font.bold,
  },
  serviceOptionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  reasonsSection: {
    gap: 8,
    marginTop: spacing.sm,
  },
  reasonsTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
    fontFamily: typography.font.bold,
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
    fontSize: 11.5,
  },
  reasonChipTextActive: {
    color: colors.primaryDark,
    fontFamily: typography.font.bold,
  },
  notesSection: {
    gap: 6,
    marginTop: spacing.xs,
  },
  notesLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
    fontFamily: typography.font.bold,
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
    fontSize: 12.5,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  scheduleGroupLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12.5,
    fontFamily: typography.font.bold,
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
  datePillDisabled: {
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    borderColor: 'rgba(7, 30, 38, 0.05)',
    opacity: 0.55,
  },
  dateWeekday: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  dateWeekdayActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  dateWeekdayDisabled: {
    color: colors.textMuted,
  },
  dateLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: typography.font.bold,
  },
  dateLabelActive: {
    color: colors.white,
  },
  dateLabelDisabled: {
    color: colors.textMuted,
    fontSize: 11.5,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  sessionHeaderTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
    fontFamily: typography.font.bold,
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
    paddingVertical: 11,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(7, 30, 38, 0.08)',
  },
  timeSlotCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FAF8',
  },
  timeSlotCardDisabled: {
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    borderColor: 'rgba(7, 30, 38, 0.05)',
    opacity: 0.5,
  },
  slotTextWrap: {
    alignItems: 'center',
  },
  timeSlotText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
    fontFamily: typography.font.bold,
  },
  timeSlotTextActive: {
    color: colors.primaryDark,
    fontFamily: typography.font.bold,
  },
  timeSlotTextDisabled: {
    color: colors.textDisabled,
  },
  slotUnavailableTag: {
    ...typography.small,
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: -2,
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
  swipePromptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.18)',
    marginTop: spacing.md,
  },
  swipePromptText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  swipePromptIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.15)',
  },
  finalSubmitRow: {
    marginTop: spacing.md,
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
});
