import React from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { colors, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { getPetAvatarSource } from '@lib/petAvatars';
import type { Pet } from '@services/data';

interface HomePetsSectionProps {
  pets: Pet[];
  userPhotoUrl?: string | null;
}

const GRADIENT_PALETTES = [
  // 0: Deep Purple / Violet (Gehlee, Cadmus)
  { top: '#4C1D95', bottom: '#170530' },
  // 1: Deep Ocean / Teal (Dogs)
  { top: '#0D9488', bottom: '#042F2C' },
  // 2: Rich Indigo
  { top: '#3730A3', bottom: '#0F0E2A' },
  // 3: Deep Emerald
  { top: '#065F46', bottom: '#022C22' },
  // 4: Warm Plum
  { top: '#701A75', bottom: '#260429' },
];

function getPetGradient(pet: Pet, index: number) {
  const isDog = pet.species?.toLowerCase() === 'dog';
  if (isDog) {
    return GRADIENT_PALETTES[1]; // Deep Ocean Teal for dogs
  }
  return GRADIENT_PALETTES[index % 2 === 0 ? 0 : 2];
}

export function HomePetsSection({ pets, userPhotoUrl }: HomePetsSectionProps) {
  const router = useRouter();

  const handleRegisterPress = () => {
    haptic.light();
    router.push('/pets/add' as never);
  };

  // Prepend Facebook Stories-style "Add Pet" card as the first item
  const carouselItems: (Pet | { id: string; isCreateCard: true })[] = [
    { id: '__add_pet_story__', isCreateCard: true },
    ...pets,
  ];

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.section}>
      {/* 1. Header: PET REGISTRY [count] */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="paw" size={17} color={colors.primary} />
          <Text style={styles.headerTitle}>PET REGISTRY</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{pets.length}</Text>
          </View>
        </View>
      </View>

      {/* 2. Facebook Stories Style Carousel (with very little gap: 6px) */}
      <View style={styles.carouselWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={carouselItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.horizontalScrollContent}
          renderItem={({ item, index }) => {
            // First Card: Facebook-style "Create Story / Add Pet" Card
            if ('isCreateCard' in item && item.isCreateCard) {
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add Pet"
                  onPress={handleRegisterPress}
                  style={({ pressed }) => [
                    styles.createStoryCard,
                    shadows.sm,
                    pressed && styles.cardPressed,
                  ]}
                >
                  {/* Top 62% Image Portion: User Profile Photo */}
                  <View style={styles.createStoryTopWrap}>
                    {userPhotoUrl ? (
                      <Image
                        source={{ uri: userPhotoUrl }}
                        style={styles.createStoryTopImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        source={require('@assets/boy-child.png')}
                        style={styles.createStoryTopImg}
                        resizeMode="cover"
                      />
                    )}
                  </View>

                  {/* Circular '+' Overlap Button with Thick White Border */}
                  <View style={styles.createStoryPlusBtn}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </View>

                  {/* Bottom White Section with 'Add Pet' Label */}
                  <View style={styles.createStoryBottom}>
                    <Text style={styles.createStoryLabel}>Add Pet</Text>
                  </View>
                </Pressable>
              );
            }

            // Pet Profile Cards
            const pet = item as Pet;
            const petIndex = index - 1;
            const isDog = pet.species?.toLowerCase() === 'dog';
            const gradient = getPetGradient(pet, petIndex);
            const avatarSource = getPetAvatarSource(pet.avatarId, pet.species, pet.photoUrl, pet.name);

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${pet.name}'s Profile`}
                onPress={() => {
                  haptic.light();
                  router.push(`/pets/${pet.id}` as never);
                }}
                style={({ pressed }) => [
                  styles.petCard,
                  shadows.sm,
                  pressed && styles.cardPressed,
                ]}
              >
                {/* Full-bleed Gradient Background */}
                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient id={`card-grad-${pet.id}-${petIndex}`} x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor={gradient.top} />
                      <Stop offset="100%" stopColor={gradient.bottom} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill={`url(#card-grad-${pet.id}-${petIndex})`} />
                </Svg>

                {/* Pet 3D Avatar Image - BIG and anchored to bottom */}
                <View style={styles.petImageWrap}>
                  <Image
                    source={avatarSource}
                    style={styles.petImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Bottom Scrim for crisp text contrast */}
                <Svg width="100%" height={85} style={styles.scrim}>
                  <Defs>
                    <LinearGradient id={`scrim-${pet.id}-${petIndex}`} x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
                      <Stop offset="45%" stopColor="#000000" stopOpacity="0.45" />
                      <Stop offset="100%" stopColor="#000000" stopOpacity="0.9" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill={`url(#scrim-${pet.id}-${petIndex})`} />
                </Svg>

                {/* Bottom Pet Name & Breed Info */}
                <View style={styles.petInfo}>
                  <Text style={styles.petName} numberOfLines={1}>
                    {pet.name}
                  </Text>
                  <Text style={styles.petBreed} numberOfLines={1}>
                    {pet.breed || (isDog ? 'Canine' : 'Feline')}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
    marginBottom: 12,
    width: '100%',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.975 }],
  },

  /* Header */
  headerRow: {
    width: '97%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontFamily: typography.font.bold,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.6,
  },
  countBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginLeft: 2,
  },
  countBadgeText: {
    fontFamily: typography.font.bold,
    fontSize: 11,
    color: '#4338CA',
  },

  /* Carousel */
  carouselWrap: {
    width: '100%',
  },
  horizontalScrollContent: {
    gap: 6, // Very little gap just like Facebook stories!
    paddingHorizontal: '1.5%',
  },

  /* Facebook-style Create Story / Add Pet Card */
  createStoryCard: {
    width: 118,
    height: 195,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E6EB',
  },
  createStoryTopWrap: {
    width: '100%',
    height: 126,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  createStoryTopImg: {
    width: '100%',
    height: '100%',
  },
  createStoryPlusBtn: {
    position: 'absolute',
    top: 108, // Overlaps the dividing line between image and white bottom
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D9488',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...shadows.sm,
  },
  createStoryBottom: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 11,
  },
  createStoryLabel: {
    fontFamily: typography.font.bold,
    fontSize: 12.5,
    color: '#050505',
    textAlign: 'center',
  },

  /* Pet Gradient Cards */
  petCard: {
    width: 118,
    height: 195,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1035',
  },
  petImageWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 188,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  petImage: {
    width: 140,
    height: 188,
  },
  scrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  petInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 9,
    paddingBottom: 9,
  },
  petName: {
    fontFamily: typography.font.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  petBreed: {
    fontFamily: typography.font.regular,
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 1,
  },
});
