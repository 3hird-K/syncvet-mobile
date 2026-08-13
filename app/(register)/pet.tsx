import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
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
import { useForm } from '@hooks/useForm';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import type { PetGender, Species } from '@services/data';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { StepHeader } from '@components/ui/StepHeader';
import { BackButton } from '@components/ui/BackButton';
import { Stepper } from '@components/ui/Stepper';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { VisualChoiceCards } from '@components/ui/VisualChoiceCards';
import { DropdownSelect } from '@components/ui/DropdownSelect';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<SubPartIndex>);

const SUB_PARTS = [1, 2, 3, 4] as const;
type SubPartIndex = (typeof SUB_PARTS)[number];

const PART_SUBTITLES: Record<SubPartIndex, string> = {
  1: 'Part 1 of 4: Basic Pet Identity',
  2: 'Part 2 of 4: Breed & Age Details',
  3: 'Part 3 of 4: Health & Vaccines',
  4: 'Part 4 of 4: Physical & Care Profile',
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
      opacity: interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.82, 1, 0.82], Extrapolation.CLAMP),
        },
        {
          translateY: interpolate(scrollX.value, inputRange, [26, 0, 26], Extrapolation.CLAMP),
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

export default function PetRegistrationScreen() {
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

  // Part 1 & 2 state
  const [species, setSpecies] = useState<Species>('dog');
  const [gender, setGender] = useState<PetGender>('male');
  const [age, setAge] = useState(1);

  // Part 3 & 4 state
  const [isVaccinated, setIsVaccinated] = useState<'yes' | 'no' | 'unknown'>('yes');
  const [isSpayedNeutered, setIsSpayedNeutered] = useState<'yes' | 'no' | 'unknown'>('no');
  const [weightCategory, setWeightCategory] = useState<'small' | 'medium' | 'large'>('medium');
  const [notes, setNotes] = useState('');

  const { fields, setValue, validateField, validateAll } = useForm(
    {
      name: '',
      breed: '',
    },
    {
      name: [required('Enter your pet’s name.')],
      breed: [required('Enter your pet’s breed.')],
    },
  );

  const breedPresets = useMemo(() => {
    return species === 'dog' ? DOG_BREEDS : CAT_BREEDS;
  }, [species]);

  const handleSpeciesChange = (newSpecies: Species) => {
    haptic.light();
    setSpecies(newSpecies);
    setValue('breed', '');
  };

  const handleBreedPreset = (breedName: string) => {
    haptic.light();
    setValue('breed', breedName);
    validateField('breed');
  };

  const goToSlide = useCallback((index: number) => {
    setSubPart((index + 1) as SubPartIndex);
    listRef.current?.scrollToOffset({ offset: index * width, animated: true });
  }, [width]);

  const handleNextSubPart = useCallback((currentPart: number) => {
    haptic.light();
    goToSlide(currentPart);
  }, [goToSlide]);

  const handlePrevSubPart = useCallback((currentPart: number) => {
    haptic.light();
    goToSlide(currentPart - 2);
  }, [goToSlide]);

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
    handlePrevSubPart(subPart);
  };

  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      const target = Math.max(1, Math.min(4, index + 1)) as SubPartIndex;
      setSubPart(target);
    },
    [width],
  );

  const handleSaveComplete = useCallback(async () => {
    const ownerId = user?.id;
    if (!ownerId) return;

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
        name: fields.name.value.trim(),
        species,
        breed: fields.breed.value.trim(),
        gender,
        birthYear: currentYear() - age,
        isVaccinated: isVaccinated === 'yes',
        isSpayedNeutered: isSpayedNeutered === 'yes',
        weightCategory,
        notes: notes.trim(),
      };

      await addPet(ownerId, petPayload);

      if (clerkUser) {
        try {
          const existingPets = ((clerkUser.unsafeMetadata?.pets as any[]) || []);
          await clerkUser.update({
            unsafeMetadata: {
              ...clerkUser.unsafeMetadata,
              profileCompleted: true,
              pets: [...existingPets, petPayload],
            },
          });
        } catch (e) {
          console.log('Clerk pet metadata update note:', e);
        }
      }

      haptic.success();
      router.replace('/(register)/success');
    } catch {
      setNetworkError('We couldn’t save your pet profile. Check your connection and try again.');
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [user?.id, validateAll, fields.name.value, fields.breed.value, species, gender, age, isVaccinated, isSpayedNeutered, weightCategory, notes, addPet, clerkUser, router, goToSlide]);

  const renderItem = useCallback(
    ({ item }: { item: SubPartIndex }) => {
      const index = item - 1;

      if (item === 1) {
        return (
          <SlideWrapper index={index} scrollX={scrollX} width={width}>
            <View style={styles.form}>
              <Input
                value={fields.name.value}
                onChangeText={(v) => setValue('name', v)}
                onBlur={() => validateField('name')}
                error={fields.name.error}
                returnKeyType="next"
                leftIcon={<Ionicons name="paw" size={20} color={colors.primary} />}
                placeholder="Pet name"
                editable={!submitting}
              />

              <View style={styles.fieldBlock}>
                <Text style={styles.sectionLabel}>Species</Text>
                <VisualChoiceCards<Species>
                  layout="row"
                  options={[
                    {
                      value: 'dog',
                      title: 'Dog',
                      subtitle: 'Canine',
                      iconName: 'paw',
                      badgeBg: species === 'dog' ? colors.primaryLight : '#F0FAF8',
                      badgeColor: colors.primary,
                    },
                    {
                      value: 'cat',
                      title: 'Cat',
                      subtitle: 'Feline',
                      iconName: 'paw-outline',
                      badgeBg: species === 'cat' ? colors.primaryLight : '#F0FAF8',
                      badgeColor: colors.primary,
                    },
                  ]}
                  value={species}
                  onChange={handleSpeciesChange}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.sectionLabel}>Gender</Text>
                <VisualChoiceCards<PetGender>
                  layout="row"
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
            </View>

            <View style={styles.bottom}>
              <Button
                title="Continue to Breed & Age"
                size="lg"
                onPress={handlePart1Next}
                variant="primary"
                showPaw
              />
            </View>
          </SlideWrapper>
        );
      }

      if (item === 2) {
        return (
          <SlideWrapper index={index} scrollX={scrollX} width={width}>
            <View style={styles.form}>
              <View style={styles.fieldBlock}>
                <Text style={styles.sectionLabel}>
                  {species === 'dog' ? 'Dog Breed' : 'Cat Breed'}
                </Text>
                <DropdownSelect
                  value={fields.breed.value}
                  onChange={(val) => {
                    setValue('breed', val);
                    validateField('breed');
                  }}
                  options={breedPresets}
                  title={species === 'dog' ? 'Select Dog Breed' : 'Select Cat Breed'}
                  placeholder={`Select or search ${species} breed...`}
                  customPlaceholder={`Search or enter ${species} breed...`}
                  error={fields.breed.error}
                  leftIcon={
                    <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
                  }
                  allowCustom
                />

                {/* Popular Breed Chips */}
                <View style={styles.presetsRow}>
                  <Text style={styles.presetHint}>Quick picks:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetsScroll}
                  >
                    {breedPresets.slice(0, 6).map((preset) => (
                      <Pressable
                        key={preset}
                        onPress={() => handleBreedPreset(preset)}
                        style={({ pressed }) => [
                          styles.presetChip,
                          fields.breed.value === preset && styles.presetChipActive,
                          pressed && styles.presetChipPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetText,
                            fields.breed.value === preset && styles.presetTextActive,
                          ]}
                        >
                          {preset}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <View style={styles.labelWithBadgeRow}>
                  <Text style={styles.sectionLabel}>Pet Age</Text>
                  <View style={styles.ageBadge}>
                    <Ionicons
                      name={
                        age === 0
                          ? 'paw-outline'
                          : age <= 3
                          ? 'sparkles'
                          : age <= 7
                          ? 'star-outline'
                          : 'shield-outline'
                      }
                      size={12}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.ageBadgeText}>
                      {age === 0
                        ? 'Under 1 yr (Puppy / Kitten)'
                        : age <= 3
                        ? `Young Adult (${age} yr${age > 1 ? 's' : ''})`
                        : age <= 7
                        ? `Adult (${age} yrs)`
                        : `Senior Pet (${age} yrs)`}
                    </Text>
                  </View>
                </View>
                <Stepper
                  value={age}
                  onChange={(a) => {
                    haptic.light();
                    setAge(a);
                  }}
                  min={0}
                  max={25}
                  label={(v) => (v === 0 ? 'Under 1 year' : v === 1 ? '1 year old' : `${v} years old`)}
                />
              </View>
            </View>

            <View style={styles.bottom}>
              <Button
                title="Continue to Vaccines & Health"
                size="lg"
                onPress={handlePart2Next}
                variant="primary"
                showPaw
              />
            </View>
          </SlideWrapper>
        );
      }

      if (item === 3) {
        return (
          <SlideWrapper index={index} scrollX={scrollX} width={width}>
            <View style={styles.form}>
              <View style={styles.fieldBlock}>
                <Text style={styles.sectionLabel}>Anti-Rabies Vaccination</Text>
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
                      subtitle: 'Needs shot from City Vet Office',
                      iconName: 'alert-circle',
                      badgeBg: isVaccinated === 'no' ? colors.primaryLight : '#FEF6E7',
                      badgeColor: colors.warning,
                    },
                    {
                      value: 'unknown',
                      title: 'Not Sure',
                      subtitle: 'Will verify with clinic records',
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
                <Text style={styles.sectionLabel}>Spayed / Neutered Status</Text>
                <VisualChoiceCards<'yes' | 'no' | 'unknown'>
                  layout="stack"
                  options={[
                    {
                      value: 'yes',
                      title: 'Yes, Fixed',
                      subtitle: 'Pet is spayed or neutered',
                      iconName: 'cut-outline',
                      badgeBg: isSpayedNeutered === 'yes' ? colors.primaryLight : '#EFF6FF',
                      badgeColor: colors.info,
                    },
                    {
                      value: 'no',
                      title: 'No, Intact',
                      subtitle: 'Pet is not spayed/neutered',
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
            </View>

            <View style={styles.bottom}>
              <Button
                title="Continue to Weight & Notes"
                size="lg"
                onPress={handlePart3Next}
                variant="primary"
                showPaw
              />
            </View>
          </SlideWrapper>
        );
      }

      // item === 4
      return (
        <SlideWrapper index={index} scrollX={scrollX} width={width}>
          <View style={styles.form}>
            <View style={styles.fieldBlock}>
              <Text style={styles.sectionLabel}>Estimated Weight Category</Text>
              <VisualChoiceCards<'small' | 'medium' | 'large'>
                layout="stack"
                options={[
                  {
                    value: 'small',
                    title: 'Small',
                    subtitle: 'Under 5 kg (e.g. Toy Poodle, Cat)',
                    iconName: 'paw-outline',
                    badgeBg: weightCategory === 'small' ? colors.primaryLight : '#FDF4FF',
                    badgeColor: colors.primary,
                  },
                  {
                    value: 'medium',
                    title: 'Medium',
                    subtitle: '5 – 15 kg (e.g. Aspin, Corgi, Beagle)',
                    iconName: 'paw',
                    badgeBg: weightCategory === 'medium' ? colors.primaryLight : '#FFFBEB',
                    badgeColor: colors.primary,
                  },
                  {
                    value: 'large',
                    title: 'Large',
                    subtitle: '15+ kg (e.g. Labrador, Golden Retriever, Husky)',
                    iconName: 'shield',
                    badgeBg: weightCategory === 'large' ? colors.primaryLight : '#F0FDF4',
                    badgeColor: colors.primary,
                  },
                ]}
                value={weightCategory}
                onChange={(v) => {
                  haptic.light();
                  setWeightCategory(v);
                }}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.sectionLabel}>Special Medical or Dietary Notes</Text>
              <Input
                value={notes}
                onChangeText={setNotes}
                multiline
                leftIcon={<Ionicons name="medical-outline" size={20} color={colors.primary} />}
                placeholder="e.g. Allergies, diet, skin conditions..."
                editable={!submitting}
                style={styles.multilineInput}
              />
            </View>
          </View>

          <View style={styles.bottom}>
            {networkError ? <ErrorMessage message={networkError} /> : null}
            <Button
              title="Complete Registration"
              size="lg"
              onPress={handleSaveComplete}
              loading={submitting}
              variant="primary"
              showPaw
            />
          </View>
        </SlideWrapper>
      );
    },
    [
      scrollX,
      width,
      fields.name.value,
      fields.name.error,
      fields.breed.value,
      fields.breed.error,
      species,
      gender,
      breedPresets,
      age,
      isVaccinated,
      isSpayedNeutered,
      weightCategory,
      notes,
      submitting,
      networkError,
      setValue,
      validateField,
      handleSpeciesChange,
      handleBreedPreset,
      handlePart1Next,
      handlePart2Next,
      handlePart3Next,
      handleSaveComplete,
    ],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Navigation Header */}
        <View style={styles.topHeaderNav}>
          <BackButton onPress={subPart > 1 ? handlePrevious : undefined} />
        </View>

        {/* Dynamic Step Header */}
        <View style={styles.headerWrapper}>
          <StepHeader
            step={2}
            total={2}
            title="Tell us about your pet"
            subtitle={PART_SUBTITLES[subPart]}
          />

          {/* Sub-step Segment Progress Bar */}
          <View style={styles.subProgressRow}>
            <View style={[styles.subProgressSeg, subPart >= 1 && styles.subProgressSegActive]} />
            <View style={[styles.subProgressSeg, subPart >= 2 && styles.subProgressSegActive]} />
            <View style={[styles.subProgressSeg, subPart >= 3 && styles.subProgressSegActive]} />
            <View style={[styles.subProgressSeg, subPart >= 4 && styles.subProgressSegActive]} />
          </View>
        </View>

        {/* Carousel of Sub-parts with Restricted Swipe (Only progresses via buttons upon validation) */}
        <AnimatedFlatList
          ref={listRef}
          data={SUB_PARTS}
          renderItem={renderItem}
          keyExtractor={(item) => String(item)}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          onMomentumScrollEnd={onMomentumScrollEnd}
          bounces={false}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={4}
          style={styles.flex}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  topHeaderNav: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  slideInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  subProgressRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  subProgressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  subProgressSegActive: {
    backgroundColor: colors.primary,
  },
  form: {
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  labelWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  ageBadgeText: {
    ...typography.smallBold,
    color: colors.primaryDark,
    fontSize: 11,
  },
  presetsRow: {
    marginTop: 4,
    gap: 6,
  },
  presetHint: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
  },
  presetsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  presetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetChipPressed: {
    opacity: 0.8,
  },
  presetText: {
    ...typography.smallBold,
    color: colors.textSecondary,
    fontSize: 13,
  },
  presetTextActive: {
    color: colors.primaryDark,
  },
  multilineInput: {
    minHeight: 74,
  },
  bottom: {
    marginTop: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
});
