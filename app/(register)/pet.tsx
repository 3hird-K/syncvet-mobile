import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { required } from '@lib/validation';
import { haptic } from '@lib/haptics';
import { currentYear } from '@lib/format';
import { useForm } from '@hooks/useForm';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import type { PetGender, Species } from '@services/data';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { StepHeader } from '@components/ui/StepHeader';
import { BackButton } from '@components/ui/BackButton';
import { Stepper } from '@components/ui/Stepper';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { VisualChoiceCards } from '@components/ui/VisualChoiceCards';
import { DropdownSelect } from '@components/ui/DropdownSelect';

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

export default function PetRegistrationScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addPet = useDataStore((state) => state.addPet);
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState<string | undefined>();

  // Sub-step wizard state inside Step 2 (1: Identity, 2: Breed & Age, 3: Health & Vaccines, 4: Weight & Notes)
  const [subPart, setSubPart] = useState<1 | 2 | 3 | 4>(1);

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
    { name: '', breed: '' },
    {
      name: [required('Enter your pet’s name.')],
      breed: [required('Select or enter your pet’s breed.')],
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

  // Sub-part navigation
  const handlePart1Next = () => {
    if (!validateField('name')) {
      haptic.warning();
      return;
    }
    haptic.light();
    setSubPart(2);
  };

  const handlePart2Next = () => {
    if (!validateField('breed')) {
      haptic.warning();
      return;
    }
    haptic.light();
    setSubPart(3);
  };

  const handlePart3Next = () => {
    haptic.light();
    setSubPart(4);
  };

  const handlePrevious = () => {
    haptic.light();
    if (subPart === 4) setSubPart(3);
    else if (subPart === 3) setSubPart(2);
    else if (subPart === 2) setSubPart(1);
  };

  const handleSaveComplete = useCallback(async () => {
    const ownerId = user?.id;
    if (!ownerId) return;

    if (!validateAll()) {
      haptic.warning();
      return;
    }

    setSubmitting(true);
    setNetworkError(undefined);
    try {
      await addPet(ownerId, {
        name: fields.name.value.trim(),
        species,
        breed: fields.breed.value.trim(),
        gender,
        birthYear: currentYear() - age,
        isVaccinated: isVaccinated === 'yes',
        isSpayedNeutered: isSpayedNeutered === 'yes',
        weightCategory,
        notes: notes.trim(),
      });
      haptic.success();
      router.replace('/(register)/success');
    } catch {
      setNetworkError('We couldn’t save your pet profile. Check your connection and try again.');
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [user?.id, validateAll, fields.name.value, fields.breed.value, species, gender, age, isVaccinated, isSpayedNeutered, weightCategory, notes, addPet, router]);

  const partSubtitle =
    subPart === 1
      ? 'Part 1 of 4: Basic Pet Identity'
      : subPart === 2
      ? 'Part 2 of 4: Breed & Age Details'
      : subPart === 3
      ? 'Part 3 of 4: Health & Vaccines'
      : 'Part 4 of 4: Physical & Care Profile';

  const reducedMotion = useReducedMotion();
  const enterAnim = reducedMotion ? FadeIn.duration(120) : ZoomIn.duration(260);

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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.formContent}>
            <StepHeader
              step={2}
              total={2}
              title="Tell us about your pet"
              subtitle={partSubtitle}
            />

            {/* Sub-step Segment Progress Bar */}
            <View style={styles.subProgressRow}>
              <View style={[styles.subProgressSeg, subPart >= 1 && styles.subProgressSegActive]} />
              <View style={[styles.subProgressSeg, subPart >= 2 && styles.subProgressSegActive]} />
              <View style={[styles.subProgressSeg, subPart >= 3 && styles.subProgressSegActive]} />
              <View style={[styles.subProgressSeg, subPart >= 4 && styles.subProgressSegActive]} />
            </View>

            {/* PART 1: IDENTITY */}
            {subPart === 1 ? (
              <Animated.View key="subpart-1" entering={enterAnim} style={styles.form}>
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
              </Animated.View>
            ) : null}

            {/* PART 2: BREED & AGE */}
            {subPart === 2 ? (
              <Animated.View key="subpart-2" entering={enterAnim} style={styles.form}>
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
              </Animated.View>
            ) : null}

            {/* PART 3: HEALTH & VACCINATION RECORD */}
            {subPart === 3 ? (
              <Animated.View key="subpart-3" entering={enterAnim} style={styles.form}>
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
              </Animated.View>
            ) : null}

            {/* PART 4: PHYSICAL & CARE PROFILE */}
            {subPart === 4 ? (
              <Animated.View key="subpart-4" entering={enterAnim} style={styles.form}>
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
              </Animated.View>
            ) : null}

            {/* Bottom Actions */}
            <View style={styles.bottom}>
              {networkError ? <ErrorMessage message={networkError} /> : null}

              {subPart === 1 ? (
                <Button
                  title="Continue to Breed & Age"
                  size="lg"
                  onPress={handlePart1Next}
                  variant="primary"
                  showPaw
                />
              ) : subPart === 2 ? (
                <Button
                  title="Continue to Vaccines & Health"
                  size="lg"
                  onPress={handlePart2Next}
                  variant="primary"
                  showPaw
                />
              ) : subPart === 3 ? (
                <Button
                  title="Continue to Weight & Notes"
                  size="lg"
                  onPress={handlePart3Next}
                  variant="primary"
                  showPaw
                />
              ) : (
                <Button
                  title="Complete Registration"
                  size="lg"
                  onPress={handleSaveComplete}
                  loading={submitting}
                  variant="primary"
                  showPaw
                />
              )}
            </View>
          </View>
        </ScrollView>
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
    paddingBottom: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  formContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  subProgressRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
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
    marginTop: spacing.lg,
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
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfBtn: {
    flex: 1,
  },
});
