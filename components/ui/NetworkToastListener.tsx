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
        // If the app starts up already offline, give the resident a gentle heads up
        if (!isOnline) {
          toast.warning('You are currently offline', {
            id: 'network-connectivity',
            description: 'Changes will be saved locally and synced once reconnected.',
            duration: 4000,
          });
        }
        return;
      }

      // Transition: Online -> Offline
      if (wasOnlineRef.current === true && !isOnline) {
        wasOnlineRef.current = false;
        toast.warning('You are currently offline', {
          id: 'network-connectivity',
          description: 'Changes will be saved locally and synced once reconnected.',
          duration: 4000,
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
