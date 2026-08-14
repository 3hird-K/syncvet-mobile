import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { Button } from './Button';

interface PetDeleteConfirmModalProps {
  visible: boolean;
  petName: string;
  species?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function PetDeleteConfirmModal({
  visible,
  petName,
  species = 'dog',
  onConfirm,
  onCancel,
  loading = false,
}: PetDeleteConfirmModalProps) {
  const { width } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onCancel} />

        <Animated.View
          entering={ZoomIn.duration(220)}
          style={[
            styles.dialogCard,
            { width: Math.min(width - 40, 380) },
            shadows.lg,
          ]}
        >
          {/* Decorative Paw Header */}
          <View style={styles.pawHeroWrap}>
            {/* Ambient background paw prints */}
            <View style={[styles.miniPaw, styles.miniPawLeft]}>
              <Ionicons name="paw" size={18} color="rgba(239, 68, 68, 0.20)" />
            </View>
            <View style={[styles.miniPaw, styles.miniPawRight]}>
              <Ionicons name="paw" size={16} color="rgba(239, 68, 68, 0.20)" />
            </View>

            {/* Central Glow Badge with Paw Icon */}
            <View style={[styles.centralPawBadge, shadows.md]}>
              <View style={styles.centralPawInner}>
                <Ionicons name="paw" size={32} color={colors.error} />
              </View>
            </View>
          </View>

          {/* Dialog Text */}
          <View style={styles.textWrap}>
            <Text style={styles.title}>Remove {petName}?</Text>
            <Text style={styles.description}>
              This will remove {petName}’s digital health passport, anti-rabies records, and appointment history from your SyncVet app.
            </Text>
          </View>

          {/* Official City Vet Note Box */}
          <View style={styles.noteBox}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.noteText}>
              Official City Veterinary Office records stay registered in the city registry.
            </Text>
          </View>

          {/* Dialog Actions */}
          <View style={styles.actionsColumn}>
            <Button
              title={`Remove ${petName}`}
              variant="danger"
              onPress={() => {
                haptic.error();
                onConfirm();
              }}
              loading={loading}
              fullWidth
              leftIcon={<Ionicons name="trash-outline" size={16} color={colors.white} />}
            />

            <Button
              title={`Keep ${petName}`}
              variant="outline"
              onPress={() => {
                haptic.light();
                onCancel();
              }}
              disabled={loading}
              fullWidth
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 38, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  dialogCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    zIndex: 10,
  },
  pawHeroWrap: {
    position: 'relative',
    width: 110,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  miniPaw: {
    position: 'absolute',
  },
  miniPawLeft: {
    top: 6,
    left: 4,
    transform: [{ rotate: '-25deg' }],
  },
  miniPawRight: {
    top: 10,
    right: 6,
    transform: [{ rotate: '25deg' }],
  },
  centralPawBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralPawInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    marginBottom: 20,
    width: '100%',
  },
  noteText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 15,
    flex: 1,
  },
  actionsColumn: {
    width: '100%',
    gap: 10,
  },
});
