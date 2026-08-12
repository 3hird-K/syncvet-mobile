import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { ageFromBirthYear, formatAge } from '@lib/format';
import { haptic } from '@lib/haptics';
import type { Pet } from '@services/data';
import { Avatar } from './Avatar';

const PET_IMAGES: Record<string, any> = {
  dog: require('@assets/no-backgrounds/dog2-removebg-preview.png'),
  cat: require('@assets/no-backgrounds/cat1-removebg-preview.png'),
};

interface PetCardProps {
  pet: Pet;
  onPress?: () => void;
  onAdd?: () => void;
  compact?: boolean;
}

/** Vertical pet card for lists/grids with photo tile, name, breed and age. */
export function PetCard({ pet, onPress, onAdd, compact = false }: PetCardProps) {
  const age = formatAge(ageFromBirthYear(pet.birthYear));
  const petImage = PET_IMAGES[pet.species] ?? PET_IMAGES.dog;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pet.name}, ${pet.breed}, ${age}`}
      onPress={() => {
        haptic.light();
        onPress?.();
      }}
      onLongPress={onAdd}
      style={({ pressed }) => [styles.card, shadows.sm, pressed && styles.pressed]}
    >
      <Avatar
        name={pet.name}
        size={compact ? 52 : 68}
        photo={petImage}
        icon="paw"
      />
      <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>
        {pet.name}
      </Text>
      <Text style={styles.breed} numberOfLines={1}>
        {pet.breed}
      </Text>
      <View style={styles.ageRow}>
        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
        <Text style={styles.age}>{age}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.98 }],
  },
  name: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  nameCompact: {
    ...typography.captionBold,
    fontSize: 15,
  },
  breed: {
    ...typography.small,
    color: colors.textSecondary,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  age: {
    ...typography.small,
    color: colors.textMuted,
  },
});
