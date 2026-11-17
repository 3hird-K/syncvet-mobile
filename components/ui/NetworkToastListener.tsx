import React, { useEffect, useRef } from 'react';
import { networkService } from '@services/network';
import { toast } from './Sonner';

/**
 * Global component that monitors network connectivity transitions and
 * displays subtle Sonner toast notifications when entering or leaving offline mode.
 */
export function NetworkToastListener() {
  const isFirstMount = useRef(true);
  const wasOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = networkService.subscribe((state) => {
      const isOnline = state.isConnected && state.isInternetReachable;

      if (isFirstMount.current) {
        isFirstMount.current = false;
        wasOnlineRef.current = isOnline;
        // Cold-start offline is a normal state here: cached screens render
        // normally and only actions that need connectivity explain the limit.
        return;
      }

      // Transition: Online -> Offline
      if (wasOnlineRef.current === true && !isOnline) {
        wasOnlineRef.current = false;
        toast.info('Offline mode', {
          id: 'network-connectivity',
          description: 'Changes are saved locally and synced when you reconnect.',
          duration: 3500,
        });
      }
      // Transition: Offline -> Online
      else if (wasOnlineRef.current === false && isOnline) {
        wasOnlineRef.current = true;
        toast.success('Back online', {
          id: 'network-connectivity',
          description: 'Syncing your data in the background.',
          duration: 3500,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return null;
}
