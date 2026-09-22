import { useQuery } from '@tanstack/react-query';
import { getDataService } from '@services/data';
import { queryKeys } from '@lib/queryClient';
import type { ServiceTransaction } from '@services/data/types';

/**
 * TanStack Query hook to fetch the resident's official service transactions.
 */
export function useTransactionsQuery(ownerId: string) {
  return useQuery<ServiceTransaction[]>({
    queryKey: queryKeys.transactions(ownerId),
    queryFn: async () => {
      if (!ownerId) return [];
      const service = getDataService();
      return await service.getTransactions(ownerId);
    },
    enabled: Boolean(ownerId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
