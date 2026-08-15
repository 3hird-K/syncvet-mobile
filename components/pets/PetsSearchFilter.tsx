import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';

export type PetFilterCategory = 'all' | 'dog' | 'cat' | 'needs_vaccine';

interface PetsSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: PetFilterCategory;
  onFilterChange: (filter: PetFilterCategory) => void;
  totalCount: number;
  dogCount: number;
  catCount: number;
  needsVaccineCount: number;
}

export function PetsSearchFilter({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  totalCount,
  dogCount,
  catCount,
  needsVaccineCount,
}: PetsSearchFilterProps) {
  const [isFocused, setIsFocused] = useState(false);

  const filters: { id: PetFilterCategory; label: string; count: number; isAmber?: boolean }[] = [
    { id: 'all', label: 'All', count: totalCount },
    { id: 'dog', label: 'Dogs', count: dogCount },
    { id: 'cat', label: 'Cats', count: catCount },
  ];

  if (needsVaccineCount > 0) {
    filters.push({
      id: 'needs_vaccine',
      label: 'Needs Shot',
      count: needsVaccineCount,
      isAmber: true,
    });
  }

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(260)} style={styles.container}>
      {/* Search Input Bar */}
      <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
        <Ionicons
          name="search-outline"
          size={18}
          color={isFocused ? colors.primaryDark : colors.textMuted}
        />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search by pet name, breed, or species..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <Pressable
            onPress={() => {
              haptic.light();
              onSearchChange('');
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Filter Pills Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsRow}
      >
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${filter.label}`}
              onPress={() => {
                haptic.light();
                onFilterChange(filter.id);
              }}
              style={[
                styles.chip,
                isActive && (filter.isAmber ? styles.chipActiveAmber : styles.chipActive),
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  isActive && (filter.isAmber ? styles.chipTextActiveAmber : styles.chipTextActive),
                ]}
              >
                {filter.label} ({filter.count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    gap: 8,
  },
  searchBarFocused: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.surface,
  },
  searchInput: {
    ...typography.caption,
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    paddingVertical: 0,
  },
  filterChipsRow: {
    gap: 8,
    paddingHorizontal: 2,
  },
  chip: {
    backgroundColor: 'rgba(7, 30, 38, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.primaryDark,
  },
  chipActiveAmber: {
    backgroundColor: colors.warning,
  },
  chipText: {
    ...typography.captionBold,
    fontSize: 12,
    fontFamily: typography.font.bold,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.white,
  },
  chipTextActiveAmber: {
    color: colors.white,
  },
});
