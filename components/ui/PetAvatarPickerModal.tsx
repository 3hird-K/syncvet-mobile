import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import {
  CAT_AVATARS,
  DOG_AVATARS,
  type PetAvatarOption,
} from '@lib/petAvatars';
import { Button } from './Button';
import { PopoutPetAvatar } from './PopoutPetAvatar';

interface PetAvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAvatar: (avatarId: string, customPhotoUri?: string) => void;
  currentAvatarId?: string;
  species?: 'dog' | 'cat' | string;
  petName?: string;
}

export function PetAvatarPickerModal({
  visible,
  onClose,
  onSelectAvatar,
  currentAvatarId,
  species = 'dog',
  petName = 'Pet',
}: PetAvatarPickerModalProps) {
  const normalizedSpecies = species?.toLowerCase() === 'cat' ? 'cat' : 'dog';
  const [activeTab, setActiveTab] = useState<'dog' | 'cat'>(normalizedSpecies);
  const [selectedId, setSelectedId] = useState<string | undefined>(currentAvatarId);

  // Sync activeTab whenever modal opens or species changes
  React.useEffect(() => {
    if (visible) {
      setActiveTab(normalizedSpecies);
      setSelectedId(currentAvatarId);
    }
  }, [visible, normalizedSpecies, currentAvatarId]);

  const isDogDisabled = normalizedSpecies === 'cat';
  const isCatDisabled = normalizedSpecies === 'dog';

  const avatarsToDisplay: PetAvatarOption[] = activeTab === 'dog' ? DOG_AVATARS : CAT_AVATARS;

  const handleSelectPreset = (item: PetAvatarOption) => {
    haptic.light();
    setSelectedId(item.id);
    onSelectAvatar(item.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.container}>
          <View style={[styles.card, shadows.lg]}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Choose {petName}'s Profile</Text>
                <Text style={styles.subtitle}>Select an official SyncVet pet avatar</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Species Selector Tabs */}
            <View style={styles.tabsRow}>
              <Pressable
                onPress={() => {
                  if (isDogDisabled) return;
                  haptic.light();
                  setActiveTab('dog');
                }}
                disabled={isDogDisabled}
                style={[
                  styles.tabBtn,
                  activeTab === 'dog' && styles.tabBtnActive,
                  isDogDisabled && styles.tabBtnDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'dog' && styles.tabBtnTextActive,
                    isDogDisabled && styles.tabBtnTextDisabled,
                  ]}
                >
                  Dog Avatars ({DOG_AVATARS.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (isCatDisabled) return;
                  haptic.light();
                  setActiveTab('cat');
                }}
                disabled={isCatDisabled}
                style={[
                  styles.tabBtn,
                  activeTab === 'cat' && styles.tabBtnActive,
                  isCatDisabled && styles.tabBtnDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'cat' && styles.tabBtnTextActive,
                    isCatDisabled && styles.tabBtnTextDisabled,
                  ]}
                >
                  Cat Avatars ({CAT_AVATARS.length})
                </Text>
              </Pressable>
            </View>

            {/* Avatar Grid */}
            <ScrollView
              style={styles.gridScroll}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.grid}>
                {avatarsToDisplay.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleSelectPreset(item)}
                      style={[
                        styles.avatarItem,
                        isSelected && styles.avatarItemSelected,
                      ]}
                    >
                      <View style={styles.avatarImgWrap}>
                        <PopoutPetAvatar
                          avatarId={item.id}
                          species={item.species}
                          size={56}
                          borderColor={isSelected ? colors.primary : 'rgba(7, 30, 38, 0.10)'}
                          bgColor={isSelected ? '#E8F5F2' : colors.surface}
                        />
                        {isSelected ? (
                          <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={11} color={colors.white} />
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.avatarLabel,
                          isSelected && styles.avatarLabelSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Close / Done */}
            <View style={styles.bottomBar}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={onClose}
                fullWidth
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 38, 0.60)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(7, 30, 38, 0.05)',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.sm,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: radius.pill,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabBtnDisabled: {
    opacity: 0.35,
  },
  tabBtnText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  tabBtnTextActive: {
    color: colors.primary,
  },
  tabBtnTextDisabled: {
    color: colors.textMuted,
  },
  gridScroll: {
    maxHeight: 360,
  },
  gridContent: {
    paddingBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  avatarItem: {
    width: '30.5%',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    borderRadius: radius.xl,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  avatarItemSelected: {
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    borderColor: colors.primary,
  },
  avatarImgWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    zIndex: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  avatarLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10.5,
    textAlign: 'center',
  },
  avatarLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  bottomBar: {
    marginTop: spacing.sm,
  },
});
