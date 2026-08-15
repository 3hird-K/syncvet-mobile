import { useCallback, useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

export interface UseOfflineMutationOptions<TVariables, TData = void> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onOptimisticUpdate?: (variables: TVariables) => void;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: () => void;
}

export interface UseOfflineMutationResult<TVariables, TData = void> {
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  isLoading: boolean;
  isPendingSync: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Standardized hook for optimistic offline mutations with automatic background queueing.
 */
export function useOfflineMutation<TVariables, TData = void>({
  mutationFn,
  onOptimisticUpdate,
  onSuccess,
  onError,
  onSettled,
}: UseOfflineMutationOptions<TVariables, TData>): UseOfflineMutationResult<TVariables, TData> {
  const { isOnline } = useNetworkStatus();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPendingSync, setIsPendingSync] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      setIsLoading(true);
      setError(null);

      // 1. Trigger immediate local optimistic update
      if (onOptimisticUpdate) {
        try {
          onOptimisticUpdate(variables);
        } catch (e) {
          console.log('[useOfflineMutation] Optimistic update failed:', e);
        }
      }

      if (!isOnline) {
        setIsPendingSync(true);
      }

      try {
        const result = await mutationFn(variables);
        if (onSuccess) {
          onSuccess(result, variables);
        }
        return result;
      } catch (err: any) {
        const mutationError = err instanceof Error ? err : new Error(String(err));
        setError(mutationError);
        if (onError) {
          onError(mutationError, variables);
        }
        return undefined;
      } finally {
        setIsLoading(false);
        if (onSettled) {
          onSettled();
        }
      }
    },
    [isOnline, mutationFn, onOptimisticUpdate, onSuccess, onError, onSettled],
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsPendingSync(false);
    setError(null);
  }, []);

  return {
    mutate,
    isLoading,
    isPendingSync,
    error,
    reset,
  };
}
