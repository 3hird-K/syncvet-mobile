import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useUser } from '@clerk/expo';

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
  HomeAnnouncementsSection,
} from '@components/home';
import type { Pet } from '@services/data';

export default function HomeScreen() {
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const {
    pets: storePets,
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

        {/* 3. Live Community Announcements Feed from Supabase */}
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
