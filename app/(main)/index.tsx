import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useUser } from '@clerk/expo';

import { todayISO } from '@lib/format';
import { normalizeAppointmentStatus } from '@services/data/types';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useNotificationStore } from '@store/useNotificationStore';
import { useResidentData } from '@hooks/useResidentData';
import { useUnreadMessagesQuery } from '@hooks/queries';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { HomeScreenSkeleton } from '@components/ui/Skeleton';
import {
  HomeHeader,
  HomePetsSection,
  HomeNextUpSection,
  HomeAnnouncementsSection,
} from '@components/home';
import type { Pet } from '@services/data';

function timeSlotMinutes(timeSlot: string): number {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((timeSlot || '').trim());
  if (!match) return Number.MAX_SAFE_INTEGER;
  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + Number(match[2]);
}

export default function HomeScreen() {
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const {
    pets: storePets,
    appointments: storeAppointments,
    loading,
    loaded,
    syncNow,
  } = useResidentData();

  const ownerId = clerkUser?.id || user?.id || '';
  const { data: unreadMessageCount = 0 } = useUnreadMessagesQuery(ownerId);
  const loadReadIds = useNotificationStore((state) => state.loadReadIds);

  useEffect(() => {
    if (ownerId) {
      loadReadIds(ownerId);
    }
  }, [ownerId, loadReadIds]);

  const displayName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    user?.fullName ||
    'Resident';
  const displayPhoto = clerkUser?.imageUrl || user?.photoUrl;

  // Pure Supabase source of truth
  const allPets: Pet[] = storePets || [];

  // Live Realtime updates flow through useResidentData(); derive the nearest
  // active appointment from that same source so Home never shows stale data.
  const upcomingAppointments = useMemo(() => {
    const today = todayISO();
    return (storeAppointments || [])
      .map((appointment) => ({
        ...appointment,
        status: normalizeAppointmentStatus(appointment.status),
      }))
      .filter((appointment) => {
        if (
          appointment.status === 'completed' ||
          appointment.status === 'cancelled' ||
          appointment.status === 'missed' ||
          appointment.status === 'overdue'
        ) {
          return false;
        }
        return appointment.date >= today;
      })
      .sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        return dateCmp !== 0 ? dateCmp : timeSlotMinutes(a.timeSlot) - timeSlotMinutes(b.timeSlot);
      });
  }, [storeAppointments]);

  const nextAppointment = upcomingAppointments[0] || null;

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
      <Screen
        scroll
        padded={false}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.screenContent}
      >
        {/* 1. Senior Executive Municipal Top Header */}
        <HomeHeader
          displayName={displayName}
          displayPhoto={displayPhoto}
          petsCount={allPets.length}
          unreadMessageCount={unreadMessageCount}
        />

        {/* 2. Official CVO Pet Registry Section (Facebook Stories style) */}
        <HomePetsSection pets={allPets} userPhotoUrl={displayPhoto} />

        {/* 3. Live Appointment Updates — hidden when nothing is active/upcoming */}
        {upcomingAppointments.length > 0 ? (
          <HomeNextUpSection
            nextAppointment={nextAppointment}
            totalAppointmentsCount={upcomingAppointments.length}
          />
        ) : null}

        {/* 4. Live Community Announcements Feed from Supabase */}
        <HomeAnnouncementsSection />
      </Screen>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
});
