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

export interface DropdownOption {
  label: string;
  value: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  category?: string;
}

interface DropdownSelectProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: (DropdownOption | string)[];
  title?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  allowCustom?: boolean;
  customPlaceholder?: string;
  disabled?: boolean;
}

export function DropdownSelect({
  label,
  placeholder = 'Select an option...',
  value,
  onChange,
  options,
  title = 'Select Option',
  error,
  leftIcon,
  allowCustom = true,
  customPlaceholder = 'Search or enter custom...',
  disabled = false,
}: DropdownSelectProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedOptions: DropdownOption[] = useMemo(() => {
    return options.map((opt) =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt,
    );
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)),
    );
  }, [normalizedOptions, searchQuery]);

  const hasExactMatch = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.some((opt) => opt.value.toLowerCase() === q);
  }, [normalizedOptions, searchQuery]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    haptic.light();
    setSearchQuery('');
    setModalVisible(true);
  }, [disabled]);

  const handleClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleSelect = useCallback(
    (selectedValue: string) => {
      haptic.medium();
      onChange(selectedValue);
      setModalVisible(false);
    },
    [onChange],
  );

  const displayLabel = selectedOption?.label || (value ? value : '');

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label} accessibilityRole="header">
          {label}
        </Text>
      ) : null}

      {/* Trigger Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        onPress={handleOpen}
        disabled={disabled}
        style={({ pressed }) => [
          styles.trigger,
          error ? styles.triggerError : null,
          disabled ? styles.triggerDisabled : null,
          pressed && styles.triggerPressed,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <Text
          style={[
            styles.triggerText,
            !displayLabel ? styles.placeholderText : null,
          ]}
          numberOfLines={1}
        >
          {displayLabel || placeholder}
        </Text>

        <View style={styles.rightIcon}>
          <Ionicons
            name="chevron-down"
            size={18}
            color={error ? colors.error : colors.textMuted}
          />
        </View>
      </Pressable>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Modern Bottom Sheet Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressable} onPress={handleClose} />

          <SafeAreaView style={styles.sheetContainer}>
            {/* Sheet Handle */}
            <View style={styles.handleWrap}>
              <View style={styles.sheetHandle} />
            </View>

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Pressable
                onPress={handleClose}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Search Box */}
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
                placeholder={customPlaceholder}
                placeholderTextColor={colors.textDisabled}
                style={styles.searchInput}
                autoCorrect={false}
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

            {/* Options List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                allowCustom && searchQuery.trim() && !hasExactMatch ? (
                  <Pressable
                    onPress={() => handleSelect(searchQuery.trim())}
                    style={({ pressed }) => [
                      styles.customOptionRow,
                      pressed && styles.optionRowPressed,
                    ]}
                  >
                    <View style={styles.customOptionIcon}>
                      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.optionTextWrap}>
                      <Text style={styles.customOptionTitle}>
                        Use &ldquo;{searchQuery.trim()}&rdquo;
                      </Text>
                      <Text style={styles.customOptionSub}>Select as custom entry</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                  </Pressable>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="search" size={32} color={colors.borderStrong} />
                  <Text style={styles.emptyTitle}>No exact match found</Text>
                  {allowCustom && searchQuery.trim() ? (
                    <Pressable
                      onPress={() => handleSelect(searchQuery.trim())}
                      style={styles.useCustomBtn}
                    >
                      <Text style={styles.useCustomBtnText}>
                        Use &ldquo;{searchQuery.trim()}&rdquo;
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => handleSelect(item.value)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                      pressed && styles.optionRowPressed,
                    ]}
                  >
                    {item.icon ? (
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={isSelected ? colors.primaryDark : colors.textMuted}
                        style={styles.itemIcon}
                      />
                    ) : null}

                    <View style={styles.optionTextWrap}>
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.description ? (
                        <Text style={styles.optionDescription}>{item.description}</Text>
                      ) : null}
                    </View>

                    {isSelected ? (
                      <View style={styles.checkIcon}>
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                      </View>
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
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  triggerError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  triggerDisabled: {
    backgroundColor: colors.surfaceMuted,
    opacity: 0.7,
  },
  triggerPressed: {
    borderColor: colors.primary,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  triggerText: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textDisabled,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
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
    maxHeight: '80%',
    minHeight: 380,
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
    paddingBottom: 14,
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
    marginBottom: 12,
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
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  optionRowSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionRowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  itemIcon: {
    marginRight: 12,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  optionDescription: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkIcon: {
    marginLeft: 10,
  },
  customOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLighter,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  customOptionIcon: {
    marginRight: 10,
  },
  customOptionTitle: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  customOptionSub: {
    ...typography.small,
    color: colors.primary,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  useCustomBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  useCustomBtnText: {
    ...typography.captionBold,
    color: colors.white,
  },
});
