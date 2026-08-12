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

import { colors, shadows, spacing, typography } from '@theme';
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
import { PhotoIllustration } from '@components/ui/PhotoIllustration';

const DOG_BREEDS = ['Golden Retriever', 'Labrador', 'Shih Tzu', 'Poodle', 'Aspin', 'Beagle'];
const CAT_BREEDS = ['Persian', 'Siamese', 'Domestic Short Hair', 'Puspin', 'Bengal'];

export default function PetRegistrationScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addPet = useDataStore((state) => state.addPet);
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState<string | undefined>();
  const breedRef = useRef<TextInput>(null);

  const [species, setSpecies] = useState<Species>('dog');
  const [gender, setGender] = useState<PetGender>('male');
  const [age, setAge] = useState(1);

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
    // Clear or suggest default breed if empty
    if (!fields.breed.value) {
      setValue('breed', newSpecies === 'dog' ? 'Golden Retriever' : 'Persian');
    }
  };

  const handleBreedPreset = (breedName: string) => {
    haptic.light();
    setValue('breed', breedName);
    validateField('breed');
  };

  const handleSave = useCallback(async () => {
    if (!validateAll()) {
      haptic.warning();
      return;
    }
    const ownerId = user?.id;
    if (!ownerId) return;
    setSubmitting(true);
    setNetworkError(undefined);
    try {
      await addPet(ownerId, {
        name: fields.name.value.trim(),
        species,
        breed: fields.breed.value.trim(),
        gender,
        birthYear: currentYear() - age,
      });
      haptic.success();
      router.replace('/(register)/success');
    } catch {
      setNetworkError(
        'We couldn’t save your pet. Check your connection and try again.',
      );
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [validateAll, user?.id, addPet, fields.name.value, fields.breed.value, species, gender, age, router]);

  const heroImage =
    species === 'cat'
      ? require('@assets/no-backgrounds/cat1-removebg-preview.png')
      : require('@assets/no-backgrounds/dog2-removebg-preview.png');

  const breedPresets = species === 'dog' ? DOG_BREEDS : CAT_BREEDS;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Hero Canvas with Dynamic Species Cutout Illustration */}
          <View style={styles.heroCanvas}>
            <AnimatedBubbleBackground />
            <View style={styles.backBtnWrap}>
              <BackButton />
            </View>

            <View style={styles.heroIllustration}>
              <PhotoIllustration
                source={heroImage}
                size={230}
                accentColor={colors.primary}
              />
            </View>
          </View>

          {/* Curved Bottom Sheet Container */}
          <View style={[styles.cardSheet, shadows.lg]}>
            {/* Floating Center Badge Pill */}
            <View style={[styles.floatingBadge, shadows.md]}>
              <Ionicons name="paw" size={24} color={colors.white} />
            </View>

            <StepHeader
              step={2}
              total={2}
              title="Now, tell us about your pet"
              subtitle="Your pet’s health profile helps the City Veterinary Office prepare for their visit."
            />

            <View style={styles.form}>
              {/* Pet Name */}
              <Input
                label="Pet name"
                value={fields.name.value}
                onChangeText={(v) => setValue('name', v)}
                onBlur={() => validateField('name')}
                error={fields.name.error}
                returnKeyType="next"
                onSubmitEditing={() => breedRef.current?.focus()}
                leftIcon={<Ionicons name="paw-outline" size={20} color={colors.primary} />}
                placeholder="e.g. Milo or Luna"
                editable={!submitting}
              />

              {/* Species Selection */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Species</Text>
                <ChoiceChips<Species>
                  options={[
                    { label: '🐕 Dog', value: 'dog' },
                    { label: '🐈 Cat', value: 'cat' },
                  ]}
                  value={species}
                  onChange={handleSpeciesChange}
                />
              </View>

              {/* Breed Input with Quick Presets */}
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
                  <Text style={styles.presetHint}>Quick pick:</Text>
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

              {/* Gender Selection */}
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

              {/* Age Stepper */}
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

            <View style={styles.bottom}>
              {networkError ? <ErrorMessage message={networkError} /> : null}
              <Button
                title="Complete Registration"
                size="lg"
                onPress={handleSave}
                loading={submitting}
                rightIcon={<Ionicons name="checkmark-circle" size={22} color={colors.white} />}
                variant="primary"
              />
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
    backgroundColor: '#E6F5F2',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroCanvas: {
    height: 190,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  backBtnWrap: {
    position: 'absolute',
    top: 16,
    left: 20,
    zIndex: 20,
  },
  heroIllustration: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: -28,
    zIndex: 1,
  },
  cardSheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 28,
    position: 'relative',
    minHeight: 600,
    zIndex: 10,
  },
  floatingBadge: {
    position: 'absolute',
    top: -26,
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  form: {
    marginTop: spacing.xl,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
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
    fontSize: 12,
  },
  presetTextActive: {
    color: colors.primaryDark,
  },
  bottom: {
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
});

