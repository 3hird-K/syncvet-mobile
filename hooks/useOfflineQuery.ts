import { useCallback, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkStatus } from './useNetworkStatus';

export interface UseOfflineQueryOptions<T> {
  queryKey: string;
  queryFn: () => Promise<T>;
  initialData?: T;
  staleTimeMs?: number;
  enabled?: boolean;
}

export interface UseOfflineQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  isCached: boolean;
  isOffline: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Standardized Stale-While-Revalidate query hook.
 * 1. Reads immediately from local AsyncStorage cache.
 * 2. Renders cached content instantly (no blocking spinner).
 * 3. Background fetches fresh remote data when online.
 * 4. Updates cache and re-renders with fresh data.
 */
export function useOfflineQuery<T>({
  queryKey,
  queryFn,
  initialData,
  staleTimeMs = 5 * 60 * 1000,
  enabled = true,
}: UseOfflineQueryOptions<T>): UseOfflineQueryResult<T> {
  const { isOnline } = useNetworkStatus();
  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = `syncvet.query_cache.${queryKey}`;
  const lastFetchTimeRef = useRef<number>(0);

  const loadFromCache = useCallback(async (): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data !== undefined) {
          setData(parsed.data);
          setIsCached(true);
          lastFetchTimeRef.current = parsed.timestamp || 0;
          return parsed.data;
        }
      }
    } catch (e) {
      console.log(`[useOfflineQuery] Cache read failed for ${queryKey}:`, e);
    }
    return null;
  }, [cacheKey, queryKey]);

  const saveToCache = useCallback(
    async (freshData: T) => {
      try {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: freshData,
            timestamp: Date.now(),
          }),
        );
        setIsCached(true);
      } catch (e) {
        console.log(`[useOfflineQuery] Cache write failed for ${queryKey}:`, e);
      }
    },
    [cacheKey, queryKey],
  );

  const fetchRemote = useCallback(async () => {
    if (!enabled) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const freshData = await queryFn();
      setData(freshData);
      lastFetchTimeRef.current = Date.now();
      await saveToCache(freshData);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [enabled, queryFn, saveToCache]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    async function execute() {
      // 1. Instant local cache load
      const cached = await loadFromCache();
      if (!isMounted) return;

      if (cached !== null) {
        setIsLoading(false);
      }

      // 2. Background revalidation if online
      if (isOnline) {
        const isStale = Date.now() - lastFetchTimeRef.current > staleTimeMs;
        if (isStale || cached === null) {
          await fetchRemote();
        }
      } else {
        setIsLoading(false);
      }
    }

    execute();

    return () => {
      isMounted = false;
    };
  }, [enabled, isOnline, loadFromCache, fetchRemote, staleTimeMs]);

  const refetch = useCallback(async () => {
    if (isOnline) {
      await fetchRemote();
    } else {
      await loadFromCache();
    }
  }, [isOnline, fetchRemote, loadFromCache]);

  return {
    data,
    isLoading,
    isRefreshing,
    isCached,
    isOffline: !isOnline,
    error,
    refetch,
  };
}
