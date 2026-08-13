import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import {
  MISAMIS_ORIENTAL_LOCATIONS,
  searchPhilippineLocations,
} from '@lib/philippineAddresses';
import type { PhLocation } from '@lib/philippineAddresses';

interface AddressPickerProps {
  value: string;
  onChange: (fullAddress: string) => void;
  error?: string;
  editable?: boolean;
}

export function AddressPicker({
  value,
  onChange,
  error,
  editable = true,
}: AddressPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [streetDetail, setStreetDetail] = useState<string>('');

  // Parse existing address value if already filled
  React.useEffect(() => {
    if (value && !selectedLocation) {
      // Find if value matches any known location
      const match = MISAMIS_ORIENTAL_LOCATIONS.find((loc) =>
        value.includes(loc.barangay) && value.includes(loc.cityOrMunicipality),
      );
      if (match) {
        setSelectedLocation(match.fullLocation);
        const street = value.replace(match.fullLocation, '').replace(/,\s*$/, '').trim();
        setStreetDetail(street);
      } else {
        setStreetDetail(value);
      }
    }
  }, [value, selectedLocation]);

  const filteredLocations = useMemo(() => {
    return searchPhilippineLocations(searchQuery, 12);
  }, [searchQuery]);

  const handleOpenModal = useCallback(() => {
    if (!editable) return;
    haptic.light();
    setSearchQuery('');
    setModalVisible(true);
  }, [editable]);

  const handleSelectLocation = useCallback(
    (loc: PhLocation | string) => {
      haptic.medium();
      const locStr = typeof loc === 'string' ? loc : loc.fullLocation;
      setSelectedLocation(locStr);
      setModalVisible(false);

      // Combine with street detail
      const full = streetDetail.trim()
        ? `${streetDetail.trim()}, ${locStr}`
        : locStr;
      onChange(full);
    },
    [streetDetail, onChange],
  );

  const handleStreetChange = useCallback(
    (text: string) => {
      setStreetDetail(text);
      const full = text.trim()
        ? selectedLocation
          ? `${text.trim()}, ${selectedLocation}`
          : text.trim()
        : selectedLocation;
      onChange(full);
    },
    [selectedLocation, onChange],
  );

  return (
    <View style={styles.container}>
      {/* 1. Location / Barangay & City Picker */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select Barangay and City"
        onPress={handleOpenModal}
        disabled={!editable}
        style={({ pressed }) => [
          styles.field,
          error && !selectedLocation && !value ? styles.fieldError : null,
          pressed && styles.fieldPressed,
        ]}
      >
        <View style={styles.leftIcon}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
        </View>

        <Text
          style={[
            styles.fieldText,
            !selectedLocation && !value ? styles.placeholderText : null,
          ]}
          numberOfLines={1}
        >
          {selectedLocation || 'Select Barangay, City (Misamis Oriental)'}
        </Text>

        <View style={styles.rightChevron}>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </View>
      </Pressable>

      {/* 2. Street / House No. / Subdivision Input */}
      <View
        style={[
          styles.field,
          styles.streetField,
          error && !value ? styles.fieldError : null,
        ]}
      >
        <View style={styles.leftIcon}>
          <Ionicons name="home-outline" size={19} color={colors.primary} />
        </View>

        <TextInput
          value={streetDetail}
          onChangeText={handleStreetChange}
          placeholder="House no., street, subdivision, or zone"
          placeholderTextColor="#8A9E99"
          style={styles.input}
          editable={editable}
          returnKeyType="done"
        />
      </View>

      {/* Error display */}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Location Search Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.backdropPressable}
            onPress={() => setModalVisible(false)}
          />

          <SafeAreaView style={styles.sheetContainer}>
            <View style={styles.handleWrap}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Location</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={12}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Live Search Bar */}
            <View style={styles.searchWrap}>
              <Ionicons
                name="search-outline"
                size={18}
                color={colors.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search barangay, city, or municipality..."
                placeholderTextColor={colors.textDisabled}
                style={styles.searchInput}
                autoCorrect={false}
                autoFocus
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
              {searchQuery ? (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  hitSlop={8}
                  style={styles.clearSearchBtn}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* Quick Misamis Oriental Picks */}
            {!searchQuery ? (
              <View style={styles.quickPicksWrap}>
                <View style={styles.quickPicksHeader}>
                  <Ionicons name="sparkles" size={13} color={colors.primary} />
                  <Text style={styles.quickPicksTitle}>Popular in Misamis Oriental:</Text>
                </View>
                <View style={styles.quickPicksRow}>
                  {['Carmen, CDO', 'Nazareth, CDO', 'Lapasan, CDO', 'Barra, Opol', 'Tagoloan'].map(
                    (name) => (
                      <Pressable
                        key={name}
                        onPress={() => {
                          const match = MISAMIS_ORIENTAL_LOCATIONS.find((loc) =>
                            loc.fullLocation.toLowerCase().includes(name.split(',')[0].toLowerCase()),
                          );
                          if (match) handleSelectLocation(match);
                        }}
                        style={({ pressed }) => [
                          styles.quickChip,
                          pressed && styles.quickChipPressed,
                        ]}
                      >
                        <Ionicons name="location-sharp" size={12} color={colors.primaryDark} />
                        <Text style={styles.quickChipText}>{name}</Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            ) : null}

            {/* Location List */}
            <FlatList
              data={filteredLocations}
              keyExtractor={(item, idx) => `${item.barangay}-${item.cityOrMunicipality}-${idx}`}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                searchQuery.trim() &&
                !filteredLocations.some(
                  (l) => l.fullLocation.toLowerCase() === searchQuery.trim().toLowerCase(),
                ) ? (
                  <Pressable
                    onPress={() => handleSelectLocation(searchQuery.trim())}
                    style={({ pressed }) => [
                      styles.customRow,
                      pressed && styles.optionRowPressed,
                    ]}
                  >
                    <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                    <View style={styles.optionTextWrap}>
                      <Text style={styles.customTitle}>
                        Use &ldquo;{searchQuery.trim()}&rdquo;
                      </Text>
                      <Text style={styles.customSub}>Custom Philippine address</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                  </Pressable>
                ) : null
              }
              renderItem={({ item }) => {
                const isSelected = selectedLocation === item.fullLocation;
                return (
                  <Pressable
                    onPress={() => handleSelectLocation(item)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                      pressed && styles.optionRowPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.locIconBadge,
                        item.province === 'Misamis Oriental' && styles.locIconBadgeMisOr,
                      ]}
                    >
                      <Ionicons
                        name="location-sharp"
                        size={17}
                        color={
                          item.province === 'Misamis Oriental'
                            ? colors.primaryDark
                            : colors.textMuted
                        }
                      />
                    </View>

                    <View style={styles.optionTextWrap}>
                      <Text style={[styles.locBarangay, isSelected && styles.locSelectedText]}>
                        {item.barangay}
                      </Text>
                      <Text style={styles.locCity}>
                        {item.cityOrMunicipality}, {item.province}
                      </Text>
                    </View>

                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  streetField: {
    backgroundColor: '#FAFCFB',
  },
  fieldError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  fieldPressed: {
    borderColor: colors.primary,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  fieldText: {
    flex: 1,
    fontFamily: typography.font.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  placeholderText: {
    color: '#8A9E99',
  },
  rightChevron: {
    marginLeft: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: typography.font.medium,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'android' ? 6 : 10,
    includeFontPadding: false,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.small,
    color: colors.error,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 32, 29, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '82%',
    minHeight: 420,
    ...shadows.lg,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetTitle: {
    ...typography.heading2,
    fontSize: 18,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.font.regular,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  quickPicksWrap: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  quickPicksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  quickPicksTitle: {
    ...typography.smallBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  quickPicksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#EBF7F5',
    borderWidth: 1,
    borderColor: '#C3E8E1',
  },
  quickChipPressed: {
    opacity: 0.7,
  },
  quickChipText: {
    ...typography.smallBold,
    color: colors.primaryDark,
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    marginBottom: 4,
    gap: 12,
  },
  optionRowSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionRowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  locIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locIconBadgeMisOr: {
    backgroundColor: colors.primaryLight,
  },
  optionTextWrap: {
    flex: 1,
  },
  locBarangay: {
    ...typography.captionBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  locCity: {
    ...typography.small,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  locSelectedText: {
    color: colors.primaryDark,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: '#F0FAF8',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    marginBottom: 10,
    gap: 10,
  },
  customTitle: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  customSub: {
    ...typography.small,
    color: colors.primary,
    marginTop: 1,
  },
});
