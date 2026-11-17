import { QueryClient, onlineManager } from '@tanstack/react-query';
import { networkService } from '@services/network';

// Connect TanStack Query online manager to SyncVet networkService
onlineManager.setEventListener((setOnline) => {
  return networkService.subscribe((state) => {
    // `syncing` is still an online state; pausing queries while syncing would
    // stall the app with cached data that never refreshes.
    setOnline(
      state.status !== 'offline' && state.isConnected && state.isInternetReachable,
    );
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const queryKeys = {
  pets: (ownerId: string) => ['pets', ownerId] as const,
  petDetail: (ownerId: string, petId: string) => ['pets', ownerId, petId] as const,
  appointments: (ownerId: string) => ['appointments', ownerId] as const,
  transactions: (ownerId: string) => ['transactions', ownerId] as const,
  activities: (ownerId: string) => ['transactions', ownerId] as const,
  unreadMessagesCount: (ownerId: string) => ['unreadMessagesCount', ownerId] as const,
} as const;
