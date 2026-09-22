import { useQuery } from '@tanstack/react-query';
import { getDataService } from '@services/data';
import { queryKeys } from '@lib/queryClient';

/**
 * TanStack Query hook to fetch the resident's activity timeline.
 */
export function useActivityQuery(ownerId: string) {
  return useQuery({
    queryKey: queryKeys.activities(ownerId),
    queryFn: async () => {
      if (!ownerId) return [];
      const service = getDataService();
      return await service.getActivity(ownerId);
    },
    enabled: Boolean(ownerId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
