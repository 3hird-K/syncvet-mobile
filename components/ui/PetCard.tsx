import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { ageFromBirthYear, formatAge } from '@lib/format';
import { haptic } from '@lib/haptics';
import type { Pet } from '@services/data';
import { PopoutPetAvatar } from './PopoutPetAvatar';

interface PetCardProps {
  pet: Pet;
  onPress?: () => void;
  compact?: boolean;
}

/** Modern Pet Card with 3D unclipped popout avatar, species tag, and vaccine status */
export function PetCard({ pet, onPress, compact = false }: PetCardProps) {
  const age = pet.birthYear ? formatAge(ageFromBirthYear(pet.birthYear)) : 'Young';
  const isDog = pet.species?.toLowerCase() === 'dog';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pet.name}, ${pet.breed}, ${age}`}
      onPress={() => {
        haptic.light();
        onPress?.();
      }}
      style={({ pressed }) => [styles.card, shadows.sm, pressed && styles.pressed]}
    >
      <View style={styles.avatarWrap}>
        <PopoutPetAvatar
          avatarId={pet.avatarId}
          species={pet.species}
          photoUrl={pet.photoUrl}
          size={compact ? 56 : 64}
        />
      </View>

      <View style={styles.contentWrap}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>
            {pet.name}
          </Text>
          <View style={[styles.speciesTag, isDog ? styles.speciesTagDog : styles.speciesTagCat]}>
            <Text style={[styles.speciesTagText, isDog ? styles.speciesTagTextDog : styles.speciesTagTextCat]}>
              {isDog ? 'Canine' : 'Feline'}
            </Text>
          </View>
        </View>

        <Text style={styles.breed} numberOfLines={1}>
          {pet.breed || (isDog ? 'Dog' : 'Cat')}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.ageRow}>
            <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
            <Text style={styles.age}>{age}</Text>
          </View>

          <View style={[styles.vaxBadge, pet.isVaccinated ? styles.vaxBadgeGreen : styles.vaxBadgeAmber]}>
            <Ionicons
              name={pet.isVaccinated ? 'shield-checkmark' : 'alert-circle'}
              size={10}
              color={pet.isVaccinated ? colors.success : colors.warning}
            />
            <Text style={[styles.vaxText, pet.isVaccinated ? styles.vaxTextGreen : styles.vaxTextAmber]}>
              {pet.isVaccinated ? 'Vax' : 'Due'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    alignItems: 'center',
    gap: 8,
    overflow: 'visible',
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.98 }],
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  contentWrap: {
    width: '100%',
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  name: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  nameCompact: {
    fontSize: 14.5,
  },
  speciesTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  speciesTagDog: {
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
  },
  speciesTagCat: {
    backgroundColor: 'rgba(219, 39, 119, 0.10)',
  },
  speciesTagText: {
    ...typography.captionBold,
    fontSize: 9.5,
  },
  speciesTagTextDog: {
    color: colors.primary,
  },
  speciesTagTextCat: {
    color: '#DB2777',
  },
  breed: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  age: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  vaxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  vaxBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  vaxBadgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
  },
  vaxText: {
    ...typography.captionBold,
    fontSize: 9.5,
  },
  vaxTextGreen: {
    color: colors.success,
  },
  vaxTextAmber: {
    color: colors.warning,
  },
});
