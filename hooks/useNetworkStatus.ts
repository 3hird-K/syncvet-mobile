import { useEffect, useState } from 'react';
import { networkService } from '@services/network';
import type { NetworkState } from '@services/network';

type NetworkStatusSnapshot = NetworkState & {
  isOnline: boolean;
  isReady: boolean;
  checkNetwork: () => Promise<NetworkState>;
};

export function useNetworkStatus(): NetworkStatusSnapshot {
  const [state, setState] = useState<NetworkState>(() => networkService.getState());
  const [isReady, setIsReady] = useState(() => networkService.isReady());

  useEffect(() => {
    const sync = () => {
      setState(networkService.getState());
      setIsReady(networkService.isReady());
    };

    const unsubscribe = networkService.subscribe(sync);
    sync();

    return unsubscribe;
  }, []);

  return {
    ...state,
    isReady,
    // During the first network check "online" is only an optimistic default.
    // Treat it as offline so nothing makes a premature Supabase/auth request.
    isOnline: isReady && state.isConnected && state.isInternetReachable,
    checkNetwork: () => networkService.checkNetwork(),
  };
}
