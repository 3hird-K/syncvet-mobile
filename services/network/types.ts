export type ConnectionStatus = 'online' | 'offline' | 'reconnecting' | 'syncing';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  status: ConnectionStatus;
  lastCheckedAt: number;
}

export type NetworkStatusListener = (state: NetworkState) => void;
