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
      [0.72, 0.82, 1.0, 0.82, 0.72],
      Extrapolation.CLAMP,
    );

    // Subtle drop for side cards so the active card stands elevated
    const translateY = interpolate(
      diff,
      [-1, 0, 1],
      [6, 0, 6],
      Extrapolation.CLAMP,
    );

    // Gentle inward 3D rotation
    const rotateY = interpolate(
      diff,
      [-1, 0, 1],
      [-14, 0, 14],
      Extrapolation.CLAMP,
    );

    const zIndex = Math.round(100 - Math.abs(diff) * 20);

    return {
      zIndex,
      opacity: 1,
      transform: [
        { perspective: 1000 },
        { translateY },
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
        {/* Card Body with Clean Clipping */}
        <View style={styles.avatarStage}>
          <PopoutPetAvatar
            avatarId={pet.avatarId}
            species={pet.species}
            photoUrl={pet.photoUrl}
            size={116}
            scale={1.42}
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
  const scrollRef = React.useRef<Animated.ScrollView>(null);

  // Enlarged Cover Flow Card Dimensions
  const cardWidth = Math.min(Math.round(windowWidth * 0.68), 256);
  const cardHeight = Math.round(cardWidth * 1.18); // ~302px
  const snapInterval = Math.round(cardWidth * 0.74); // ~190px
  const sideSpacer = Math.round((windowWidth - snapInterval) / 2);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeIndexRef = React.useRef(0);
  activeIndexRef.current = activeIndex;
  const isInteracting = React.useRef(false);

  // Auto-switch pet card every 3 seconds when pets > 1
  React.useEffect(() => {
    if (pets.length <= 1) return;

    const timer = setInterval(() => {
      if (isInteracting.current) return;
      const nextIndex = (activeIndexRef.current + 1) % pets.length;
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      scrollRef.current?.scrollTo({
        x: nextIndex * snapInterval,
        animated: true,
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [pets.length, snapInterval]);

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
      } else if (pet.id) {
        router.push(`/pets/${pet.id}` as never);
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
    <View style={styles.outerWrapper}>
      <View style={[styles.carouselContainer, { height: cardHeight + 20 }]}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapInterval}
          decelerationRate="fast"
          bounces={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          onScrollBeginDrag={() => {
            isInteracting.current = true;
          }}
          onScrollEndDrag={() => {
            setTimeout(() => {
              isInteracting.current = false;
            }, 2500);
          }}
          onMomentumScrollEnd={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const index = Math.round(x / snapInterval);
            const clamped = Math.max(0, Math.min(index, pets.length - 1));
            activeIndexRef.current = clamped;
            setActiveIndex(clamped);
            setTimeout(() => {
              isInteracting.current = false;
            }, 1500);
          }}
          contentContainerStyle={[
            styles.scrollTrack,
            {
              paddingLeft: sideSpacer,
              paddingRight: sideSpacer,
              height: cardHeight + 20,
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

      {/* Modern Switching Indicator Dots */}
      {pets.length > 1 && (
        <View style={styles.paginationDotsRow}>
          {pets.map((pet, idx) => {
            const isActive = idx === activeIndex;
            return (
              <Pressable
                key={pet.id}
                onPress={() => {
                  haptic.light();
                  activeIndexRef.current = idx;
                  setActiveIndex(idx);
                  scrollRef.current?.scrollTo({
                    x: idx * snapInterval,
                    animated: true,
                  });
                }}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Go to pet ${idx + 1}`}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  carouselContainer: {
    marginHorizontal: -spacing.md,
    overflow: 'visible',
    justifyContent: 'center',
  },
  paginationDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(7, 30, 38, 0.15)',
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
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  avatarStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    position: 'relative',
    height: 140,
    zIndex: 10,
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
