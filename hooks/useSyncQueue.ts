import { useCallback, useEffect, useState } from 'react';
import { syncQueue } from '@services/sync/SyncQueue';
import type { SyncOperation } from '@services/sync/types';
import { useAuthStore } from '@store/useAuthStore';
import { useUser } from '@clerk/expo';
import { useDataStore } from '@store/useDataStore';

export interface SyncQueueResult {
  queue: SyncOperation[];
  pendingCount: number;
  isLoading: boolean;
  refreshQueue: () => Promise<void>;
  removeItem: (operationId: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  retryPending: () => Promise<void>;
}

/**
 * Reusable hook to observe and interact with the offline mutation sync queue.
 */
export function useSyncQueue(): SyncQueueResult {
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((state) => state.user);
  const ownerId = authUser?.id || clerkUser?.id || '';

  const [queue, setQueue] = useState<SyncOperation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const pendingCount = useDataStore((state) => state.pendingCount);
  const syncNow = useDataStore((state) => state.syncNow);

  const refreshQueue = useCallback(async () => {
    if (!ownerId) {
      setQueue([]);
      setIsLoading(false);
      return;
    }
    try {
      const items = await syncQueue.getQueue(ownerId);
      setQueue(items);
    } catch {
      setQueue([]);
    } finally {
      setIsLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue, pendingCount]);

  const removeItem = useCallback(
    async (operationId: string) => {
      if (!ownerId) return;
      await syncQueue.remove(ownerId, operationId);
      await refreshQueue();
    },
    [ownerId, refreshQueue],
  );

  const clearQueue = useCallback(async () => {
    if (!ownerId) return;
    await syncQueue.clear(ownerId);
    await refreshQueue();
  }, [ownerId, refreshQueue]);

  const retryPending = useCallback(async () => {
    if (!ownerId) return;
    await syncNow(ownerId, clerkUser);
    await refreshQueue();
  }, [ownerId, clerkUser, syncNow, refreshQueue]);

  return {
    queue,
    pendingCount,
    isLoading,
    refreshQueue,
    removeItem,
    clearQueue,
    retryPending,
  };
}
