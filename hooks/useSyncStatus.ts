import { useCallback } from 'react';
import { useUser } from '@clerk/expo';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useNetworkStatus } from './useNetworkStatus';

export interface SyncStatusResult {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null | undefined;
  error: string | null | undefined;
  isOnline: boolean;
  syncNow: () => Promise<void>;
}

/**
 * Reusable hook providing live sync state and manual sync triggers.
 */
export function useSyncStatus(): SyncStatusResult {
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((state) => state.user);
  const ownerId = authUser?.id || clerkUser?.id || '';

  const isSyncing = useDataStore((state) => state.isSyncing);
  const pendingCount = useDataStore((state) => state.pendingCount);
  const lastSyncedAt = useDataStore((state) => state.lastSyncedAt);
  const error = useDataStore((state) => state.error);
  const syncNowAction = useDataStore((state) => state.syncNow);
  const { isOnline } = useNetworkStatus();

  const syncNow = useCallback(async () => {
    if (ownerId) {
      await syncNowAction(ownerId, clerkUser);
    }
  }, [ownerId, clerkUser, syncNowAction]);

  return {
    isSyncing,
    pendingCount,
    lastSyncedAt,
    error,
    isOnline,
    syncNow,
  };
}
