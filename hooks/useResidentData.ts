import { useEffect, useCallback } from 'react';
import { useUser } from '@clerk/expo';

import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';

/**
 * Loads the signed-in resident's pets, appointments, and activity from the local persistent cache.
 * Automatically initiates background synchronization with remote Clerk metadata if online.
 */
export function useResidentData() {
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((state) => state.user);
  const ownerId = authUser?.id || clerkUser?.id || '';

  const loadAll = useDataStore((state) => state.loadAll);
  const pets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);
  const activity = useDataStore((state) => state.activity);
  const loading = useDataStore((state) => state.loading);
  const loaded = useDataStore((state) => state.loaded);
  const isSyncing = useDataStore((state) => state.isSyncing);
  const pendingCount = useDataStore((state) => state.pendingCount);
  const lastSyncedAt = useDataStore((state) => state.lastSyncedAt);
  const error = useDataStore((state) => state.error);
  const syncNowAction = useDataStore((state) => state.syncNow);

  useEffect(() => {
    if (ownerId) {
      loadAll(ownerId, clerkUser).catch(() => {});
    }
  }, [ownerId, clerkUser, loadAll]);

  const syncNow = useCallback(async () => {
    if (ownerId) {
      await syncNowAction(ownerId, clerkUser);
    }
  }, [ownerId, clerkUser, syncNowAction]);

  return {
    ownerId,
    pets,
    appointments,
    activity,
    loading,
    loaded,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    error,
    syncNow,
  };
}
