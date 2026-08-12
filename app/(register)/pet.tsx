import React, { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
          {/* Top Hero Canvas with Animated Floating Bubbles */}
          <View style={styles.heroCanvas}>
            <AnimatedBubbleBackground />
            <View style={styles.backBtnWrap}>
              <BackButton />
            </View>
          </View>

          {/* Curved Bottom Sheet Container */}
          <View style={[styles.cardSheet, shadows.lg]}>
            {/* Floating Center Badge Pill */}
            <View style={[styles.floatingBadge, shadows.md]}>
              <Ionicons name="paw-outline" size={26} color={colors.white} />
            </View>

            <StepHeader
              step={2}
              total={2}
              title="Now, tell us about your pet"
              subtitle="Your pet’s health profile helps the city veterinary office prepare for their visit."
            />

            <View style={styles.form}>
              <Input
                label="Pet name"
                value={fields.name.value}
                onChangeText={(v) => setValue('name', v)}
                onBlur={() => validateField('name')}
                error={fields.name.error}
                returnKeyType="next"
                onSubmitEditing={() => breedRef.current?.focus()}
                leftIcon={<Ionicons name="paw-outline" size={20} color={colors.textMuted} />}
                placeholder="e.g. Milo"
                editable={!submitting}
              />

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Species</Text>
                <ChoiceChips<Species>
                  options={[
                    { label: '🐕 Dog', value: 'dog' },
                    { label: '🐈 Cat', value: 'cat' },
                  ]}
                  value={species}
                  onChange={setSpecies}
                />
              </View>

              <Input
                ref={breedRef}
                label="Breed"
                value={fields.breed.value}
                onChangeText={(v) => setValue('breed', v)}
                onBlur={() => validateField('breed')}
                error={fields.breed.error}
                returnKeyType="done"
                leftIcon={<Ionicons name="ribbon-outline" size={20} color={colors.textMuted} />}
                placeholder="e.g. Golden Retriever"
                editable={!submitting}
              />

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Gender</Text>
                <ChoiceChips<PetGender>
                  options={[
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' },
                  ]}
                  value={gender}
                  onChange={setGender}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Age</Text>
                <Stepper
                  value={age}
                  onChange={setAge}
                  min={0}
                  max={25}
                  label={(v) => (v === 0 ? 'Under a year' : v === 1 ? '1 year old' : `${v} years old`)}
                />
              </View>
            </View>

            <View style={styles.bottom}>
              {networkError ? <ErrorMessage message={networkError} /> : null}
              <Button
                title="Save & Continue"
                size="lg"
                onPress={handleSave}
                loading={submitting}
                rightIcon={<Ionicons name="arrow-forward" size={20} color={colors.white} />}
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
    justifyContent: 'space-between',
  },
  heroCanvas: {
    height: 120,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backBtnWrap: {
    position: 'absolute',
    top: 16,
    left: 20,
    zIndex: 10,
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
    minHeight: 560,
  },
  floatingBadge: {
    position: 'absolute',
    top: -26,
    alignSelf: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
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
    gap: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  bottom: {
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
});

