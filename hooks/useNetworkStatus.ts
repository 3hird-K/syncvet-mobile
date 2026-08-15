import { useEffect, useState } from 'react';
import { networkService } from '@services/network';
import type { NetworkState } from '@services/network';

export function useNetworkStatus(): NetworkState & { isOnline: boolean; checkNetwork: () => Promise<NetworkState> } {
  const [state, setState] = useState<NetworkState>(networkService.getState());

  useEffect(() => {
    const unsubscribe = networkService.subscribe((updatedState) => {
      setState(updatedState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...state,
    isOnline: state.isConnected && state.isInternetReachable,
    checkNetwork: () => networkService.checkNetwork(),
  };
}
