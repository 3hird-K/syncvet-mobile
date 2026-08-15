import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/expo';

import { todayISO } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { HomeScreenSkeleton } from '@components/ui/Skeleton';
import {
  HomeHeader,
  HomePetsSection,
  HomeNextUpSection,
  HomeQuickActions,
  HomeServicesSection,
  HomeHealthInsight,
  HomeClinicStrip,
} from '@components/home';
import type { Pet } from '@services/data';

export default function HomeScreen() {
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const { loading, loaded } = useResidentData();

  const displayName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    user?.fullName ||
    'Resident';
  const displayPhoto = clerkUser?.imageUrl || user?.photoUrl;

  // Real data exclusively from Clerk user metadata
  const allPets: Pet[] = useMemo(() => {
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];

    return metaPets.map((p, idx) => ({
      id: p.id || `clerk-pet-${idx}`,
      ownerId: user?.id || clerkUser?.id || '',
      name: p.name || 'My Pet',
      species: p.species || 'dog',
      breed: p.breed || '',
      gender: p.gender || 'male',
      birthYear: p.birthYear,
      isVaccinated: Boolean(p.isVaccinated),
      isSpayedNeutered: Boolean(p.isSpayedNeutered),
      weightCategory: p.weightCategory || 'medium',
      notes: p.notes,
      avatarId: p.avatarId,
      photoUrl: p.photoUrl,
      createdAt: p.createdAt || new Date().toISOString(),
    }));
  }, [clerkUser?.unsafeMetadata, user?.id, clerkUser?.id]);

  const upcomingAppointments = useMemo(() => {
    const today = todayISO();
    const validPetIds = new Set(allPets.map((p) => p.id));
    const validPetNames = new Set(allPets.map((p) => p.name?.toLowerCase().trim()));

    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaAppts = Array.isArray(metadata.appointments) ? metadata.appointments : [];

    return metaAppts
      .filter((a) => {
        if (!a) return false;
        const matchesId = a.petId ? validPetIds.has(a.petId) : false;
        const matchesName = a.petName ? validPetNames.has(a.petName.toLowerCase().trim()) : false;
        return (
          (matchesId || matchesName) &&
          (a.status === 'pending' || a.status === 'confirmed') &&
          a.date >= today
        );
      })
      .sort((a, b) => (a.date === b.date ? a.timeSlot.localeCompare(b.timeSlot) : a.date.localeCompare(b.date)));
  }, [allPets, clerkUser?.unsafeMetadata]);

  const nextAppointment = upcomingAppointments[0];

  const handleRefresh = useCallback(async () => {
    haptic.light();
    try {
      await clerkUser?.reload();
      if (user?.id) {
        await useDataStore.getState().loadAll(user.id);
      }
    } catch (e) {
      console.log('Refresh error:', e);
    }
  }, [clerkUser, user?.id]);

  if (loading && !loaded && allPets.length === 0) {
    return (
      <AnimatedScreen animation="zoom">
        <HomeScreenSkeleton />
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen animation="zoom">
      <Screen scroll onRefresh={handleRefresh}>
        {/* 1. Senior Executive Municipal Top Header */}
        <HomeHeader
          displayName={displayName}
          displayPhoto={displayPhoto}
          petsCount={allPets.length}
          hasUpcomingAppointments={upcomingAppointments.length > 0}
        />

        {/* 2. Pet Overview & Passport Carousel */}
        <HomePetsSection pets={allPets} />

        {/* 3. Next Up (Upcoming Visit / Smart Preventive Care) */}
        <HomeNextUpSection
          nextAppointment={nextAppointment}
          totalAppointmentsCount={upcomingAppointments.length}
        />

        {/* 4. High-Frequency Fast Quick Actions Hub */}
        <HomeQuickActions />

        {/* 5. City Veterinary Services Directory Preview */}
        <HomeServicesSection />

        {/* 6. Trustworthy Curated Veterinary Care Insight */}
        <HomeHealthInsight />

        {/* 7. City Veterinary Office Operating Schedule & Direct Helpline */}
        <HomeClinicStrip />

        {/* Floating bottom tab bar safe clearance */}
        <View style={styles.footerSpacing} />
      </Screen>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  footerSpacing: {
    height: 110,
  },
});
