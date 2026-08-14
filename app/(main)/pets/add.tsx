import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { required } from '@lib/validation';
import { haptic } from '@lib/haptics';
import { currentYear } from '@lib/format';
import { getPetAvatarSource } from '@lib/petAvatars';
import { useForm } from '@hooks/useForm';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import type { PetGender, Species } from '@services/data';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { BackButton } from '@components/ui/BackButton';
import { Stepper } from '@components/ui/Stepper';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { VisualChoiceCards } from '@components/ui/VisualChoiceCards';
import { DropdownSelect } from '@components/ui/DropdownSelect';
import { ChoiceChips } from '@components/ui/ChoiceChips';
import { PetAvatarPickerModal } from '@components/ui/PetAvatarPickerModal';
import { PopoutPetAvatar } from '@components/ui/PopoutPetAvatar';
import { updateClerkUnsafeMetadata } from '@lib/clerkMetadata';
import { toast } from '@components/ui/Sonner';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<SubPartIndex>);

const SUB_PARTS = [1, 2, 3, 4] as const;
type SubPartIndex = (typeof SUB_PARTS)[number];

const PART_SUBTITLES: Record<SubPartIndex, string> = {
  1: 'Part 1 of 4: Species & Name',
  2: 'Part 2 of 4: Breed & Age',
  3: 'Part 3 of 4: Health & Vaccines',
  4: 'Part 4 of 4: Care Profile',
};

const DOG_BREEDS = [
  'Aspin (Asong Pinoy)',
  'Shih Tzu',
  'Golden Retriever',
  'Pomeranian',
  'Poodle',
  'Labrador Retriever',
  'Beagle',
  'Siberian Husky',
  'German Shepherd',
  'French Bulldog',
  'Chihuahua',
  'Pug',
  'Corgi',
  'Rottweiler',
  'Dachshund',
  'Pitbull / American Bully',
  'Doberman',
  'Mixed Breed / Crossbreed',
];

const CAT_BREEDS = [
  'Puspin (Pusang Pinoy)',
  'Persian',
  'Siamese',
  'British Shorthair',
  'Domestic Short Hair',
  'Maine Coon',
  'Bengal',
  'Ragdoll',
  'Scottish Fold',
  'Russian Blue',
  'Sphynx',
  'Mixed Breed / Crossbreed',
];

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

export default function AddPetScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const addPet = useDataStore((state) => state.addPet);
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState<string | undefined>();

  const listRef = useRef<FlatList<SubPartIndex>>(null);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  // Sub-step wizard state (1 to 4)
  const [subPart, setSubPart] = useState<SubPartIndex>(1);

  // Form Fields
  const [species, setSpecies] = useState<Species>('dog');
  const [gender, setGender] = useState<PetGender>('male');
  const [age, setAge] = useState(1);
  const [isVaccinated, setIsVaccinated] = useState<'yes' | 'no' | 'unknown'>('yes');
  const [isSpayedNeutered, setIsSpayedNeutered] = useState<'yes' | 'no' | 'unknown'>('no');
  const [weightCategory, setWeightCategory] = useState<string>('medium');
  const [notes, setNotes] = useState('');

  // Pet Profile Avatar State
  const [avatarId, setAvatarId] = useState<string | undefined>();
  const [customPhotoUri, setCustomPhotoUri] = useState<string | undefined>();
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  const { fields, setValue, validateField, validateAll } = useForm(
    { name: '', breed: '' },
    {
      name: [required('Please enter your pet’s name.')],
      breed: [required('Please select or specify your pet’s breed.')],
    },
  );

  const breedOptions = useMemo(
    () => (species === 'dog' ? DOG_BREEDS : CAT_BREEDS),
    [species],
  );

  const handleSpeciesChange = (newSpecies: Species) => {
    haptic.light();
    setSpecies(newSpecies);
    setAvatarId(undefined);
    setCustomPhotoUri(undefined);
    setValue('breed', '');
  };

  const handleBreedPreset = (breedName: string) => {
    haptic.light();
    setValue('breed', breedName);
    validateField('breed');
  };

  const goToSlide = useCallback(
    (index: number) => {
      setSubPart((index + 1) as SubPartIndex);
      listRef.current?.scrollToOffset({ offset: index * width, animated: true });
    },
    [width],
  );

  const handleNextSubPart = useCallback(
    (currentPart: number) => {
      haptic.light();
      goToSlide(currentPart);
    },
    [goToSlide],
  );

  const handlePrevSubPart = useCallback(
    (currentPart: number) => {
      haptic.light();
      goToSlide(currentPart - 2);
    },
    [goToSlide],
  );

  const handlePart1Next = () => {
    if (!validateField('name')) {
      haptic.warning();
      return;
    }
    handleNextSubPart(1);
  };

  const handlePart2Next = () => {
    if (!validateField('breed')) {
      haptic.warning();
      return;
    }
    handleNextSubPart(2);
  };

  const handlePart3Next = () => {
    handleNextSubPart(3);
  };

  const handlePrevious = () => {
    if (subPart === 1) {
      router.back();
    } else {
      handlePrevSubPart(subPart);
    }
  };

  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      const target = Math.max(1, Math.min(4, index + 1)) as SubPartIndex;
      setSubPart(target);
    },
    [width],
  );

  const handleSelectAvatar = (id: string, customUri?: string) => {
    if (id === 'custom' && customUri) {
      setCustomPhotoUri(customUri);
      setAvatarId(undefined);
    } else {
      setAvatarId(id);
      setCustomPhotoUri(undefined);
    }
  };

  const handleSaveComplete = useCallback(async () => {
    const ownerId = user?.id || 'owner-local';

    if (!validateAll()) {
      haptic.warning();
      if (!fields.name.value) {
        goToSlide(0);
      } else if (!fields.breed.value) {
        goToSlide(1);
      }
      return;
    }

    setSubmitting(true);
    setNetworkError(undefined);
    try {
      const petPayload = {
        id: `pet-${Date.now()}`,
        name: fields.name.value.trim(),
        species,
        breed: fields.breed.value.trim(),
        gender,
        birthYear: currentYear() - age,
        isVaccinated: isVaccinated === 'yes',
        isSpayedNeutered: isSpayedNeutered === 'yes',
        weightCategory,
        notes: notes.trim(),
        avatarId,
        photoUrl: customPhotoUri,
      };

      await addPet(ownerId, petPayload);

      if (clerkUser) {
        const existingPets = ((clerkUser.unsafeMetadata?.pets as any[]) || []);
        await updateClerkUnsafeMetadata(clerkUser, {
          pets: [...existingPets, petPayload],
        });
      }

      toast.success(`${petPayload.name} registered!`, {
        description: 'City Veterinary health passport has been created.',
      });
      router.back();
    } catch {
      setNetworkError('We couldn’t register your pet. Please check your connection.');
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [
    user?.id,
    validateAll,
    fields.name.value,
    fields.breed.value,
    species,
    gender,
    age,
    isVaccinated,
    isSpayedNeutered,
    weightCategory,
    notes,
    avatarId,
    customPhotoUri,
    addPet,
    clerkUser,
    router,
    goToSlide,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: SubPartIndex }) => {
      const index = item - 1;

      if (item === 1) {
        return (
          <SlideWrapper index={index} scrollX={scrollX} width={width}>
            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionTitle}>What kind of pet do you have?</Text>
              <Text style={styles.sectionDesc}>
                Select species, profile avatar and official name.
              </Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Species</Text>
              <VisualChoiceCards<Species>
                options={[
                  {
                    value: 'dog',
                    title: 'Dog / Puppy',
                    subtitle: 'Canine companion',
                    iconName: 'paw',
                    badgeBg: species === 'dog' ? colors.primaryLight : '#F0FAF8',
                    badgeColor: colors.primary,
                  },
                  {
                    value: 'cat',
                    title: 'Cat / Kitten',
                    subtitle: 'Feline companion',
                    iconName: 'paw-outline',
                    badgeBg: species === 'cat' ? colors.primaryLight : '#F0FAF8',
                    badgeColor: colors.primary,
                  },
                ]}
                value={species}
                onChange={handleSpeciesChange}
              />
            </View>

            {/* Profile Avatar Selector */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Profile Avatar</Text>
              <Pressable
                onPress={() => {
                  haptic.light();
                  setAvatarModalVisible(true);
                }}
                style={[styles.avatarPickerCard, shadows.sm]}
              >
                <PopoutPetAvatar
                  avatarId={avatarId}
                  species={species}
                  photoUrl={customPhotoUri}
                  size={52}
                  showCameraBadge
                />

                <View style={styles.avatarPickerTextWrap}>
                  <Text style={styles.avatarPickerTitle}>Choose Pet Avatar</Text>
                  <Text style={styles.avatarPickerSub}>
                    Select from cute illustrated {species} avatars or upload photo
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </Pressable>
            </View>

            <View style={styles.fieldBlock}>
              <Input
                label="Pet's Name"
                required
                value={fields.name.value}
                onChangeText={(v) => setValue('name', v)}
                onBlur={() => validateField('name')}
                error={fields.name.error}
                returnKeyType="done"
                leftIcon={<Ionicons name="paw" size={18} color={colors.primary} />}
                placeholder={species === 'dog' ? 'e.g. Milo, Browny, Max' : 'e.g. Luna, Whiskers, Mingming'}
                editable={!submitting}
              />
            </View>

            <View style={styles.actionRow}>
              <Button
                title="Continue: Breed & Age"
                variant="primary"
                onPress={handlePart1Next}
                disabled={submitting}
                fullWidth
                showPaw
              />
            </View>
          </SlideWrapper>
        );
      }

      if (item === 2) {
        return (
          <SlideWrapper index={index} scrollX={scrollX} width={width}>
            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionTitle}>Breed, Gender & Age</Text>
              <Text style={styles.sectionDesc}>
                Helps determine the right vaccinations and medical care.
              </Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Popular {species === 'dog' ? 'Dog' : 'Cat'} Breeds in CDO</Text>
              <View style={styles.popularBreedChips}>
                {(species === 'dog'
                  ? ['Aspin (Asong Pinoy)', 'Shih Tzu', 'Golden Retriever', 'Pomeranian', 'Labrador']
                  : ['Puspin (Pusang Pinoy)', 'Persian', 'Siamese', 'British Shorthair']
                ).map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => handleBreedPreset(b)}
                    style={[
                      styles.breedChip,
                      fields.breed.value === b && styles.breedChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.breedChipText,
                        fields.breed.value === b && styles.breedChipTextSelected,
                      ]}
                    >
                      {b}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <DropdownSelect
                label="Select or Search Breed"
                options={breedOptions}
                value={fields.breed.value}
                onChange={(val) => {
                  setValue('breed', val);
                  validateField('breed');
                }}
                error={fields.breed.error}
                placeholder={`Choose ${species} breed…`}
                allowCustom
                customPlaceholder="Enter other breed name..."
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <VisualChoiceCards<PetGender>
                options={[
                  {
                    value: 'male',
                    title: 'Male',
                    subtitle: 'Boy (♂)',
                    iconName: 'male',
                    badgeBg: gender === 'male' ? '#EBF3FE' : '#F4F7FB',
                    badgeColor: '#2563EB',
                  },
                  {
                    value: 'female',
                    title: 'Female',
                    subtitle: 'Girl (♀)',
                    iconName: 'female',
                    badgeBg: gender === 'female' ? '#FDF2F8' : '#FDF4F6',
                    badgeColor: '#DB2777',
                  },
                ]}
                value={gender}
                onChange={(g) => {
                  haptic.light();
                  setGender(g);
                }}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Estimated Age</Text>
              <Stepper
                value={age}
                onChange={setAge}
                min={0}
                max={25}
                label={(v) => (v === 0 ? 'Under 1 year (Puppy/Kitten)' : v === 1 ? '1 year old' : `${v} years old`)}
              />
            </View>

            <View style={styles.actionRowSplit}>
              <View style={styles.actionCol}>
                <Button
                  title="Back"
                  variant="outline"
                  onPress={() => handlePrevSubPart(2)}
                  disabled={submitting}
                  fullWidth
                />
              </View>
              <View style={styles.actionColFlex}>
                <Button
                  title="Continue: Health"
                  variant="primary"
                  onPress={handlePart2Next}
                  disabled={submitting}
                  fullWidth
                  showPaw
                />
              </View>
            </View>
          </SlideWrapper>
        );
      }

      if (item === 3) {
        return (
          <SlideWrapper index={index} scrollX={scrollX} width={width}>
            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionTitle}>Vaccination & Health Status</Text>
              <Text style={styles.sectionDesc}>
                Track anti-rabies immunizations and spay/neuter status.
              </Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Anti-Rabies Vaccination Status</Text>
              <VisualChoiceCards<'yes' | 'no' | 'unknown'>
                layout="stack"
                options={[
                  {
                    value: 'yes',
                    title: 'Vaccinated',
                    subtitle: 'Anti-rabies vaccine is up to date',
                    iconName: 'shield-checkmark',
                    badgeBg: isVaccinated === 'yes' ? colors.primaryLight : '#E8F7EE',
                    badgeColor: colors.success,
                  },
                  {
                    value: 'no',
                    title: 'Needs Vaccine',
                    subtitle: 'Needs municipal anti-rabies shot',
                    iconName: 'alert-circle',
                    badgeBg: isVaccinated === 'no' ? colors.primaryLight : '#FEF6E7',
                    badgeColor: colors.warning,
                  },
                  {
                    value: 'unknown',
                    title: 'Not Sure',
                    subtitle: 'Needs clinic verification',
                    iconName: 'help-circle-outline',
                    badgeBg: colors.surfaceMuted,
                    badgeColor: colors.textMuted,
                  },
                ]}
                value={isVaccinated}
                onChange={(v) => {
                  haptic.light();
                  setIsVaccinated(v);
                }}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Spayed / Neutered (Kapon)</Text>
              <VisualChoiceCards<'yes' | 'no' | 'unknown'>
                layout="stack"
                options={[
                  {
                    value: 'yes',
                    title: 'Spayed / Neutered',
                    subtitle: 'Fixed / surgically altered',
                    iconName: 'cut-outline',
                    badgeBg: isSpayedNeutered === 'yes' ? colors.primaryLight : '#EFF6FF',
                    badgeColor: colors.info,
                  },
                  {
                    value: 'no',
                    title: 'Intact',
                    subtitle: 'Not yet spayed/neutered',
                    iconName: 'heart-outline',
                    badgeBg: colors.surfaceMuted,
                    badgeColor: colors.textMuted,
                  },
                  {
                    value: 'unknown',
                    title: 'Not Sure',
                    subtitle: 'Unknown status',
                    iconName: 'help-circle-outline',
                    badgeBg: colors.surfaceMuted,
                    badgeColor: colors.textMuted,
                  },
                ]}
                value={isSpayedNeutered}
                onChange={(v) => {
                  haptic.light();
                  setIsSpayedNeutered(v);
                }}
              />
            </View>

            <View style={styles.actionRowSplit}>
              <View style={styles.actionCol}>
                <Button
                  title="Back"
                  variant="outline"
                  onPress={() => handlePrevSubPart(3)}
                  disabled={submitting}
                  fullWidth
                />
              </View>
              <View style={styles.actionColFlex}>
                <Button
                  title="Continue: Care Profile"
                  variant="primary"
                  onPress={handlePart3Next}
                  disabled={submitting}
                  fullWidth
                  showPaw
                />
              </View>
            </View>
          </SlideWrapper>
        );
      }

      // Part 4: Care Profile & Notes
      return (
        <SlideWrapper index={index} scrollX={scrollX} width={width}>
          <View style={styles.sectionHeadingWrap}>
            <Text style={styles.sectionTitle}>Physical Size & Care Notes</Text>
            <Text style={styles.sectionDesc}>
              Final touches for your pet's City Veterinary Passport.
            </Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Weight / Size Category</Text>
            <ChoiceChips<string>
              options={[
                { label: 'Small (Under 10 kg)', value: 'small' },
                { label: 'Medium (10 - 25 kg)', value: 'medium' },
                { label: 'Large (Over 25 kg)', value: 'large' },
              ]}
              value={weightCategory}
              onChange={(w) => {
                haptic.light();
                setWeightCategory(w);
              }}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Input
              label="Special Notes or Allergies (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Scared of thunder, sensitive stomach, friendly with kids"
              multiline
              numberOfLines={3}
              leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.primary} />}
              editable={!submitting}
            />
          </View>

          {networkError ? (
            <ErrorMessage message={networkError} onRetry={handleSaveComplete} />
          ) : null}

          {/* Quick Pet Summary Badge */}
          <View style={[styles.summaryBox, shadows.sm]}>
            <PopoutPetAvatar
              avatarId={avatarId}
              species={species}
              photoUrl={customPhotoUri}
              size={48}
            />
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryPetName}>{fields.name.value || 'My Pet'}</Text>
              <Text style={styles.summaryPetMeta}>
                {fields.breed.value || 'Breed'} · {gender === 'male' ? 'Male ♂' : 'Female ♀'} · {age === 0 ? 'Under 1 yr' : `${age} yrs`}
              </Text>
              <View style={styles.summaryBadgeRow}>
                <View
                  style={[
                    styles.summaryStatusBadge,
                    { backgroundColor: isVaccinated === 'yes' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)' },
                  ]}
                >
                  <Ionicons
                    name={isVaccinated === 'yes' ? 'shield-checkmark' : 'alert-circle'}
                    size={11}
                    color={isVaccinated === 'yes' ? colors.success : colors.warning}
                  />
                  <Text
                    style={[
                      styles.summaryStatusText,
                      { color: isVaccinated === 'yes' ? colors.success : colors.warning },
                    ]}
                  >
                    {isVaccinated === 'yes' ? 'Vaccinated' : 'Needs Shot'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionRowSplit}>
            <View style={styles.actionCol}>
              <Button
                title="Back"
                variant="outline"
                onPress={() => handlePrevSubPart(4)}
                disabled={submitting}
                fullWidth
              />
            </View>
            <View style={styles.actionColFlex}>
              <Button
                title="Register Pet"
                variant="primary"
                onPress={handleSaveComplete}
                loading={submitting}
                disabled={submitting}
                fullWidth
                showPaw
              />
            </View>
          </View>
        </SlideWrapper>
      );
    },
    [
      scrollX,
      width,
      species,
      gender,
      age,
      isVaccinated,
      isSpayedNeutered,
      weightCategory,
      notes,
      avatarId,
      customPhotoUri,
      fields,
      breedOptions,
      submitting,
      networkError,
      handleSpeciesChange,
      handleBreedPreset,
      handlePart1Next,
      handlePart2Next,
      handlePart3Next,
      handlePrevSubPart,
      handleSaveComplete,
      validateField,
      setValue,
    ],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header with Back Navigation & Stepper */}
        <View style={styles.topBar}>
          <View style={styles.topBarRow}>
            <BackButton onPress={handlePrevious} />
            <View style={styles.headerTitleWrap}>
              <Text style={styles.topBarTitle}>Add a Pet</Text>
              <Text style={styles.topBarSubtitle}>{PART_SUBTITLES[subPart]}</Text>
            </View>
          </View>

          {/* Stepper Indicator */}
          <View style={styles.stepperContainer}>
            {SUB_PARTS.map((step) => {
              const isActive = step === subPart;
              const isCompleted = step < subPart;
              return (
                <Pressable
                  key={step}
                  onPress={() => {
                    haptic.light();
                    goToSlide(step - 1);
                  }}
                  style={styles.stepTouch}
                  hitSlop={8}
                >
                  <View
                    style={[
                      styles.stepDot,
                      isActive && styles.stepDotActive,
                      isCompleted && styles.stepDotCompleted,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={12} color={colors.white} />
                    ) : (
                      <Text
                        style={[
                          styles.stepDotNumber,
                          isActive && styles.stepDotNumberActive,
                        ]}
                      >
                        {step}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Animated Horizontal FlatList Wizard */}
        <AnimatedFlatList
          ref={listRef}
          data={SUB_PARTS}
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

      {/* Pet Avatar Picker Modal */}
      <PetAvatarPickerModal
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
        onSelectAvatar={handleSelectAvatar}
        currentAvatarId={avatarId}
        species={species}
        petName={fields.name.value || 'Pet'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
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
    marginBottom: spacing.xs,
  },
  headerTitleWrap: {
    flex: 1,
  },
  topBarTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  topBarSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: 4,
  },
  stepTouch: {
    padding: 4,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(7, 30, 38, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.1 }],
  },
  stepDotCompleted: {
    backgroundColor: colors.success,
  },
  stepDotNumber: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 11,
  },
  stepDotNumberActive: {
    color: colors.white,
  },
  flatList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
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
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  avatarPickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    gap: 12,
  },
  avatarPickerTextWrap: {
    flex: 1,
    gap: 2,
  },
  avatarPickerTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  avatarPickerSub: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
  },
  popularBreedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  breedChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
  },
  breedChipSelected: {
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    borderColor: colors.primary,
  },
  breedChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  breedChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: spacing.md,
    marginTop: 4,
  },
  summaryInfo: {
    flex: 1,
    gap: 2,
  },
  summaryPetName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryPetMeta: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
  },
  summaryBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  summaryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  summaryStatusText: {
    ...typography.captionBold,
    fontSize: 10,
  },
  actionRow: {
    marginTop: spacing.md,
  },
  actionRowSplit: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionCol: {
    flex: 1,
  },
  actionColFlex: {
    flex: 2,
  },
});
