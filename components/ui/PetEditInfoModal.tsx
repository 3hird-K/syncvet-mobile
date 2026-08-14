import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { currentYear, ageFromBirthYear } from '@lib/format';
import type { Pet, PetGender, Species } from '@services/data';
import { Button } from './Button';
import { Input } from './Input';
import { Stepper } from './Stepper';
import { ChoiceChips } from './ChoiceChips';

interface PetEditInfoModalProps {
  visible: boolean;
  pet: Pet;
  onClose: () => void;
  onSave: (updatedPet: Pet) => Promise<void>;
}

const DOG_BREEDS = [
  'Aspin (Asong Pinoy)',
  'Shih Tzu',
  'Pomeranian',
  'Golden Retriever',
  'Labrador',
  'Pug',
  'Siberian Husky',
  'Chihuahua',
  'German Shepherd',
  'French Bulldog',
  'Beagle',
  'Dachshund',
  'Rottweiler',
  'Corgi',
  'Other / Mixed Breed',
];

const CAT_BREEDS = [
  'Puspin (Pusang Pinoy)',
  'Persian',
  'Siamese',
  'British Shorthair',
  'Scottish Fold',
  'Maine Coon',
  'Bengal',
  'Ragdoll',
  'Sphynx',
  'Russian Blue',
  'Other / Mixed Breed',
];

const WEIGHT_OPTIONS = [
  { label: 'Small (< 10 kg)', value: 'small' },
  { label: 'Medium (10-25 kg)', value: 'medium' },
  { label: 'Large (25-45 kg)', value: 'large' },
  { label: 'Giant (> 45 kg)', value: 'giant' },
];

export function PetEditInfoModal({
  visible,
  pet,
  onClose,
  onSave,
}: PetEditInfoModalProps) {
  const [name, setName] = useState(pet.name);
  const [species, setSpecies] = useState<Species>(pet.species || 'dog');
  const [breed, setBreed] = useState(pet.breed || '');
  const [gender, setGender] = useState<PetGender>(pet.gender || 'male');
  const [age, setAge] = useState(
    pet.birthYear ? ageFromBirthYear(pet.birthYear) : 1,
  );
  const [isVaccinated, setIsVaccinated] = useState<boolean>(
    Boolean(pet.isVaccinated),
  );
  const [isSpayedNeutered, setIsSpayedNeutered] = useState<boolean>(
    Boolean(pet.isSpayedNeutered),
  );
  const [weightCategory, setWeightCategory] = useState<string>(
    (pet.weightCategory || 'medium').toLowerCase(),
  );
  const [notes, setNotes] = useState(pet.notes || '');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDog = species === 'dog';
  const breedPresets = isDog ? DOG_BREEDS : CAT_BREEDS;

  const handleSpeciesChange = (newSpecies: Species) => {
    haptic.light();
    setSpecies(newSpecies);
    setBreed('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMessage('Please enter your pet’s name.');
      haptic.warning();
      return;
    }
    if (!breed.trim()) {
      setErrorMessage('Please specify your pet’s breed.');
      haptic.warning();
      return;
    }

    setSaving(true);
    setErrorMessage(undefined);
    try {
      const birthYear = currentYear() - age;
      const updatedPet: Pet = {
        ...pet,
        name: name.trim(),
        species,
        breed: breed.trim(),
        gender,
        birthYear,
        isVaccinated,
        isSpayedNeutered,
        weightCategory,
        notes: notes.trim(),
      };

      await onSave(updatedPet);
      haptic.success();
      onClose();
    } catch (err: any) {
      console.log('Error saving pet:', err);
      setErrorMessage(err?.message || 'Could not update pet info. Please try again.');
      haptic.error();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={[styles.modalCard, shadows.lg]}>
            {/* Modal Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.title}>Edit Pet Info</Text>
                <Text style={styles.subtitle}>
                  Update {pet.name}’s health passport details
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Form Scroll Area */}
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* 1. Pet Name */}
              <Input
                label="Pet Name *"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (errorMessage) setErrorMessage(undefined);
                }}
                placeholder="e.g. Milo, Luna, Buddy"
                autoCapitalize="words"
                returnKeyType="next"
              />

              {/* 2. Species Switcher */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>Species *</Text>
                <View style={styles.speciesToggleRow}>
                  <Pressable
                    onPress={() => handleSpeciesChange('dog')}
                    style={[
                      styles.speciesBtn,
                      isDog && styles.speciesBtnActiveDog,
                    ]}
                  >
                    <Text style={styles.speciesBtnEmoji}>🐶</Text>
                    <Text
                      style={[
                        styles.speciesBtnText,
                        isDog && styles.speciesBtnTextActive,
                      ]}
                    >
                      Dog (Canine)
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSpeciesChange('cat')}
                    style={[
                      styles.speciesBtn,
                      !isDog && styles.speciesBtnActiveCat,
                    ]}
                  >
                    <Text style={styles.speciesBtnEmoji}>🐱</Text>
                    <Text
                      style={[
                        styles.speciesBtnText,
                        !isDog && styles.speciesBtnTextActive,
                      ]}
                    >
                      Cat (Feline)
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 3. Breed & Common Presets */}
              <View style={styles.fieldSection}>
                <Input
                  label="Breed *"
                  value={breed}
                  onChangeText={(val) => {
                    setBreed(val);
                    if (errorMessage) setErrorMessage(undefined);
                  }}
                  placeholder={isDog ? 'e.g. Aspin, Golden Retriever' : 'e.g. Puspin, Persian'}
                  autoCapitalize="words"
                />

                <Text style={styles.presetsHeader}>Quick Select Breed:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetsScroll}
                >
                  {breedPresets.map((b) => {
                    const isSelected = breed.toLowerCase() === b.toLowerCase();
                    return (
                      <Pressable
                        key={b}
                        onPress={() => {
                          haptic.light();
                          setBreed(b);
                          if (errorMessage) setErrorMessage(undefined);
                        }}
                        style={[
                          styles.presetChip,
                          isSelected && styles.presetChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            isSelected && styles.presetChipTextSelected,
                          ]}
                        >
                          {b}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 4. Gender */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>Gender *</Text>
                <View style={styles.genderRow}>
                  <Pressable
                    onPress={() => {
                      haptic.light();
                      setGender('male');
                    }}
                    style={[
                      styles.genderBtn,
                      gender === 'male' && styles.genderBtnActiveMale,
                    ]}
                  >
                    <Ionicons
                      name="male"
                      size={18}
                      color={gender === 'male' ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.genderBtnText,
                        gender === 'male' && styles.genderBtnTextActive,
                      ]}
                    >
                      Male (♂)
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      haptic.light();
                      setGender('female');
                    }}
                    style={[
                      styles.genderBtn,
                      gender === 'female' && styles.genderBtnActiveFemale,
                    ]}
                  >
                    <Ionicons
                      name="female"
                      size={18}
                      color={gender === 'female' ? '#DB2777' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.genderBtnText,
                        gender === 'female' && styles.genderBtnTextActivePink,
                      ]}
                    >
                      Female (♀)
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 5. Age */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>Estimated Age</Text>
                <View style={styles.stepperWrap}>
                  <Stepper
                    value={age}
                    min={0}
                    max={25}
                    onChange={(newAge) => {
                      haptic.light();
                      setAge(newAge);
                    }}
                    label={(val) => `${val} ${val === 1 ? 'year old' : 'years old'}`}
                  />
                  <Text style={styles.birthYearSub}>
                    Estimated Birth Year: {currentYear() - age}
                  </Text>
                </View>
              </View>

              {/* 6. Anti-Rabies Vaccination Status */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>Anti-Rabies Vaccination Status</Text>
                <View style={styles.toggleRow}>
                  <Pressable
                    onPress={() => {
                      haptic.light();
                      setIsVaccinated(true);
                    }}
                    style={[
                      styles.toggleBtn,
                      isVaccinated && styles.toggleBtnActiveSuccess,
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={17}
                      color={isVaccinated ? colors.success : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.toggleBtnText,
                        isVaccinated && styles.toggleBtnTextSuccess,
                      ]}
                    >
                      Vaccinated
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      haptic.light();
                      setIsVaccinated(false);
                    }}
                    style={[
                      styles.toggleBtn,
                      !isVaccinated && styles.toggleBtnActiveWarning,
                    ]}
                  >
                    <Ionicons
                      name="alert-circle"
                      size={17}
                      color={!isVaccinated ? colors.warning : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.toggleBtnText,
                        !isVaccinated && styles.toggleBtnTextWarning,
                      ]}
                    >
                      Needs Vaccine
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 7. Spayed / Neutered */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>Spayed / Neutered</Text>
                <View style={styles.toggleRow}>
                  <Pressable
                    onPress={() => {
                      haptic.light();
                      setIsSpayedNeutered(true);
                    }}
                    style={[
                      styles.toggleBtn,
                      isSpayedNeutered && styles.toggleBtnActivePrimary,
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color={isSpayedNeutered ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.toggleBtnText,
                        isSpayedNeutered && styles.toggleBtnTextPrimary,
                      ]}
                    >
                      Yes, Fixed
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      haptic.light();
                      setIsSpayedNeutered(false);
                    }}
                    style={[
                      styles.toggleBtn,
                      !isSpayedNeutered && styles.toggleBtnActiveNeutral,
                    ]}
                  >
                    <Ionicons
                      name="ellipse-outline"
                      size={17}
                      color={!isSpayedNeutered ? colors.textPrimary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.toggleBtnText,
                        !isSpayedNeutered && styles.toggleBtnText,
                      ]}
                    >
                      Intact / No
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 8. Weight Category */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>Weight Category</Text>
                <ChoiceChips
                  options={WEIGHT_OPTIONS}
                  value={weightCategory}
                  onChange={(val) => {
                    haptic.light();
                    setWeightCategory(val);
                  }}
                />
              </View>

              {/* 9. Special Notes */}
              <Input
                label="Medical Notes / Allergies (Optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Allergic to chicken, microchip ID #12345, friendly with strangers"
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={styles.footer}>
              <Button
                title="Save Changes"
                variant="primary"
                onPress={handleSave}
                loading={saving}
                fullWidth
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 38, 0.60)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(7, 30, 38, 0.06)',
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(7, 30, 38, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    paddingHorizontal: spacing.lg,
  },
  formContent: {
    paddingVertical: spacing.md,
    gap: 16,
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
  },
  errorText: {
    ...typography.captionBold,
    color: colors.error,
    fontSize: 12.5,
    flex: 1,
  },
  fieldSection: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  speciesToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  speciesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  speciesBtnActiveDog: {
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    borderColor: colors.primary,
  },
  speciesBtnActiveCat: {
    backgroundColor: 'rgba(219, 39, 119, 0.10)',
    borderColor: '#DB2777',
  },
  speciesBtnEmoji: {
    fontSize: 18,
  },
  speciesBtnText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 13,
  },
  speciesBtnTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  presetsHeader: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11.5,
    marginTop: 2,
  },
  presetsScroll: {
    gap: 6,
    paddingVertical: 4,
  },
  presetChip: {
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipSelected: {
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    borderColor: colors.primary,
  },
  presetChipText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
  },
  presetChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  genderBtnActiveMale: {
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    borderColor: colors.primary,
  },
  genderBtnActiveFemale: {
    backgroundColor: 'rgba(219, 39, 119, 0.10)',
    borderColor: '#DB2777',
  },
  genderBtnText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 13,
  },
  genderBtnTextActive: {
    color: colors.primary,
  },
  genderBtnTextActivePink: {
    color: '#DB2777',
  },
  stepperWrap: {
    gap: 4,
  },
  birthYearSub: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11.5,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  toggleBtnActiveSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderColor: colors.success,
  },
  toggleBtnActiveWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: colors.warning,
  },
  toggleBtnActivePrimary: {
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    borderColor: colors.primary,
  },
  toggleBtnActiveNeutral: {
    backgroundColor: 'rgba(7, 30, 38, 0.08)',
    borderColor: 'rgba(7, 30, 38, 0.18)',
  },
  toggleBtnText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12.5,
  },
  toggleBtnTextSuccess: {
    color: colors.success,
    fontWeight: '700',
  },
  toggleBtnTextWarning: {
    color: colors.warning,
    fontWeight: '700',
  },
  toggleBtnTextPrimary: {
    color: colors.primary,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(7, 30, 38, 0.06)',
  },
});
