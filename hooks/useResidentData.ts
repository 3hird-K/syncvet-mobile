import { useEffect } from 'react';

import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';

/**
 * Loads the signed-in resident's pets, appointments and activity once.
 * Returns the owner id and loading/error state for screens to render.
 */
export function useResidentData() {
  const ownerId = useAuthStore((state) => state.user?.id);
  const loadAll = useDataStore((state) => state.loadAll);
  const loading = useDataStore((state) => state.loading);
  const loaded = useDataStore((state) => state.loaded);
  const error = useDataStore((state) => state.error);

  useEffect(() => {
    if (ownerId) {
      loadAll(ownerId).catch(() => {});
    }
  }, [ownerId, loadAll]);

  return { ownerId: ownerId ?? '', loading, loaded, error };
}
