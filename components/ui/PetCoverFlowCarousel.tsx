import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { formatAge, ageFromBirthYear } from '@lib/format';
import { haptic } from '@lib/haptics';
import type { Pet } from '@services/data';
import { PopoutPetAvatar } from './PopoutPetAvatar';

interface PetCoverFlowCarouselProps {
  pets: Pet[];
  onSelectPet?: (pet: Pet) => void;
}

interface CoverFlowCardProps {
  pet: Pet;
  index: number;
  scrollX: SharedValue<number>;
  cardWidth: number;
  cardHeight: number;
  snapInterval: number;
  onPress: () => void;
}

function CoverFlowCard({
  pet,
  index,
  scrollX,
  cardWidth,
  cardHeight,
  snapInterval,
  onPress,
}: CoverFlowCardProps) {
  const isDog = pet.species?.toLowerCase() === 'dog';
  const age = pet.birthYear ? formatAge(ageFromBirthYear(pet.birthYear)) : 'Young';

  const animatedStyle = useAnimatedStyle(() => {
    const position = scrollX.value / snapInterval;
    const diff = position - index;

    // Scale down cards as they move away from center
    const scale = interpolate(
      diff,
      [-1.5, -1, 0, 1, 1.5],
      [0.76, 0.84, 1.0, 0.84, 0.76],
      Extrapolation.CLAMP,
    );

    // Fade cards that are in the background
    const opacity = interpolate(
      diff,
      [-1.5, -1, 0, 1, 1.5],
      [0.45, 0.72, 1.0, 0.72, 0.45],
      Extrapolation.CLAMP,
    );

    // 3D inward rotation towards center
    const rotateY = interpolate(
      diff,
      [-1, 0, 1],
      [-30, 0, 30],
      Extrapolation.CLAMP,
    );

    const zIndex = Math.round(100 - Math.abs(diff) * 10);

    return {
      zIndex,
      opacity,
      transform: [
        { perspective: 900 },
        { scale },
        { rotateY: `${rotateY}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        { width: cardWidth, height: cardHeight },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.cardInner,
          shadows.md,
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${pet.name}, ${pet.breed || pet.species}, ${age}`}
      >
        {/* Clipped Card Surface Backdrop */}
        <View style={styles.cardClippedBackdrop} />

        {/* Center Extra-Large 3D Popout Avatar */}
        <View style={styles.avatarStage}>
          <PopoutPetAvatar
            avatarId={pet.avatarId}
            species={pet.species}
            photoUrl={pet.photoUrl}
            size={136}
            scale={1.65}
          />
        </View>

        {/* Minimalist Bottom Info */}
        <View style={styles.bottomInfoWrap}>
          <Text style={styles.petNameText} numberOfLines={1}>
            {pet.name}
          </Text>
          <Text style={styles.petSubText} numberOfLines={1}>
            {pet.breed || (isDog ? 'Dog' : 'Cat')} · {age}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function PetCoverFlowCarousel({
  pets,
  onSelectPet,
}: PetCoverFlowCarouselProps) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const scrollX = useSharedValue(0);

  // Enlarged Cover Flow Card Dimensions
  const cardWidth = Math.min(Math.round(windowWidth * 0.68), 256);
  const cardHeight = Math.round(cardWidth * 1.18); // ~302px
  const snapInterval = Math.round(cardWidth * 0.74); // ~190px
  const sideSpacer = Math.round((windowWidth - snapInterval) / 2);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleCardPress = useCallback(
    (pet: Pet) => {
      haptic.light();
      if (onSelectPet) {
        onSelectPet(pet);
      } else {
        router.push('/pets' as never);
      }
    },
    [onSelectPet, router],
  );

  if (pets.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyPaw}>
          <Ionicons name="paw" size={32} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No Pets Registered</Text>
        <Text style={styles.emptySub}>
          Register your pet to generate their official City Vet Digital Passport.
        </Text>
        <Pressable
          onPress={() => {
            haptic.light();
            router.push('/pets/add' as never);
          }}
          style={styles.emptyBtn}
        >
          <Text style={styles.emptyBtnText}>Register Pet</Text>
          <Ionicons name="add" size={16} color={colors.white} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.carouselContainer, { height: cardHeight + 24 }]}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        bounces={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        contentContainerStyle={[
          styles.scrollTrack,
          {
            paddingLeft: sideSpacer,
            paddingRight: sideSpacer,
            height: cardHeight + 24,
          },
        ]}
      >
        {pets.map((pet, index) => (
          <View
            key={pet.id}
            style={{
              width: snapInterval,
              height: cardHeight,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
            }}
          >
            <CoverFlowCard
              pet={pet}
              index={index}
              scrollX={scrollX}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              snapInterval={snapInterval}
              onPress={() => handleCardPress(pet)}
            />
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    marginHorizontal: -spacing.md,
    overflow: 'visible',
    justifyContent: 'center',
  },
  scrollTrack: {
    alignItems: 'center',
    overflow: 'visible',
  },
  cardContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  cardInner: {
    width: '100%',
    height: '100%',
    padding: 14,
    justifyContent: 'space-between',
    overflow: 'visible',
    position: 'relative',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  cardClippedBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    overflow: 'hidden',
  },
  avatarStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    position: 'relative',
    height: 154,
    zIndex: 10,
    elevation: 10,
    overflow: 'visible',
  },
  bottomInfoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
    gap: 3,
    zIndex: 2,
  },
  petNameText: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  petSubText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  emptyWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 8,
    marginVertical: 6,
  },
  emptyPaw: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  emptyBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12.5,
  },
});
