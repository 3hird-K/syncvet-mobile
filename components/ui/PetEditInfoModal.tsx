import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { Input } from './Input';
import { Stepper } from './Stepper';
import { ChoiceChips } from './ChoiceChips';
import { toast } from './Sonner';

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
      toast.success('Pet Profile Updated', {
        description: `${name.trim()}’s passport details have been saved.`,
      });
      onClose();
    } catch (err: any) {
      console.log('Error saving pet:', err);
      setErrorMessage(err?.message || 'Could not update pet info. Please try again.');
      haptic.error();
      toast.error('Update Failed', {
        description: err?.message || 'Could not update pet info. Please try again.',
      });
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
                <Text style={styles.title}>Edit Pet Profile</Text>
                <Text style={styles.subtitle}>
                  Update {pet.name}’s official health passport details
                </Text>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Save Changes"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="save" size={18} color={colors.primary} />
                  )}
                </Pressable>

                <Pressable
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
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

              {/* CARD 1: Identity & Species */}
              <View style={[styles.sectionCard, shadows.sm]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="paw" size={16} color={colors.primary} />
                  <Text style={styles.cardSectionTitle}>Basic Identity</Text>
                </View>

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
                          isDog && styles.speciesBtnTextActiveDog,
                        ]}
                      >
                        Canine (Dog)
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
                          !isDog && styles.speciesBtnTextActiveCat,
                        ]}
                      >
                        Feline (Cat)
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* CARD 2: Breed & Presets */}
              <View style={[styles.sectionCard, shadows.sm]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
                  <Text style={styles.cardSectionTitle}>Breed & Pedigree</Text>
                </View>

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

              {/* CARD 3: Physical Profile */}
              <View style={[styles.sectionCard, shadows.sm]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="fitness-outline" size={16} color={colors.primary} />
                  <Text style={styles.cardSectionTitle}>Physical Profile</Text>
                </View>

                {/* Gender */}
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
                        size={17}
                        color={gender === 'male' ? '#2563EB' : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.genderBtnText,
                          gender === 'male' && styles.genderBtnTextActiveMale,
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
                        size={17}
                        color={gender === 'female' ? '#DB2777' : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.genderBtnText,
                          gender === 'female' && styles.genderBtnTextActiveFemale,
                        ]}
                      >
                        Female (♀)
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Age Stepper */}
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

                {/* Weight Category */}
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
              </View>

              {/* CARD 4: Health & Protection */}
              <View style={[styles.sectionCard, shadows.sm]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                  <Text style={styles.cardSectionTitle}>Health & Vaccination Status</Text>
                </View>

                {/* Anti-Rabies Vaccination */}
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>Anti-Rabies Vaccination</Text>
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
                        size={16}
                        color={isVaccinated ? colors.success : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.toggleBtnText,
                          isVaccinated && styles.toggleBtnTextSuccess,
                        ]}
                        numberOfLines={1}
                      >
                        Protected
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
                        size={16}
                        color={!isVaccinated ? colors.warning : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.toggleBtnText,
                          !isVaccinated && styles.toggleBtnTextWarning,
                        ]}
                        numberOfLines={1}
                      >
                        Vaccine Due
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Spayed / Neutered */}
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>Spayed / Neutered (Kapon)</Text>
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
                        name="cut"
                        size={16}
                        color={isSpayedNeutered ? colors.primary : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.toggleBtnText,
                          isSpayedNeutered && styles.toggleBtnTextPrimary,
                        ]}
                        numberOfLines={1}
                      >
                        Fixed (Kapon)
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
                        size={16}
                        color={!isSpayedNeutered ? colors.textPrimary : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.toggleBtnText,
                          !isSpayedNeutered && styles.toggleBtnText,
                        ]}
                        numberOfLines={1}
                      >
                        Intact
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* CARD 5: Special Care Notes */}
              <View style={[styles.sectionCard, shadows.sm]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                  <Text style={styles.cardSectionTitle}>Special Medical Notes</Text>
                </View>

                <Input
                  label="Allergies / Special Instructions"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Allergic to chicken, microchip ID #12345, friendly with children"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 38, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#F7FBF9',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '92%',
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(7, 30, 38, 0.06)',
    backgroundColor: colors.surface,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(7, 30, 38, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    paddingHorizontal: spacing.md,
  },
  formContent: {
    paddingVertical: spacing.md,
    paddingBottom: 24,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 2,
  },
  cardSectionTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 12,
    flex: 1,
  },
  fieldSection: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12.5,
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
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(7, 30, 38, 0.06)',
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
    fontSize: 12.5,
  },
  speciesBtnTextActiveDog: {
    color: colors.primary,
    fontWeight: '700',
  },
  speciesBtnTextActiveCat: {
    color: '#DB2777',
    fontWeight: '700',
  },
  presetsHeader: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: -4,
  },
  presetsScroll: {
    gap: 6,
    paddingVertical: 2,
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
    fontSize: 11.5,
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
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(7, 30, 38, 0.06)',
  },
  genderBtnActiveMale: {
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    borderColor: '#2563EB',
  },
  genderBtnActiveFemale: {
    backgroundColor: 'rgba(219, 39, 119, 0.10)',
    borderColor: '#DB2777',
  },
  genderBtnText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12.5,
  },
  genderBtnTextActiveMale: {
    color: '#2563EB',
    fontWeight: '700',
  },
  genderBtnTextActiveFemale: {
    color: '#DB2777',
    fontWeight: '700',
  },
  stepperWrap: {
    gap: 4,
  },
  birthYearSub: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
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
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(7, 30, 38, 0.06)',
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
    backgroundColor: 'rgba(7, 30, 38, 0.06)',
    borderColor: 'rgba(7, 30, 38, 0.12)',
  },
  toggleBtnText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 11.5,
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
});
