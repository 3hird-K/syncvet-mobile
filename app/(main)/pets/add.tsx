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
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '@theme';
import { required } from '@lib/validation';
import { haptic } from '@lib/haptics';
import { currentYear } from '@lib/format';
import { useForm } from '@hooks/useForm';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import type { PetGender, Species } from '@services/data';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { BackButton } from '@components/ui/BackButton';
import { ChoiceChips } from '@components/ui/ChoiceChips';
import { Stepper } from '@components/ui/Stepper';
import { ErrorMessage } from '@components/ui/ErrorMessage';

export default function AddPetScreen() {
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
      router.back();
    } catch {
      setNetworkError('We couldn’t save your pet. Check your connection and try again.');
      haptic.error();
    } finally {
      setSubmitting(false);
    }
  }, [validateAll, user?.id, addPet, fields.name.value, fields.breed.value, species, gender, age, router]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <BackButton />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Add a Pet</Text>
            <Text style={styles.subtitle}>
              Register a new pet so you can book services and keep their records.
            </Text>
          </View>

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
            title="Save Pet"
            size="lg"
            onPress={handleSave}
            loading={submitting}
            rightIcon={<Ionicons name="checkmark" size={20} color={colors.white} />}
          />
        </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  headerRow: {
    marginBottom: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.heading1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    marginTop: spacing.xxl,
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
    marginTop: 'auto',
    gap: spacing.lg,
    paddingVertical: spacing.xxl,
  },
});
