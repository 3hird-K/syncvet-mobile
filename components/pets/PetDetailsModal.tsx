import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { shadows } from '@theme';
import { PetPassportView } from './PetPassportView';
import type { Pet } from '@services/data';

interface PetDetailsModalProps {
  pet: Pet | null;
  visible: boolean;
  onClose: () => void;
  onSelectPet?: (pet: Pet) => void;
}

export function PetDetailsModal({ pet, visible, onClose, onSelectPet }: PetDetailsModalProps) {
  if (!pet || !visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.cardContainer}>
          <PetPassportView
            pet={pet}
            onClose={onClose}
            isCard={true}
            onSelectPet={onSelectPet}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    borderRadius: 20,
    overflow: 'hidden',
    ...shadows.lg,
  },
});
