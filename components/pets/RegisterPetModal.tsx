import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';

import { colors, radius, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { toast } from '@components/ui/Sonner';
import {
  CAT_AVATARS,
  DOG_AVATARS,
  getPetAvatarSource,
} from '@lib/petAvatars';
import { PetAvatarPickerModal } from '@components/ui/PetAvatarPickerModal';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import type { PetGender, Species } from '@services/data';

export const DOG_BREEDS = [
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

export const CAT_BREEDS = [
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

const WEIGHT_OPTIONS = [
  { value: 'small', label: 'Small (Under 10 kg)' },
  { value: 'medium', label: 'Medium (10 – 25 kg)' },
  { value: 'large', label: 'Large (25 – 45 kg)' },
  { value: 'giant', label: 'Giant (Over 45 kg)' },
];

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  const year = CURRENT_YEAR - i;
  const age = i;
  const label =
    age === 0 ? `${year} (< 1 yr old)` : `${year} (${age} ${age === 1 ? 'yr' : 'yrs'} old)`;
  return { year, label };
});

type ActiveSheetType = 'species' | 'gender' | 'breed' | 'birthYear' | 'weight' | null;

interface RegisterPetModalProps {
  visible: boolean;
  onClose: () => void;
  initialSpecies?: Species;
  onSuccess?: () => void;
}

export function RegisterPetModal({
  visible,
  onClose,
  initialSpecies = 'dog',
  onSuccess,
}: RegisterPetModalProps) {
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((s) => s.user);
  const addPet = useDataStore((s) => s.addPet);

  // Form states
  const [species, setSpecies] = useState<Species>(initialSpecies);
  const [avatarId, setAvatarId] = useState<string>(initialSpecies === 'cat' ? 'cat-3' : 'dog-1');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<PetGender>('male');
  const [breed, setBreed] = useState<string>('');
  const [birthYear, setBirthYear] = useState<number>(CURRENT_YEAR - 1);
  const [weightCategory, setWeightCategory] = useState<string>('medium');
  const [colorMarks, setColorMarks] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ActiveSheetType>(null);
  const [breedSearch, setBreedSearch] = useState('');
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);

  // Keyboard and dynamic layout measurement
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Sync initial species if opened anew
  React.useEffect(() => {
    if (visible) {
      setSpecies(initialSpecies);
      setAvatarId(initialSpecies === 'cat' ? 'cat-3' : 'dog-1');
      setName('');
      setGender('male');
      setBreed('');
      setBirthYear(CURRENT_YEAR - 1);
      setWeightCategory('medium');
      setColorMarks('');
      setActiveSheet(null);
      setBreedSearch('');
    }
  }, [visible, initialSpecies]);

  // Handle switching species: automatically changes profile avatar to match!
  const handleSelectSpecies = useCallback(
    (newSpecies: Species) => {
      if (newSpecies === species) {
        setActiveSheet(null);
        return;
      }
      setSpecies(newSpecies);
      setActiveSheet(null);
      haptic.light();

      // Auto-switch avatar to appropriate species default
      if (newSpecies === 'cat') {
        setAvatarId('cat-3'); // British Shorthair / Cat Avatar
        // Reset breed if it's currently a dog breed
        if (breed && !CAT_BREEDS.includes(breed)) {
          setBreed('');
        }
      } else {
        setAvatarId('dog-1'); // Border Collie / Dog Avatar
        // Reset breed if it's currently a cat breed
        if (breed && !DOG_BREEDS.includes(breed)) {
          setBreed('');
        }
      }
    },
    [species, breed],
  );

  // Filtered breeds based on search query
  const breedsList = useMemo(() => {
    const list = species === 'cat' ? CAT_BREEDS : DOG_BREEDS;
    if (!breedSearch.trim()) return list;
    const q = breedSearch.toLowerCase().trim();
    return list.filter((b) => b.toLowerCase().includes(q));
  }, [species, breedSearch]);

  const currentYearOption = useMemo(
    () =>
      BIRTH_YEAR_OPTIONS.find((opt) => opt.year === birthYear) ?? {
        year: birthYear,
        label: `${birthYear}`,
      },
    [birthYear],
  );

  const currentWeightOption = useMemo(
    () =>
      WEIGHT_OPTIONS.find((opt) => opt.value === weightCategory) ?? {
        value: weightCategory,
        label: weightCategory,
      },
    [weightCategory],
  );

  // Avatar source resolution
  const avatarSource = useMemo(() => {
    return getPetAvatarSource(avatarId, species, null, name);
  }, [avatarId, species, name]);

  const avatarLabel = useMemo(() => {
    const all = species === 'cat' ? CAT_AVATARS : DOG_AVATARS;
    const match = all.find((a) => a.id === avatarId);
    return match?.label || 'Custom Avatar Chosen';
  }, [species, avatarId]);

  // Submit Pet Registration to Supabase & Local Cache
  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      haptic.warning();
      toast.error('Pet Name Required', {
        id: 'pet-name-required',
        description: 'Please enter your pet’s official name to continue.',
      });
      return;
    }

    const ownerId = clerkUser?.id || authUser?.id || '';
    if (!ownerId) {
      toast.error('Account required', {
        id: 'auth-required',
        description: 'Please sign in to register your pet.',
      });
      return;
    }

    setSaving(true);
    haptic.medium();

    try {
      const fallbackBreed = species === 'dog' ? 'Aspin (Asong Pinoy)' : 'Puspin (Pusang Pinoy)';
      const chosenBreed = breed.trim() || fallbackBreed;

      const petPayload = {
        id: `pet-${Date.now()}`,
        name: trimmedName,
        species,
        breed: chosenBreed,
        gender,
        birthYear,
        weightCategory,
        notes: colorMarks.trim() || undefined,
        avatarId,
        isVaccinated: false,
        isSpayedNeutered: false,
      };

      await addPet(ownerId, petPayload, clerkUser);

      haptic.success();
      toast.success(`${trimmedName} registered!`, {
        id: 'pet-registered-success',
        description: `Official ${species === 'dog' ? 'Canine' : 'Feline'} passport created.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error registering pet:', err);
      haptic.error();
      toast.error('Registration Failed', {
        id: 'pet-register-err',
        description: err?.message || 'Could not register pet. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.modalOverlay,
          keyboardHeight > 0 && {
            justifyContent: 'flex-end',
            paddingBottom: Platform.OS === 'android' ? keyboardHeight + 12 : 20,
          },
        ]}
      >
        <Pressable
          style={styles.backdropPressable}
          onPress={() => {
            Keyboard.dismiss();
            if (activeSheet) {
              setActiveSheet(null);
            } else if (keyboardHeight === 0) {
              onClose();
            }
          }}
        />

        <View
          style={[
            styles.cardContainer,
            keyboardHeight > 0 && {
              maxHeight: Math.max(
                280,
                windowHeight - keyboardHeight - (Platform.OS === 'ios' ? 44 : 64),
              ),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Ionicons name="paw" size={20} color="#059669" />
                <View style={styles.headerIconBadge}>
                  <Ionicons name="add" size={10} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Register Pet</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  Official registration for municipal digital...
                </Text>
              </View>
            </View>

            {/* Action Buttons: Green Checkmark & Close */}
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm registration"
                onPress={handleSave}
                disabled={!name.trim() || saving}
                style={({ pressed }) => [
                  styles.circleActionBtn,
                  styles.submitBtn,
                  (!name.trim() || saving) && styles.submitBtnDisabled,
                  pressed && { opacity: 0.8 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.circleActionBtn,
                  styles.closeBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="close" size={18} color="#4B5563" />
              </Pressable>
            </View>
          </View>

          {/* Form Scroll Content */}
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[
              styles.formScrollContent,
              keyboardHeight > 0 && { paddingBottom: 60 },
            ]}
          >
            {/* Profile Picture Box */}
            <View style={styles.profileBox}>
              <View style={styles.avatarBorderCircle}>
                <Image source={avatarSource} style={styles.avatarImg} resizeMode="contain" />
              </View>

              <View style={styles.profileTextWrap}>
                <Text style={styles.profileBoxLabel}>PROFILE PICTURE (OPTIONAL)</Text>
                <Text style={styles.profileBoxTitle} numberOfLines={1}>
                  {avatarLabel}
                </Text>
                <Text style={styles.profileBoxSub} numberOfLines={1}>
                  Choose from official SyncVet pet avatars
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose pet avatar"
                onPress={() => {
                  haptic.light();
                  setAvatarPickerVisible(true);
                }}
                style={({ pressed }) => [
                  styles.galleryPickerBtn,
                  pressed && { opacity: 0.75, backgroundColor: '#F3F4F6' },
                ]}
              >
                <Ionicons name="images-outline" size={20} color="#374151" />
              </Pressable>
            </View>

            {/* PET NAME * */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PET NAME *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Bantay, Muning, Bella"
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
                autoCapitalize="words"
                returnKeyType="done"
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({ y: 70, animated: true });
                  }, 120);
                }}
              />
            </View>

            {/* SPECIES * & GENDER (Side-by-side) */}
            <View style={styles.twoColumnRow}>
              {/* SPECIES */}
              <View style={styles.columnFlex}>
                <Text style={styles.fieldLabel}>SPECIES *</Text>
                <Pressable
                  onPress={() => {
                    haptic.light();
                    setActiveSheet('species');
                  }}
                  style={styles.dropdownTrigger}
                >
                  <Text style={styles.dropdownValueText} numberOfLines={1}>
                    {species === 'dog' ? '🐶 Dog (Canine)' : '🐱 Cat (Feline)'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#6B7280" />
                </Pressable>
              </View>

              {/* GENDER */}
              <View style={styles.columnFlex}>
                <Text style={styles.fieldLabel}>GENDER</Text>
                <Pressable
                  onPress={() => {
                    haptic.light();
                    setActiveSheet('gender');
                  }}
                  style={styles.dropdownTrigger}
                >
                  <Text style={styles.dropdownValueText} numberOfLines={1}>
                    {gender === 'male' ? 'Male' : 'Female'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#6B7280" />
                </Pressable>
              </View>
            </View>

            {/* BREED * */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelWithBadgeRow}>
                <Text style={styles.fieldLabel}>BREED *</Text>
                <Text style={styles.fieldMetaLabel}>
                  {species === 'dog' ? 'Canine' : 'Feline'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  haptic.light();
                  setBreedSearch('');
                  setActiveSheet('breed');
                }}
                style={styles.dropdownTrigger}
              >
                <Text
                  style={[
                    styles.dropdownValueText,
                    !breed && styles.dropdownPlaceholderText,
                  ]}
                  numberOfLines={1}
                >
                  {breed || 'Select breed'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </Pressable>
            </View>

            {/* BIRTH YEAR & WEIGHT CATEGORY (Side-by-side) */}
            <View style={styles.twoColumnRow}>
              {/* BIRTH YEAR */}
              <View style={styles.columnFlex}>
                <Text style={styles.fieldLabel}>📅 BIRTH YEAR</Text>
                <Pressable
                  onPress={() => {
                    haptic.light();
                    setActiveSheet('birthYear');
                  }}
                  style={styles.dropdownTrigger}
                >
                  <Text style={styles.dropdownValueText} numberOfLines={1}>
                    {currentYearOption.label}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#6B7280" />
                </Pressable>
              </View>

              {/* WEIGHT CATEGORY */}
              <View style={styles.columnFlex}>
                <Text style={styles.fieldLabel}>⚖️ WEIGHT CATEGORY</Text>
                <Pressable
                  onPress={() => {
                    haptic.light();
                    setActiveSheet('weight');
                  }}
                  style={styles.dropdownTrigger}
                >
                  <Text style={styles.dropdownValueText} numberOfLines={1}>
                    {currentWeightOption.label}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#6B7280" />
                </Pressable>
              </View>
            </View>

            {/* COLOR & IDENTIFYING MARKS (OPTIONAL) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>COLOR & IDENTIFYING MARKS (OPTIONAL)</Text>
              <TextInput
                value={colorMarks}
                onChangeText={setColorMarks}
                placeholder="e.g. White & brown spots, wearing red collar"
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
                returnKeyType="done"
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 120);
                }}
              />
            </View>
          </ScrollView>

          {/* Sub-Selection Sheet Overlay */}
          {activeSheet && (
            <View style={styles.sheetOverlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setActiveSheet(null)}
              />
              <View style={styles.sheetContent}>
                {/* Species Sheet */}
                {activeSheet === 'species' && (
                  <View>
                    <View style={styles.sheetHeader}>
                      <Text style={styles.sheetTitle}>Select Species</Text>
                      <Pressable onPress={() => setActiveSheet(null)}>
                        <Ionicons name="close" size={20} color="#6B7280" />
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => handleSelectSpecies('dog')}
                      style={[
                        styles.sheetOptionRow,
                        species === 'dog' && styles.sheetOptionSelected,
                      ]}
                    >
                      <Text style={styles.sheetOptionText}>🐶 Dog (Canine)</Text>
                      {species === 'dog' && (
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => handleSelectSpecies('cat')}
                      style={[
                        styles.sheetOptionRow,
                        species === 'cat' && styles.sheetOptionSelected,
                      ]}
                    >
                      <Text style={styles.sheetOptionText}>🐱 Cat (Feline)</Text>
                      {species === 'cat' && (
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                      )}
                    </Pressable>
                  </View>
                )}

                {/* Gender Sheet */}
                {activeSheet === 'gender' && (
                  <View>
                    <View style={styles.sheetHeader}>
                      <Text style={styles.sheetTitle}>Select Gender</Text>
                      <Pressable onPress={() => setActiveSheet(null)}>
                        <Ionicons name="close" size={20} color="#6B7280" />
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => {
                        haptic.light();
                        setGender('male');
                        setActiveSheet(null);
                      }}
                      style={[
                        styles.sheetOptionRow,
                        gender === 'male' && styles.sheetOptionSelected,
                      ]}
                    >
                      <Text style={styles.sheetOptionText}>Male</Text>
                      {gender === 'male' && (
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        haptic.light();
                        setGender('female');
                        setActiveSheet(null);
                      }}
                      style={[
                        styles.sheetOptionRow,
                        gender === 'female' && styles.sheetOptionSelected,
                      ]}
                    >
                      <Text style={styles.sheetOptionText}>Female</Text>
                      {gender === 'female' && (
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                      )}
                    </Pressable>
                  </View>
                )}

                {/* Breed Sheet */}
                {activeSheet === 'breed' && (
                  <View style={{ maxHeight: 380 }}>
                    <View style={styles.sheetHeader}>
                      <Text style={styles.sheetTitle}>
                        Select {species === 'dog' ? 'Canine' : 'Feline'} Breed
                      </Text>
                      <Pressable onPress={() => setActiveSheet(null)}>
                        <Ionicons name="close" size={20} color="#6B7280" />
                      </Pressable>
                    </View>
                    <View style={styles.searchWrap}>
                      <Ionicons name="search" size={16} color="#9CA3AF" />
                      <TextInput
                        value={breedSearch}
                        onChangeText={setBreedSearch}
                        placeholder="Search breed..."
                        placeholderTextColor="#9CA3AF"
                        style={styles.searchInput}
                        clearButtonMode="while-editing"
                      />
                    </View>
                    <FlatList
                      data={breedsList}
                      keyExtractor={(item) => item}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => {
                        const isSelected = breed === item;
                        return (
                          <Pressable
                            onPress={() => {
                              haptic.light();
                              setBreed(item);
                              setActiveSheet(null);
                            }}
                            style={[
                              styles.sheetOptionRow,
                              isSelected && styles.sheetOptionSelected,
                            ]}
                          >
                            <Text style={styles.sheetOptionText}>{item}</Text>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={20} color="#059669" />
                            )}
                          </Pressable>
                        );
                      }}
                    />
                  </View>
                )}

                {/* Birth Year Sheet */}
                {activeSheet === 'birthYear' && (
                  <View style={{ maxHeight: 380 }}>
                    <View style={styles.sheetHeader}>
                      <Text style={styles.sheetTitle}>Select Birth Year</Text>
                      <Pressable onPress={() => setActiveSheet(null)}>
                        <Ionicons name="close" size={20} color="#6B7280" />
                      </Pressable>
                    </View>
                    <FlatList
                      data={BIRTH_YEAR_OPTIONS}
                      keyExtractor={(item) => String(item.year)}
                      renderItem={({ item }) => {
                        const isSelected = birthYear === item.year;
                        return (
                          <Pressable
                            onPress={() => {
                              haptic.light();
                              setBirthYear(item.year);
                              setActiveSheet(null);
                            }}
                            style={[
                              styles.sheetOptionRow,
                              isSelected && styles.sheetOptionSelected,
                            ]}
                          >
                            <Text style={styles.sheetOptionText}>{item.label}</Text>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={20} color="#059669" />
                            )}
                          </Pressable>
                        );
                      }}
                    />
                  </View>
                )}

                {/* Weight Category Sheet */}
                {activeSheet === 'weight' && (
                  <View>
                    <View style={styles.sheetHeader}>
                      <Text style={styles.sheetTitle}>Select Weight Category</Text>
                      <Pressable onPress={() => setActiveSheet(null)}>
                        <Ionicons name="close" size={20} color="#6B7280" />
                      </Pressable>
                    </View>
                    {WEIGHT_OPTIONS.map((item) => {
                      const isSelected = weightCategory === item.value;
                      return (
                        <Pressable
                          key={item.value}
                          onPress={() => {
                            haptic.light();
                            setWeightCategory(item.value);
                            setActiveSheet(null);
                          }}
                          style={[
                            styles.sheetOptionRow,
                            isSelected && styles.sheetOptionSelected,
                          ]}
                        >
                          <Text style={styles.sheetOptionText}>{item.label}</Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={20} color="#059669" />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Avatar Picker Modal */}
      <PetAvatarPickerModal
        visible={avatarPickerVisible}
        onClose={() => setAvatarPickerVisible(false)}
        species={species}
        petName={name || 'Pet'}
        currentAvatarId={avatarId}
        onSelectAvatar={(selectedId) => {
          setAvatarId(selectedId);
          setAvatarPickerVisible(false);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 18,
    ...shadows.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#059669',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: '#6EE7B7', // Soft mint / green match screenshot
  },
  submitBtnDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.7,
  },
  closeBtn: {
    backgroundColor: '#F3F4F6',
  },
  formScrollContent: {
    paddingTop: 14,
    paddingBottom: 10,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  avatarBorderCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    borderColor: '#059669',
    backgroundColor: '#E6F4EA',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 50,
    height: 50,
  },
  profileTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  profileBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.6,
  },
  profileBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  profileBoxSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  galleryPickerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  labelWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldMetaLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  columnFlex: {
    flex: 1,
  },
  dropdownTrigger: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 6,
  },
  dropdownPlaceholderText: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    borderRadius: 24,
    overflow: 'hidden',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    ...shadows.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  sheetOptionSelected: {
    backgroundColor: '#ECFDF5',
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#111827',
  },
});
