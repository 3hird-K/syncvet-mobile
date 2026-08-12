import React, { useCallback, useRef, useState } from 'react';
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
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { StepHeader } from '@components/ui/StepHeader';
import { BackButton } from '@components/ui/BackButton';
import { ChoiceChips } from '@components/ui/ChoiceChips';
import { Stepper } from '@components/ui/Stepper';
import { ErrorMessage } from '@components/ui/ErrorMessage';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';
import { VisualChoiceCards } from '@components/ui/VisualChoiceCards';

const DOG_BREEDS = ['Golden Retriever', 'Labrador', 'Shih Tzu', 'Poodle', 'Aspin', 'Beagle'];
const CAT_BREEDS = ['Persian', 'Siamese', 'Domestic Short Hair', 'Puspin', 'Bengal'];

export default function PetRegistrationScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addPet = useDataStore((state) => state.addPet);
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState<string | undefined>();
  const breedRef = useRef<TextInput>(null);

  // Sub-step wizard state inside Step 2 (1: Identity, 2: Breed & Age, 3: Health)
  const [subPart, setSubPart] = useState<1 | 2 | 3>(1);

  // Part 1 & 2 state
  const [species, setSpecies] = useState<Species>('dog');
  const [gender, setGender] = useState<PetGender>('male');
  const [age, setAge] = useState(1);

  // Part 3 health state
  const [isVaccinated, setIsVaccinated] = useState<'yes' | 'no' | 'unknown'>('yes');
  const [isSpayedNeutered, setIsSpayedNeutered] = useState<'yes' | 'no' | 'unknown'>('no');
  const [weightCategory, setWeightCategory] = useState<'small' | 'medium' | 'large'>('medium');
  const [notes, setNotes] = useState('');

  const { fields, setValue, validateField, validateAll } = useForm(
    { name: '', breed: '' },
    {
      name: [required('Give your pet a name.')],
      breed: [required('Enter your pet’s breed.')],
    },
  );

  const handleSpeciesChange = (newSpecies: Species) => {
    haptic.light();
    setSpecies(newSpecies);
    if (!fields.breed.value) {
      setValue('breed', newSpecies === 'dog' ? 'Golden Retriever' : 'Persian');
    }
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

  const handlePrevious = () => {
    haptic.light();
    if (subPart === 3) setSubPart(2);
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

  const breedPresets = species === 'dog' ? DOG_BREEDS : CAT_BREEDS;

  const partSubtitle =
    subPart === 1
      ? 'Part 1 of 3: Basic Pet Identity'
      : subPart === 2
      ? 'Part 2 of 3: Breed & Age Details'
      : 'Part 3 of 3: Health & Vaccination Record';

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
            </View>

            {/* PART 1: IDENTITY */}
            {subPart === 1 ? (
              <View style={styles.form}>
                <Input
                  label="Pet name"
                  value={fields.name.value}
                  onChangeText={(v) => setValue('name', v)}
                  onBlur={() => validateField('name')}
                  error={fields.name.error}
                  returnKeyType="next"
                  leftIcon={<Ionicons name="paw" size={20} color={colors.primary} />}
                  placeholder="e.g. Milo or Luna"
                  editable={!submitting}
                />

                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Select Species</Text>
                  <ChoiceChips<Species>
                    options={[
                      { label: '🐕 Dog', value: 'dog' },
                      { label: '🐈 Cat', value: 'cat' },
                    ]}
                    value={species}
                    onChange={handleSpeciesChange}
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Gender</Text>
                  <ChoiceChips<PetGender>
                    options={[
                      { label: '♂ Male', value: 'male' },
                      { label: '♀ Female', value: 'female' },
                    ]}
                    value={gender}
                    onChange={(g) => {
                      haptic.light();
                      setGender(g);
                    }}
                  />
                </View>
              </View>
            ) : null}

            {/* PART 2: BREED & AGE */}
            {subPart === 2 ? (
              <View style={styles.form}>
                <View style={styles.fieldBlock}>
                  <Input
                    ref={breedRef}
                    label="Breed"
                    value={fields.breed.value}
                    onChangeText={(v) => setValue('breed', v)}
                    onBlur={() => validateField('breed')}
                    error={fields.breed.error}
                    returnKeyType="done"
                    leftIcon={<Ionicons name="ribbon-outline" size={20} color={colors.primary} />}
                    placeholder="e.g. Golden Retriever"
                    editable={!submitting}
                  />
                  <View style={styles.presetsRow}>
                    <Text style={styles.presetHint}>Popular breeds:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
                      {breedPresets.map((preset) => (
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
                  <Text style={styles.label}>Age</Text>
                  <Stepper
                    value={age}
                    onChange={(a) => {
                      haptic.light();
                      setAge(a);
                    }}
                    min={0}
                    max={25}
                    label={(v) => (v === 0 ? 'Under a year' : v === 1 ? '1 year old' : `${v} years old`)}
                  />
                </View>
              </View>
            ) : null}

            {/* PART 3: HEALTH PROFILE */}
            {subPart === 3 ? (
              <View style={styles.form}>
                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Anti-Rabies Vaccination</Text>
                  <ChoiceChips<'yes' | 'no' | 'unknown'>
                    options={[
                      { label: '💉 Vaccinated', value: 'yes' },
                      { label: '⚠️ Needs vaccine', value: 'no' },
                      { label: '❓ Not sure', value: 'unknown' },
                    ]}
                    value={isVaccinated}
                    onChange={(v) => {
                      haptic.light();
                      setIsVaccinated(v);
                    }}
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Spayed / Neutered</Text>
                  <ChoiceChips<'yes' | 'no' | 'unknown'>
                    options={[
                      { label: '✂️ Yes', value: 'yes' },
                      { label: 'No', value: 'no' },
                      { label: 'Not sure', value: 'unknown' },
                    ]}
                    value={isSpayedNeutered}
                    onChange={(v) => {
                      haptic.light();
                      setIsSpayedNeutered(v);
                    }}
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Estimated Weight</Text>
                  <ChoiceChips<'small' | 'medium' | 'large'>
                    options={[
                      { label: 'Small (<5kg)', value: 'small' },
                      { label: 'Medium (5-15kg)', value: 'medium' },
                      { label: 'Large (15kg+)', value: 'large' },
                    ]}
                    value={weightCategory}
                    onChange={(v) => {
                      haptic.light();
                      setWeightCategory(v);
                    }}
                  />
                </View>

                <Input
                  label="Special Notes (Optional)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  leftIcon={<Ionicons name="medical-outline" size={20} color={colors.primary} />}
                  placeholder="e.g. Allergies, friendly with other pets, dietary habits..."
                  editable={!submitting}
                  style={styles.multilineInput}
                />
              </View>
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
                />
              ) : subPart === 2 ? (
                <View style={styles.btnRow}>
                  <View style={styles.halfBtn}>
                    <Button title="Back" size="lg" onPress={handlePrevious} variant="outline" />
                  </View>
                  <View style={styles.halfBtn}>
                    <Button title="Next: Health Profile" size="lg" onPress={handlePart2Next} variant="primary" />
                  </View>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <View style={styles.halfBtn}>
                    <Button title="Back" size="lg" onPress={handlePrevious} variant="outline" />
                  </View>
                  <View style={styles.halfBtn}>
                    <Button
                      title="Complete Registration"
                      size="lg"
                      onPress={handleSaveComplete}
                      loading={submitting}
                      variant="primary"
                    />
                  </View>
                </View>
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
    paddingBottom: 28,
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
    gap: spacing.xl,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
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
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
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
    minHeight: 64,
    paddingTop: spacing.md,
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

