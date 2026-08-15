import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/expo';

import { todayISO } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
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
  const { pets: storePets, appointments: storeAppointments, loading, loaded, syncNow } = useResidentData();

  const displayName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    user?.fullName ||
    'Resident';
  const displayPhoto = clerkUser?.imageUrl || user?.photoUrl;

  // Local-first source of truth with offline pending creation support
  const allPets: Pet[] = useMemo(() => {
    if (storePets && storePets.length > 0) {
      return storePets;
    }
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];

    return metaPets.map((p, idx) => ({
      id: p.id || `clerk-pet-${idx}`,
      ownerId: clerkUser?.id || '',
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
  }, [storePets, clerkUser?.unsafeMetadata, clerkUser?.id]);

  const upcomingAppointments = useMemo(() => {
    const today = todayISO();
    const validPetIds = new Set(allPets.map((p) => p.id));
    const validPetNames = new Set(allPets.map((p) => p.name?.toLowerCase().trim()));

    const apptPool = storeAppointments && storeAppointments.length > 0
      ? storeAppointments
      : ((clerkUser?.unsafeMetadata?.appointments || []) as any[]);

    return (apptPool as any[])
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
  }, [allPets, storeAppointments, clerkUser?.unsafeMetadata]);

  const nextAppointment = upcomingAppointments[0];

  const handleRefresh = useCallback(async () => {
    haptic.light();
    try {
      await syncNow();
    } catch (e) {
      console.log('Refresh error:', e);
    }
  }, [syncNow]);

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
      </Screen>
    </AnimatedScreen>
  );
}
