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
  TIME_SLOTS,
  isSlotAvailable,
  getService,
  normalizeServiceId,
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
import {
  getServiceUnavailableMessage,
  getVaccinationDueDate,
  isServiceUnavailableForPet,
  isVaccinationCurrent,
} from '@lib/petHealth';
import { normalizeAppointmentStatus } from '@services/data/types';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { PopoutPetAvatar } from '@components/ui/PopoutPetAvatar';
import { Button } from '@components/ui/Button';
import { BackButton } from '@components/ui/BackButton';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { toast } from '@components/ui/Sonner';

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
  // Only completed visits count as vaccination. A future booking must not make
  // the pet look already vaccinated and disable its own service.
  const vaxAppts = (appointments || [])
    .filter(
      (a) =>
        a.petId === pet.id &&
        normalizeServiceId(a.serviceId) === 'vaccination' &&
        normalizeAppointmentStatus(a.status) === 'completed',
    )
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const doseCountFromAppts = vaxAppts.length;
  const isVaccinated = Boolean(pet.isVaccinated) || doseCountFromAppts > 0;
  const totalDoses = Math.max(isVaccinated ? 1 : 0, doseCountFromAppts, pet.vaccinationDoses || 0);

  const lastVaccineDate =
    vaxAppts[0]?.date ||
    pet.lastVaccinationDate ||
    (isVaccinated && pet.createdAt ? String(pet.createdAt).split('T')[0] : undefined);

  const nextBoosterDate = getVaccinationDueDate({
    ...pet,
    isVaccinated,
    lastVaccinationDate: lastVaccineDate,
  });

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
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        bounces={false}
        automaticallyAdjustKeyboardInsets={true}
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
  const ownerId = clerkUser?.id || useAuthStore((state) => state.user?.id) || '';
  const localPets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);
  const bookAppointment = useDataStore((state) => state.bookAppointment);

  const listRef = useRef<FlatList<BookingStepIndex>>(null);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  // Load resident's real registered pets (local-first with offline support)
  const allPets = localPets || [];

  // Initial form values derived from params
  const initialPetId = params.petId || (allPets.length > 0 ? allPets[0].id : undefined);
  const initialServiceId = params.serviceId
    ? normalizeServiceId(params.serviceId)
    : 'vaccination';

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

  // Active appointments for the selected pet (status is pending or confirmed, not cancelled or completed)
  const activePetAppointments = useMemo(() => {
    if (!selectedPetId && !selectedPet?.name) return [];
    const pool = appointments || [];

    return pool.filter((a) => {
      if (!a) return false;
      const status = normalizeAppointmentStatus(a.status);
      const isFinished = status === 'cancelled' || status === 'completed';
      if (isFinished) return false;
      const matchesId = a.petId === selectedPetId;
      const matchesName = selectedPet?.name
        ? (a.petName || '').toLowerCase().trim() === selectedPet.name.toLowerCase().trim()
        : false;
      return matchesId || matchesName;
    });
  }, [appointments, selectedPetId, selectedPet?.name]);

  // Map of serviceId -> active appointment for the selected pet
  const activeServiceAppointmentsMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const appt of activePetAppointments) {
      if (appt.serviceId) {
        map.set(normalizeServiceId(appt.serviceId), appt);
      }
    }
    return map;
  }, [activePetAppointments]);

  // Keep the service the resident explicitly chose. Duplicate or ineligible
  // services are blocked by validation instead of silently switching to another
  // service (e.g. consultation turning into vaccination).
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

  // A pet can have multiple visits. Only reject a real conflict: the same
  // service on the same date, or two visits in the same time slot.
  const findScheduleConflict = useCallback(
    (targetDate: string, targetTimeSlot: string) => {
      const petName = (selectedPet?.name || '').trim().toLowerCase();
      const targetService = normalizeServiceId(selectedServiceId);

      return (appointments || []).find((a) => {
        const status = normalizeAppointmentStatus(a.status);
        if (status === 'completed' || status === 'cancelled') return false;

        const matchesPet =
          (Boolean(selectedPetId) && a.petId === selectedPetId) ||
          (Boolean(petName) && (a.petName || '').trim().toLowerCase() === petName);
        if (!matchesPet || a.date !== targetDate) return false;

        const sameService = normalizeServiceId(a.serviceId) === targetService;
        const sameTimeSlot = a.timeSlot === targetTimeSlot;
        return sameService || sameTimeSlot;
      });
    },
    [appointments, selectedPetId, selectedPet?.name, selectedServiceId],
  );

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
        if (selectedServiceId === 'spay-neuter' && selectedPet?.isSpayedNeutered) {
          haptic.warning();
          if (Date.now() - lastToastTimeRef.current > 1200) {
            lastToastTimeRef.current = Date.now();
            toast.error('Spay / Neuter Unavailable', {
              id: 'booking-spay-disabled',
              description: `${selectedPet?.name || 'This pet'} is already recorded as spayed/neutered.`,
            });
          }
          return false;
        }
        if (
          normalizeServiceId(selectedServiceId) === 'vaccination' &&
          isVaccinationCurrent(selectedPet)
        ) {
          haptic.warning();
          if (Date.now() - lastToastTimeRef.current > 1200) {
            lastToastTimeRef.current = Date.now();
            toast.error('Vaccination Unavailable', {
              id: 'booking-vaccination-disabled',
              description:
                getServiceUnavailableMessage(selectedPet, 'vaccination') ||
                'This pet is already vaccinated and is not due for a booster yet.',
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

        const conflict = findScheduleConflict(dateISO, timeSlot);
        if (conflict) {
          haptic.warning();
          if (Date.now() - lastToastTimeRef.current > 1200) {
            lastToastTimeRef.current = Date.now();
            const conflictService = getService(conflict.serviceId)?.name || 'another visit';
            toast.error('Schedule Conflict', {
              id: 'booking-schedule-conflict',
              description: `${selectedPet?.name || 'This pet'} already has ${conflictService} on ${formatShortDate(dateISO)} at ${conflict.timeSlot}. Choose another date or time.`,
            });
          }
          return false;
        }
        return true;
      }
      return true;
    },
    [
      selectedPetId,
      selectedPet,
      selectedServiceId,
      selectedService,
      dateISO,
      timeSlot,
      findScheduleConflict,
    ],
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

    if (isServiceUnavailableForPet(selectedPet, selectedService.id)) {
      haptic.warning();
      setError(
        getServiceUnavailableMessage(selectedPet, selectedService.id) ||
          'This service is no longer needed for the selected pet.',
      );
      return;
    }

    if (findScheduleConflict(dateISO, timeSlot)) {
      haptic.warning();
      setError('That date or time is already booked for this pet. Choose another slot.');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const fullNotes = [clinicalReason, notes.trim()].filter(Boolean).join(' — ');

      const newAppointment = await bookAppointment(
        ownerId,
        {
          petId: selectedPet.id,
          petName: selectedPet.name,
          serviceId: normalizeServiceId(selectedService.id),
          date: dateISO,
          timeSlot,
          location: SERVICE_LOCATION,
          notes: fullNotes || undefined,
        },
        clerkUser,
      );

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
        description: 'Unable to schedule this visit. Please try again.',
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
    findScheduleConflict,
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

            {/* Continue to Service Selection */}
            <Pressable
              onPress={() => handleNextStep(1)}
              style={styles.swipePromptPill}
              accessibilityRole="button"
              accessibilityLabel="Proceed to Service Selection"
            >
              <Text style={styles.swipePromptText}>Continue to Service Selection</Text>
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
                const isVaccinationDisabled = Boolean(
                  selectedPet && s.id === 'vaccination' && isVaccinationCurrent(selectedPet),
                );
                const isSpayNeuterDisabled = Boolean(
                  selectedPet?.isSpayedNeutered && s.id === 'spay-neuter',
                );
                const isCompletedService = isVaccinationDisabled || isSpayNeuterDisabled;
                const completedBadge = isVaccinationDisabled
                  ? 'Vaccinated'
                  : isSpayNeuterDisabled
                  ? 'Kapon'
                  : undefined;
                const existingAppt = activeServiceAppointmentsMap.get(s.id);
                const isAlreadyScheduled = Boolean(existingAppt);
                const isDisabled = isCompletedService;

                return (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      if (isCompletedService) {
                        haptic.warning();
                        toast.info(
                          isVaccinationDisabled ? 'Already Vaccinated' : 'Already Spayed / Neutered',
                          {
                            id: `booking-${s.id}-disabled-toast`,
                            description:
                              getServiceUnavailableMessage(selectedPet, s.id) ||
                              'This service is no longer needed for the selected pet.',
                          },
                        );
                        return;
                      }
                      haptic.light();
                      setSelectedServiceId(s.id);
                      setClinicalReason('');
                      setError(undefined);
                    }}
                    style={[
                      styles.serviceOptionCard,
                      isSelected && styles.serviceOptionCardActive,
                      isDisabled && styles.serviceOptionCardDisabled,
                      shadows.sm,
                    ]}
                    accessibilityState={{ disabled: isDisabled }}
                  >
                    <View
                      style={[
                        styles.serviceIconWrap,
                        {
                          backgroundColor: isCompletedService
                            ? '#F1F5F9'
                            : isAlreadyScheduled
                            ? 'rgba(14, 116, 144, 0.08)'
                            : s.bg,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          isCompletedService
                            ? 'checkmark-circle'
                            : isAlreadyScheduled
                            ? 'calendar'
                            : s.icon
                        }
                        size={24}
                        color={
                          isCompletedService
                            ? colors.success
                            : isAlreadyScheduled
                            ? colors.info
                            : s.color
                        }
                      />
                    </View>

                    <View style={styles.serviceTextWrap}>
                      <View style={styles.serviceTitleRow}>
                        <Text
                          style={[
                            styles.serviceOptionTitle,
                            isDisabled && styles.serviceOptionTitleDisabled,
                          ]}
                        >
                          {s.name}
                        </Text>
                        {isVaccine && !isDisabled && (
                          <View style={styles.freeBadge}>
                            <Text style={styles.freeBadgeText}>Free Ordinance</Text>
                          </View>
                        )}
                        {completedBadge && (
                          <View style={styles.alreadyKaponBadge}>
                            <Ionicons name="checkmark" size={10} color={colors.success} />
                            <Text style={styles.alreadyKaponBadgeText}>{completedBadge}</Text>
                          </View>
                        )}
                        {isAlreadyScheduled && (
                          <View style={styles.alreadyScheduledBadge}>
                            <Ionicons name="calendar-outline" size={10} color={colors.info} />
                            <Text style={styles.alreadyScheduledBadgeText}>Scheduled</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.serviceOptionDesc}>
                        {isVaccinationDisabled
                          ? getServiceUnavailableMessage(selectedPet, 'vaccination') ||
                            `${selectedPet?.name || 'Pet'} is already vaccinated.`
                          : isSpayNeuterDisabled
                          ? `${selectedPet?.name || 'Pet'} is already spayed/neutered. Procedure not needed.`
                          : isAlreadyScheduled
                          ? `Already scheduled on ${formatShortDate(existingAppt.date)}${existingAppt.timeSlot ? ` (${existingAppt.timeSlot})` : ''}. Choose another service.`
                          : s.tagline}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                        isDisabled && styles.radioCircleDisabled,
                      ]}
                    >
                      {isSelected && !isDisabled && <View style={styles.radioDot} />}
                      {isDisabled && (
                        <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
                      )}
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

            {/* Continue to Schedule Selection */}
            <Pressable
              onPress={() => handleNextStep(2)}
              style={styles.swipePromptPill}
              accessibilityRole="button"
              accessibilityLabel="Proceed to Schedule Selection"
            >
              <Text style={styles.swipePromptText}>Continue to Schedule Selection</Text>
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
              nestedScrollEnabled={true}
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

            {/* Clinic Hours: 8:00 AM – 5:00 PM */}
            <View style={styles.sessionHeaderRow}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text style={styles.sessionHeaderTitle}>Available Time Slots · 8:00 AM – 5:00 PM</Text>
            </View>
            <View style={styles.timeSlotsGrid}>
              {TIME_SLOTS.map((slot) => {
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


            {/* Continue to Review Details */}
            <Pressable
              onPress={() => handleNextStep(3)}
              style={styles.swipePromptPill}
              accessibilityRole="button"
              accessibilityLabel="Proceed to Review Details"
            >
              <Text style={styles.swipePromptText}>Continue to Review & Confirm</Text>
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
            {/* Confirmation Slip */}
            <Animated.View entering={ZoomIn.duration(260)} style={styles.ticketCard}>
              <View style={styles.ticketHero}>
                <View style={styles.ticketSuccessIcon}>
                  <Ionicons name="checkmark" size={30} color={colors.white} />
                </View>
                <Text style={styles.ticketHeroTitle}>Booking Confirmed</Text>
                <Text style={styles.ticketHeroSubtitle}>
                  Your visit is reserved. Present this slip at the clinic desk.
                </Text>
                <View style={styles.ticketRefWrap}>
                  <Text style={styles.ticketRefLabel}>REFERENCE NUMBER</Text>
                  <Text style={styles.ticketRefValue}>{confirmedTicket.refNumber}</Text>
                </View>
              </View>

              <View style={styles.ticketDivider} />

              <View style={styles.ticketDetails}>
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
                <View style={styles.ticketRowLast}>
                  <Text style={styles.ticketLabel}>Location</Text>
                  <Text style={styles.ticketValue}>{SERVICE_LOCATION}, CDO</Text>
                </View>
              </View>

              {/* Plain pre-visit reminders — no nested card */}
              <View style={styles.noticeSection}>
                <Text style={styles.noticeTitle}>Before Your Visit</Text>
                <View style={styles.noticeItemRow}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} />
                  <Text style={styles.noticeItemText}>
                    Bring your pet on a leash (dogs) or in a secure ventilated carrier (cats).
                  </Text>
                </View>
                <View style={styles.noticeItemRow}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} />
                  <Text style={styles.noticeItemText}>
                    Arrive 10 minutes before your scheduled time slot for triage assessment.
                  </Text>
                </View>
                <View style={styles.noticeItemRow}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} />
                  <Text style={styles.noticeItemText}>
                    Anti-Rabies vaccination is free under City Health Ordinance.
                  </Text>
                </View>
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
            scrollEnabled={false}
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
    paddingBottom: 220,
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
  serviceOptionCardDisabled: {
    opacity: 0.62,
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(7, 30, 38, 0.05)',
  },
  serviceOptionTitleDisabled: {
    color: colors.textSecondary,
  },
  alreadyKaponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  alreadyKaponBadgeText: {
    ...typography.captionBold,
    color: colors.success,
    fontSize: 9.5,
    fontFamily: typography.font.bold,
  },
  alreadyScheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(14, 116, 144, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  alreadyScheduledBadgeText: {
    ...typography.captionBold,
    color: colors.info,
    fontSize: 9.5,
    fontFamily: typography.font.bold,
  },
  radioCircleDisabled: {
    borderColor: 'rgba(7, 30, 38, 0.12)',
    backgroundColor: '#F1F5F9',
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    ...shadows.md,
  },
  ticketHero: {
    alignItems: 'center',
  },
  ticketSuccessIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ticketHeroTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  ticketHeroSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  ticketRefWrap: {
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: 3,
  },
  ticketRefLabel: {
    ...typography.smallBold,
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  ticketRefValue: {
    ...typography.title,
    color: colors.primary,
    fontFamily: typography.font.bold,
    fontSize: 18,
    letterSpacing: 0.6,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  ticketDetails: {
    gap: 0,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  ticketRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 12,
  },
  ticketLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 13,
  },
  ticketValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
    textAlign: 'right',
    flexShrink: 1,
  },
  ticketValueHighlight: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 14,
    textAlign: 'right',
    flexShrink: 1,
  },
  noticeSection: {
    marginTop: spacing.lg,
    gap: 10,
  },
  noticeTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    marginBottom: 2,
  },
  noticeItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noticeItemText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  ticketActions: {
    gap: 10,
    marginTop: spacing.xl,
  },
});
