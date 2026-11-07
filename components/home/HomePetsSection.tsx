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

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { getPetAvatarSource } from '@lib/petAvatars';
import type { Pet } from '@services/data';

interface HomePetsSectionProps {
  pets: Pet[];
}

const GRADIENT_PALETTES = [
  // 0: Deep Purple / Violet (like Gehlee, Cadmus, Angela in Pet Registry)
  { top: '#4C1D95', bottom: '#170530' },
  // 1: Deep Ocean / Teal (like Oreo in Pet Registry)
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
  return GRADIENT_PALETTES[index % 2 === 0 ? 0 : 2]; // Rich Violet / Indigo for cats
}

export function HomePetsSection({ pets }: HomePetsSectionProps) {
  const router = useRouter();

  // If no pets registered yet, show an empty state card
  if (pets.length === 0) {
    return (
      <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Ionicons name="paw" size={17} color={colors.primary} />
            <Text style={styles.headerTitle}>PET REGISTRY</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>0</Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Register first pet"
          onPress={() => {
            haptic.light();
            router.push('/pets/add' as never);
          }}
          style={({ pressed }) => [
            styles.emptyRegisterCard,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.registerIconBox}>
            <Ionicons name="add" size={26} color="#0F766E" />
          </View>
          <Text style={styles.registerTitle}>Register Pet</Text>
          <Text style={styles.registerSubtitle}>Add your first companion to CDO registry</Text>
        </Pressable>
      </Animated.View>
    );
  }

  // Prepend "+ Register Pet" card as the very first card in the carousel (matching design)
  const listItems = [{ id: '__register_pet__' } as unknown as Pet, ...pets];

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.section}>
      {/* Header: PET REGISTRY [5] | View All > */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="paw" size={17} color={colors.primary} />
          <Text style={styles.headerTitle}>PET REGISTRY</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{pets.length}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View All Pets"
          onPress={() => {
            haptic.light();
            router.push('/pets' as never);
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.viewAllBtn, pressed && styles.viewAllPressed]}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>

      {/* Horizontal Carousel */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={listItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.horizontalScrollContent}
        renderItem={({ item: pet, index }) => {
          // Card 0: Dashed "Register Pet / Add Companion" Card
          if (pet.id === '__register_pet__') {
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Register a new pet"
                onPress={() => {
                  haptic.light();
                  router.push('/pets/add' as never);
                }}
                style={({ pressed }) => [
                  styles.registerPetCard,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.registerIconBox}>
                  <Ionicons name="add" size={26} color="#0F766E" />
                </View>
                <Text style={styles.registerTitle}>Register Pet</Text>
                <Text style={styles.registerSubtitle}>Add Companion</Text>
              </Pressable>
            );
          }

          // Pet Cards (Full-bleed vibrant gradient cards)
          const isDog = pet.species?.toLowerCase() === 'dog';
          const gradient = getPetGradient(pet, index);
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
                  <LinearGradient id={`card-grad-${pet.id}-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={gradient.top} />
                    <Stop offset="100%" stopColor={gradient.bottom} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill={`url(#card-grad-${pet.id}-${index})`} />
              </Svg>

              {/* Pet 3D Avatar Image */}
              <View style={styles.petImageWrap}>
                <Image
                  source={avatarSource}
                  style={styles.petImage}
                  resizeMode="contain"
                />
              </View>

              {/* Bottom Scrim for crisp text contrast */}
              <Svg width="100%" height={75} style={styles.scrim}>
                <Defs>
                  <LinearGradient id={`scrim-${pet.id}-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
                    <Stop offset="45%" stopColor="#000000" stopOpacity="0.45" />
                    <Stop offset="100%" stopColor="#000000" stopOpacity="0.9" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill={`url(#scrim-${pet.id}-${index})`} />
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.975 }],
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
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
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAllPressed: {
    opacity: 0.7,
  },
  viewAllText: {
    fontFamily: typography.font.bold,
    fontSize: 12,
    color: colors.primary,
  },

  /* Horizontal Carousel */
  horizontalScrollContent: {
    gap: 12,
    paddingRight: spacing.md,
  },

  /* Register Pet Card (Dashed Border) */
  registerPetCard: {
    width: 138,
    height: 196,
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  registerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  registerTitle: {
    fontFamily: typography.font.bold,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  registerSubtitle: {
    fontFamily: typography.font.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 3,
  },

  /* Empty Register Card */
  emptyRegisterCard: {
    width: '100%',
    height: 140,
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  /* Pet Full-Bleed Gradient Card */
  petCard: {
    width: 138,
    height: 196,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1035',
  },
  petImageWrap: {
    width: '100%',
    height: 138,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  petImage: {
    width: 120,
    height: 125,
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
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  petName: {
    fontFamily: typography.font.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  petBreed: {
    fontFamily: typography.font.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
  },
});
