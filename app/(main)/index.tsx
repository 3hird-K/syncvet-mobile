import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/expo';

import { todayISO } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useNotificationStore } from '@store/useNotificationStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { HomeScreenSkeleton } from '@components/ui/Skeleton';
import { PetQrScannerModal } from '@components/ui/PetQrScannerModal';
import {
  HomeHeader,
  HomePetsSection,
  HomeNextUpSection,
  HomeQuickActions,
  HomeServicesSection,
  HomeHealthInsight,
  HomeClinicStrip,
} from '@components/home';
import { colors, radius, spacing } from '@theme';
import type { Pet } from '@services/data';

export default function HomeScreen() {
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const {
    pets: storePets,
    appointments: storeAppointments,
    transactions,
    loading,
    loaded,
    syncNow,
  } = useResidentData();

  const ownerId = clerkUser?.id || user?.id || '';
  const [scannerVisible, setScannerVisible] = React.useState(false);
  const loadReadIds = useNotificationStore((state) => state.loadReadIds);
  const getUnreadCount = useNotificationStore((state) => state.getUnreadCount);
  const readIds = useNotificationStore((state) => state.readIds);

  useEffect(() => {
    if (ownerId) {
      loadReadIds(ownerId);
    }
  }, [ownerId, loadReadIds]);

  const unreadNotificationCount = useMemo(() => {
    return getUnreadCount(transactions || []);
  }, [getUnreadCount, transactions, readIds]);

  const displayName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    user?.fullName ||
    'Resident';
  const displayPhoto = clerkUser?.imageUrl || user?.photoUrl;

  // Pure Supabase source of truth
  const allPets: Pet[] = storePets || [];

  const upcomingAppointments = useMemo(() => {
    const today = todayISO();
    const validPetIds = new Set(allPets.map((p) => p.id));
    const validPetNames = new Set(allPets.map((p) => p.name?.toLowerCase().trim()));

    return (storeAppointments || [])
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
  }, [allPets, storeAppointments]);

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
        {/* 1. Senior Executive Municipal Top Header with Scan Button */}
        <HomeHeader
          displayName={displayName}
          displayPhoto={displayPhoto}
          petsCount={allPets.length}
          hasUpcomingAppointments={upcomingAppointments.length > 0}
          notificationCount={unreadNotificationCount}
          onScanPress={() => setScannerVisible(true)}
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

      {/* Pet Tag Scanner Camera Modal */}
      <PetQrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
      />
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({});
