import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { PetsScreenSkeleton } from '@components/ui/Skeleton';
import { PetPassportView, RegisterPetModal } from '@components/pets';
import type { Pet, Species } from '@services/data';

export default function PetsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: paramId } = useLocalSearchParams<{ id?: string }>();
  const { pets: storePets, loading, loaded } = useResidentData();

  const allPets: Pet[] = storePets || [];
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [registerSpecies, setRegisterSpecies] = useState<Species>('dog');

  React.useEffect(() => {
    if (paramId) {
      setSelectedPetId(paramId);
    }
  }, [paramId]);

  // Default view is the first registered pet!
  const activePet = useMemo(() => {
    if (allPets.length === 0) return null;
    if (selectedPetId) {
      const found = allPets.find((p) => p.id === selectedPetId);
      if (found) return found;
    }
    return allPets[0];
  }, [allPets, selectedPetId]);

  const handleOpenRegister = (species: Species) => {
    haptic.light();
    setRegisterSpecies(species);
    setRegisterModalVisible(true);
  };

  if (loading && !loaded && allPets.length === 0) {
    return (
      <AnimatedScreen animation="zoom">
        <PetsScreenSkeleton />
      </AnimatedScreen>
    );
  }

  // 1. If user has registered pets, display the first pet as default in PetPassportView!
  if (activePet) {
    return (
      <AnimatedScreen animation="zoom">
        <View style={styles.screen}>
          <PetPassportView
            pet={activePet}
            onClose={() => router.replace('/' as never)}
            isCard={false}
            onSelectPet={(targetPet) => setSelectedPetId(targetPet.id)}
          />
        </View>

        <RegisterPetModal
          visible={registerModalVisible}
          onClose={() => setRegisterModalVisible(false)}
          initialSpecies={registerSpecies}
        />
      </AnimatedScreen>
    );
  }

  // 2. If user doesn't have any pets yet, display an inviting Add Pet view!
  return (
    <AnimatedScreen animation="zoom">
      <View
        style={[
          styles.emptyPageContainer,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: Math.max(insets.bottom, 20) + 90,
          },
        ]}
      >
        <View style={styles.emptyCard}>
          {/* Dual Pet Avatars Hero */}
          <View style={styles.avatarsRow}>
            <View style={styles.avatarBubble}>
              <Image
                source={require('@assets/cat-profiles/image-removebg-preview (2).png')}
                style={styles.heroPetImg}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.avatarBubble, styles.avatarBubbleOverlap]}>
              <Image
                source={require('@assets/dog-profiles/image-removebg-preview (5).png')}
                style={styles.heroPetImg}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Badge */}
          <View style={styles.emptyBadge}>
            <Ionicons name="paw" size={14} color="#0D9488" />
            <Text style={styles.emptyBadgeText}>Official Companion Registry</Text>
          </View>

          {/* Title & Desc */}
          <Text style={styles.emptyTitle}>No Pets Registered Yet</Text>
          <Text style={styles.emptyDesc}>
            Register your dog or cat with the City Veterinary Office to generate an official Digital Pet Passport, track anti-rabies immunizations, and schedule free municipal clinical care.
          </Text>

          {/* Two Big Add Buttons */}
          <View style={styles.btnRow}>
            <Pressable
              onPress={() => handleOpenRegister('dog')}
              style={[styles.primaryAddBtn, { backgroundColor: '#0D9488' }]}
              accessibilityRole="button"
              accessibilityLabel="Register a Dog"
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.primaryAddBtnText}>Register Dog</Text>
            </Pressable>

            <Pressable
              onPress={() => handleOpenRegister('cat')}
              style={[styles.primaryAddBtn, { backgroundColor: '#7C3AED' }]}
              accessibilityRole="button"
              accessibilityLabel="Register a Cat"
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.primaryAddBtnText}>Register Cat</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <RegisterPetModal
        visible={registerModalVisible}
        onClose={() => setRegisterModalVisible(false)}
        initialSpecies={registerSpecies}
      />
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  emptyPageContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.sm,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarBubble: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#F0FDFA',
    borderWidth: 2,
    borderColor: '#0D9488',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBubbleOverlap: {
    marginLeft: -16,
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  heroPetImg: {
    width: '85%',
    height: '85%',
  },
  emptyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  emptyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyDesc: {
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  primaryAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
