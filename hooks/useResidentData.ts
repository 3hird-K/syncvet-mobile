import { useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/expo';

import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useSupabaseRealtime } from './useSupabaseRealtime';
import {
  usePetsQuery,
  useAppointmentsQuery,
  useTransactionsQuery,
} from './queries';

/**
 * Loads the signed-in resident's pets, appointments, and official service transactions feed.
 * Fully powered by TanStack Query for caching/background refetching,
 * combined with Supabase Realtime WebSockets for live zero-latency synchronization.
 */
export function useResidentData() {
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((state) => state.user);
  const ownerId = clerkUser?.id || authUser?.id || '';

  // 1. Establish live Supabase Realtime WebSockets for CDC (pets, appointments, transactions)
  useSupabaseRealtime(ownerId);

  // 2. TanStack Queries for server state & caching
  const petsQuery = usePetsQuery(ownerId);
  const appointmentsQuery = useAppointmentsQuery(ownerId);
  const transactionsQuery = useTransactionsQuery(ownerId);

  // 3. Zustand local-first store & offline queue
  const loadAll = useDataStore((state) => state.loadAll);
  const storePets = useDataStore((state) => state.pets);
  const storeAppointments = useDataStore((state) => state.appointments);
  const storeTransactions = useDataStore((state) => (state as any).transactions || state.activity || []);
  const loading = useDataStore((state) => state.loading);
  const loaded = useDataStore((state) => state.loaded);
  const isSyncing = useDataStore((state) => state.isSyncing);
  const pendingCount = useDataStore((state) => state.pendingCount);
  const lastSyncedAt = useDataStore((state) => state.lastSyncedAt);
  const error = useDataStore((state) => state.error);
  const syncNowAction = useDataStore((state) => state.syncNow);

  // Initial load from local persistence
  useEffect(() => {
    if (ownerId) {
      loadAll(ownerId, clerkUser).catch(() => {});
    }
  }, [ownerId, clerkUser, loadAll]);

  // Sync TanStack queries data into Zustand cache when fetched fresh from Supabase
  useEffect(() => {
    if (petsQuery.data && petsQuery.data.length > 0) {
      useDataStore.setState({ pets: petsQuery.data });
    }
  }, [petsQuery.data]);

  useEffect(() => {
    if (appointmentsQuery.data && appointmentsQuery.data.length > 0) {
      useDataStore.setState({ appointments: appointmentsQuery.data });
    }
  }, [appointmentsQuery.data]);

  useEffect(() => {
    if (transactionsQuery.data && transactionsQuery.data.length > 0) {
      useDataStore.setState({
        transactions: transactionsQuery.data,
        activity: transactionsQuery.data,
      } as any);
    }
  }, [transactionsQuery.data]);

  const syncNow = useCallback(async () => {
    if (ownerId) {
      await syncNowAction(ownerId, clerkUser);
      await Promise.all([
        petsQuery.refetch(),
        appointmentsQuery.refetch(),
        transactionsQuery.refetch(),
      ]);
    }
  }, [ownerId, clerkUser, syncNowAction, petsQuery, appointmentsQuery, transactionsQuery]);

  const refetch = useCallback(async () => {
    await Promise.all([
      petsQuery.refetch(),
      appointmentsQuery.refetch(),
      transactionsQuery.refetch(),
    ]);
  }, [petsQuery, appointmentsQuery, transactionsQuery]);

  // Seamlessly merge TanStack query server data with Zustand offline/optimistic cache
  const activePets = useMemo(() => {
    const server = petsQuery.data;
    const local = storePets || [];
    if (!server || server.length === 0) return local;
    if (local.length === 0) return server;

    const serverIds = new Set(server.map((p) => p.id));
    const merged = [...server];
    for (const item of local) {
      if (!serverIds.has(item.id)) {
        merged.unshift(item);
      }
    }
    return merged;
  }, [petsQuery.data, storePets]);

  const activeAppointments = useMemo(() => {
    const server = appointmentsQuery.data;
    const local = storeAppointments || [];
    if (!server || server.length === 0) return local;
    if (local.length === 0) return server;

    const serverIds = new Set(server.map((a) => a.id));
    const merged = [...server];
    for (const item of local) {
      if (!serverIds.has(item.id)) {
        merged.unshift(item);
      }
    }
    return merged;
  }, [appointmentsQuery.data, storeAppointments]);

  const activeTransactions = useMemo(() => {
    const server = transactionsQuery.data;
    const local = storeTransactions || [];
    if (!server || server.length === 0) return local;
    if (local.length === 0) return server;

    const serverIds = new Set(server.map((t) => t.id));
    const merged = [...server];
    for (const item of local) {
      if (!serverIds.has(item.id)) {
        merged.unshift(item);
      }
    }
    return merged;
  }, [transactionsQuery.data, storeTransactions]);

  return {
    ownerId,
    pets: activePets,
    appointments: activeAppointments,
    transactions: activeTransactions,
    activity: activeTransactions, // backward compatibility
    loading: (loading && petsQuery.isLoading) || appointmentsQuery.isLoading,
    loaded: loaded || petsQuery.isSuccess,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    error: error || (petsQuery.error ? (petsQuery.error as Error).message : null),
    syncNow,
    refetch,
    petsQuery,
    appointmentsQuery,
    transactionsQuery,
    activityQuery: transactionsQuery, // backward compatibility
  };
}

