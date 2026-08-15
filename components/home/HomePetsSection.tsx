import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { formatAge, ageFromBirthYear } from '@lib/format';
import { haptic } from '@lib/haptics';
import { SectionHeader } from '@components/ui/SectionHeader';
import { PopoutPetAvatar } from '@components/ui/PopoutPetAvatar';
import type { Pet } from '@services/data';

interface HomePetsSectionProps {
  pets: Pet[];
}

export function HomePetsSection({ pets }: HomePetsSectionProps) {
  const router = useRouter();

  // 1. Empty state: No pets registered yet
  if (pets.length === 0) {
    return (
      <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.section}>
        <SectionHeader title="My Pets" />
        <View style={[styles.onboardingCard, shadows.sm]}>
          <View style={styles.onboardingIconCircle}>
            <Ionicons name="paw" size={26} color={colors.primary} />
          </View>
          <View style={styles.onboardingTextCol}>
            <Text style={styles.onboardingTitle}>Your pets deserve a profile</Text>
            <Text style={styles.onboardingSub}>
              Register your pet to manage vaccination schedules and digital health passports.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add first pet"
            onPress={() => {
              haptic.light();
              router.push('/pets/add' as never);
            }}
            style={({ pressed }) => [styles.onboardingBtn, pressed && styles.onboardingBtnPressed]}
          >
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.onboardingBtnText}>Add Pet</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  // 2. Single Pet Hero Showcase
  if (pets.length === 1) {
    const pet = pets[0];
    const isDog = pet.species?.toLowerCase() === 'dog';
    const ageText = pet.birthYear
      ? formatAge(ageFromBirthYear(pet.birthYear))
      : null;

    return (
      <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.section}>
        <SectionHeader
          title="My Pets"
          icon={<Ionicons name="paw-outline" size={17} color={colors.primaryDark} />}
          actionLabel="View All"
          onAction={() => {
            haptic.light();
            router.push('/pets' as never);
          }}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${pet.name}'s Health Passport`}
          onPress={() => {
            haptic.light();
            router.push(`/pets/${pet.id}` as never);
          }}
          style={({ pressed }) => [
            styles.singlePetHeroCard,
            shadows.sm,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.singlePetAvatarWrap}>
            <PopoutPetAvatar
              avatarId={pet.avatarId}
              species={pet.species}
              photoUrl={pet.photoUrl}
              size={64}
              scale={1.35}
            />
          </View>

          <View style={styles.singlePetInfo}>
            <View style={styles.petNameRow}>
              <Text style={styles.petName} numberOfLines={1}>
                {pet.name}
              </Text>
              <View
                style={[
                  styles.vaxBadge,
                  pet.isVaccinated ? styles.vaxBadgeSuccess : styles.vaxBadgeWarning,
                ]}
              >
                <Ionicons
                  name={pet.isVaccinated ? 'shield-checkmark' : 'alert-circle'}
                  size={11}
                  color={pet.isVaccinated ? colors.success : colors.warning}
                />
                <Text
                  style={[
                    styles.vaxBadgeText,
                    pet.isVaccinated ? styles.vaxTextSuccess : styles.vaxTextWarning,
                  ]}
                >
                  {pet.isVaccinated ? 'Protected' : 'Needs Shot'}
                </Text>
              </View>
            </View>

            <Text style={styles.petBreed} numberOfLines={1}>
              {pet.breed || (isDog ? 'Canine' : 'Feline')}
              {ageText ? ` · ${ageText}` : ''}
            </Text>

            <View style={styles.passportLinkRow}>
              <Text style={styles.passportLinkText}>View Digital Passport</Text>
              <Ionicons name="arrow-forward" size={13} color={colors.primary} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // 3. Multi-Pet Horizontal Carousel with "+ Add Pet" Card
  return (
    <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.section}>
      <SectionHeader
        title="My Pets"
        icon={<Ionicons name="paw-outline" size={17} color={colors.primaryDark} />}
        actionLabel="View All"
        onAction={() => {
          haptic.light();
          router.push('/pets' as never);
        }}
      />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[...pets, { id: '__add_pet__' } as unknown as Pet]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.horizontalScrollContent}
        renderItem={({ item: pet }) => {
          // "+ Add Pet" Action Card at the end
          if (pet.id === '__add_pet__') {
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Register a new pet"
                onPress={() => {
                  haptic.light();
                  router.push('/pets/add' as never);
                }}
                style={({ pressed }) => [
                  styles.addPetCard,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.addPetIconWrap}>
                  <Ionicons name="add" size={22} color={colors.primary} />
                </View>
                <Text style={styles.addPetTitle}>Add Pet</Text>
                <Text style={styles.addPetSub}>New Profile</Text>
              </Pressable>
            );
          }

          const isDog = pet.species?.toLowerCase() === 'dog';
          const ageText = pet.birthYear
            ? formatAge(ageFromBirthYear(pet.birthYear))
            : null;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${pet.name}'s Profile`}
              onPress={() => {
                haptic.light();
                router.push(`/pets/${pet.id}` as never);
              }}
              style={({ pressed }) => [
                styles.multiPetCard,
                shadows.sm,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.multiPetAvatarWrap}>
                <PopoutPetAvatar
                  avatarId={pet.avatarId}
                  species={pet.species}
                  photoUrl={pet.photoUrl}
                  size={58}
                  scale={1.3}
                />
              </View>

              <View style={styles.multiPetBody}>
                <View style={styles.petNameRow}>
                  <Text style={styles.multiPetName} numberOfLines={1}>
                    {pet.name}
                  </Text>
                </View>

                <Text style={styles.multiPetBreed} numberOfLines={1}>
                  {pet.breed || (isDog ? 'Canine' : 'Feline')}
                  {ageText ? ` · ${ageText}` : ''}
                </Text>

                <View
                  style={[
                    styles.vaxBadge,
                    pet.isVaccinated ? styles.vaxBadgeSuccess : styles.vaxBadgeWarning,
                  ]}
                >
                  <Ionicons
                    name={pet.isVaccinated ? 'shield-checkmark' : 'alert-circle'}
                    size={10}
                    color={pet.isVaccinated ? colors.success : colors.warning}
                  />
                  <Text
                    style={[
                      styles.vaxBadgeText,
                      pet.isVaccinated ? styles.vaxTextSuccess : styles.vaxTextWarning,
                    ]}
                  >
                    {pet.isVaccinated ? 'Protected' : 'Needs Shot'}
                  </Text>
                </View>
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
    transform: [{ scale: 0.985 }],
  },
  // 1. Onboarding
  onboardingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.12)',
    gap: spacing.sm,
  },
  onboardingIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(10, 110, 100, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingTextCol: {
    flex: 1,
    gap: 2,
  },
  onboardingTitle: {
    ...typography.captionBold,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  onboardingSub: {
    ...typography.small,
    fontSize: 12,
    color: colors.textMuted,
  },
  onboardingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  onboardingBtnPressed: {
    opacity: 0.85,
  },
  onboardingBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  // 2. Single Pet Hero
  singlePetHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.12)',
    gap: spacing.md,
  },
  singlePetAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  singlePetInfo: {
    flex: 1,
    gap: 3,
  },
  petNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  petName: {
    ...typography.heading3,
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: typography.font.bold,
    flex: 1,
  },
  petBreed: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12.5,
  },
  passportLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  passportLinkText: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.primaryDark,
    fontFamily: typography.font.bold,
  },
  vaxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  vaxBadgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  vaxBadgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
  },
  vaxBadgeText: {
    ...typography.captionBold,
    fontSize: 10.5,
    fontFamily: typography.font.bold,
  },
  vaxTextSuccess: {
    color: colors.success,
  },
  vaxTextWarning: {
    color: colors.warning,
  },
  // 3. Multi-Pet Horizontal Scroll
  horizontalScrollContent: {
    gap: 12,
    paddingRight: spacing.md,
  },
  multiPetCard: {
    width: 175,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.10)',
    gap: 8,
  },
  multiPetAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
  },
  multiPetBody: {
    gap: 4,
  },
  multiPetName: {
    ...typography.title,
    fontSize: 15,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
  },
  multiPetBreed: {
    ...typography.small,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  addPetCard: {
    width: 130,
    backgroundColor: 'rgba(10, 110, 100, 0.04)',
    borderRadius: radius.xl,
    padding: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(10, 110, 100, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.12)',
  },
  addPetTitle: {
    ...typography.title,
    fontSize: 13,
    fontFamily: typography.font.bold,
    color: colors.primaryDark,
  },
  addPetSub: {
    ...typography.small,
    fontSize: 10.5,
    color: colors.textMuted,
  },
});
