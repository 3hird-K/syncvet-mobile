import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { formatAge, ageFromBirthYear } from '@lib/format';
import { haptic } from '@lib/haptics';
import { PopoutPetAvatar } from '@components/ui/PopoutPetAvatar';
import type { Pet } from '@services/data';

interface PetPassportCardProps {
  pet: Pet;
  index: number;
}

export function PetPassportCard({ pet, index }: PetPassportCardProps) {
  const router = useRouter();

  const isDog = pet.species?.toLowerCase() === 'dog';
  const ageText = pet.birthYear
    ? formatAge(ageFromBirthYear(pet.birthYear))
    : undefined;
  const genderLabel =
    pet.gender === 'male'
      ? 'Male ♂'
      : pet.gender === 'female'
      ? 'Female ♀'
      : undefined;

  return (
    <Animated.View entering={FadeInDown.delay(index * 35).duration(220)} style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${pet.name}'s Health Passport`}
        onPress={() => {
          haptic.light();
          router.push(`/pets/${pet.id}` as never);
        }}
        style={({ pressed }) => [styles.card, shadows.sm, pressed && styles.cardPressed]}
      >
        {/* Header Row: 3D Avatar + Name + Tags + Chevron */}
        <View style={styles.headerRow}>
          <View style={styles.avatarHolder}>
            <PopoutPetAvatar
              avatarId={pet.avatarId}
              species={pet.species}
              photoUrl={pet.photoUrl}
              size={54}
              scale={1.3}
            />
          </View>

          <View style={styles.identityCol}>
            <View style={styles.nameRow}>
              <Text style={styles.petName} numberOfLines={1}>
                {pet.name}
              </Text>
              <View
                style={[
                  styles.speciesBadge,
                  isDog ? styles.speciesBadgeDog : styles.speciesBadgeCat,
                ]}
              >
                <Text
                  style={[
                    styles.speciesBadgeText,
                    isDog ? styles.speciesBadgeTextDog : styles.speciesBadgeTextCat,
                  ]}
                >
                  {isDog ? 'Canine' : 'Feline'}
                </Text>
              </View>

              {pet._pendingSync ? (
                <View style={styles.pendingHeaderBadge}>
                  <Text style={styles.pendingHeaderBadgeText}>Pending</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.petBreed} numberOfLines={1}>
              {pet.breed || (isDog ? 'Dog' : 'Cat')}
              {genderLabel ? ` · ${genderLabel}` : ''}
            </Text>
          </View>

          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
          </View>
        </View>

        {/* Immunization & Vital Status Row */}
        <View style={styles.statusChipsRow}>
          {/* Pending Sync Badge if modified offline */}
          {pet._pendingSync ? (
            <View style={styles.pendingSyncBadge}>
              <Ionicons name="cloud-upload-outline" size={11} color={colors.warning} />
              <Text style={styles.pendingSyncText}>Pending Sync</Text>
            </View>
          ) : null}

          {/* Anti-Rabies Protection Status */}
          {pet.isVaccinated ? (
            <View style={styles.vaxBadgeGreen}>
              <Ionicons name="shield-checkmark" size={12} color={colors.success} />
              <Text style={styles.vaxBadgeTextGreen}>Anti-Rabies Protected</Text>
            </View>
          ) : (
            <View style={styles.vaxBadgeAmber}>
              <Ionicons name="alert-circle" size={12} color={colors.warning} />
              <Text style={styles.vaxBadgeTextAmber}>Needs Anti-Rabies</Text>
            </View>
          )}

          {/* Age Chip */}
          {ageText ? (
            <View style={styles.vitalChip}>
              <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
              <Text style={styles.vitalChipText}>{ageText}</Text>
            </View>
          ) : null}

          {/* Spayed/Neutered Chip */}
          {pet.isSpayedNeutered ? (
            <View style={styles.vitalChip}>
              <Ionicons name="checkmark-done" size={11} color={colors.primaryDark} />
              <Text style={styles.vitalChipText}>Neutered</Text>
            </View>
          ) : null}
        </View>

        {/* Card Action Footer */}
        <View style={styles.cardFooter}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Book visit for ${pet.name}`}
            onPress={(e) => {
              e.stopPropagation();
              haptic.light();
              router.push({
                pathname: '/appointments/new',
                params: { petId: pet.id, petName: pet.name },
              } as never);
            }}
            style={({ pressed }) => [
              styles.bookBtn,
              pressed && styles.bookBtnPressed,
            ]}
          >
            <Ionicons name="calendar-outline" size={13} color={colors.primaryDark} />
            <Text style={styles.bookBtnText}>Book Visit</Text>
          </Pressable>

          <View style={styles.passportLink}>
            <Text style={styles.passportLinkText}>Digital Passport</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.primaryDark} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.10)',
    gap: 10,
  },
  cardPressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.99 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarHolder: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCol: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petName: {
    ...typography.title,
    fontSize: 15,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
  },
  speciesBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  speciesBadgeDog: {
    backgroundColor: 'rgba(10, 110, 100, 0.10)',
  },
  speciesBadgeCat: {
    backgroundColor: 'rgba(219, 39, 119, 0.10)',
  },
  speciesBadgeText: {
    ...typography.captionBold,
    fontSize: 10,
    fontFamily: typography.font.bold,
  },
  speciesBadgeTextDog: {
    color: colors.primaryDark,
  },
  speciesBadgeTextCat: {
    color: '#DB2777',
  },
  pendingHeaderBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  pendingHeaderBadgeText: {
    ...typography.captionBold,
    fontSize: 9.5,
    fontFamily: typography.font.bold,
    color: colors.warning,
  },
  petBreed: {
    ...typography.small,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  chevronWrap: {
    paddingLeft: 4,
  },
  statusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  pendingSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 7.5,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.30)',
  },
  pendingSyncText: {
    ...typography.captionBold,
    fontSize: 10.5,
    fontFamily: typography.font.bold,
    color: colors.warning,
  },
  vaxBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    paddingHorizontal: 7.5,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
  },
  vaxBadgeAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    paddingHorizontal: 7.5,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
  },
  vaxBadgeTextGreen: {
    ...typography.captionBold,
    fontSize: 10.5,
    fontFamily: typography.font.bold,
    color: colors.success,
  },
  vaxBadgeTextAmber: {
    ...typography.captionBold,
    fontSize: 10.5,
    fontFamily: typography.font.bold,
    color: colors.warning,
  },
  vitalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    paddingHorizontal: 7.5,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
  },
  vitalChipText: {
    ...typography.captionBold,
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(7, 30, 38, 0.05)',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10, 110, 100, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  bookBtnPressed: {
    backgroundColor: 'rgba(10, 110, 100, 0.16)',
  },
  bookBtnText: {
    ...typography.captionBold,
    fontSize: 11.5,
    fontFamily: typography.font.bold,
    color: colors.primaryDark,
  },
  passportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  passportLinkText: {
    ...typography.captionBold,
    fontSize: 11.5,
    fontFamily: typography.font.bold,
    color: colors.primaryDark,
  },
});
