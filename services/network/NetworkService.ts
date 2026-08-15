import { Platform } from 'react-native';
import * as Network from 'expo-network';
import type { ConnectionStatus, NetworkState, NetworkStatusListener } from './types';

class NetworkService {
  private currentState: NetworkState = {
    isConnected: true,
    isInternetReachable: true,
    status: 'online',
    lastCheckedAt: Date.now(),
  };

  private listeners = new Set<NetworkStatusListener>();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private isChecking = false;
  private isSyncing = false;

  constructor() {
    this.init();
  }

  private async init() {
    await this.checkNetwork();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleWebStatusChange(true));
      window.addEventListener('offline', () => this.handleWebStatusChange(false));
    }

    // Periodic check every 15 seconds to ensure heartbeat liveness without excessive battery drain
    this.startPeriodicCheck(15000);
  }

  public async checkNetwork(): Promise<NetworkState> {
    if (this.isChecking) return this.currentState;
    this.isChecking = true;

    try {
      if (Platform.OS === 'web') {
        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
        this.updateState({
          isConnected: online,
          isInternetReachable: online,
          status: this.deriveStatus(online, online),
          lastCheckedAt: Date.now(),
        });
        return this.currentState;
      }

      const state = await Network.getNetworkStateAsync();
      const isConnected = state.isConnected ?? true;
      const isInternetReachable = state.isInternetReachable ?? isConnected;

      this.updateState({
        isConnected,
        isInternetReachable,
        status: this.deriveStatus(isConnected, isInternetReachable),
        lastCheckedAt: Date.now(),
      });
    } catch {
      // In case of error querying native network module, preserve previous connectivity status
    } finally {
      this.isChecking = false;
    }

    return this.currentState;
  }

  private deriveStatus(isConnected: boolean, isInternetReachable: boolean): ConnectionStatus {
    if (this.isSyncing) return 'syncing';
    if (!isConnected || !isInternetReachable) return 'offline';
    return 'online';
  }

  private handleWebStatusChange(online: boolean) {
    this.updateState({
      isConnected: online,
      isInternetReachable: online,
      status: this.deriveStatus(online, online),
      lastCheckedAt: Date.now(),
    });
  }

  private updateState(newState: NetworkState) {
    const prevStatus = this.currentState.status;
    this.currentState = newState;

    if (prevStatus !== newState.status) {
      this.notifyListeners();
    }
  }

  public setSyncing(syncing: boolean) {
    this.isSyncing = syncing;
    const newStatus = this.deriveStatus(
      this.currentState.isConnected,
      this.currentState.isInternetReachable,
    );
    if (this.currentState.status !== newStatus) {
      this.currentState = {
        ...this.currentState,
        status: newStatus,
        lastCheckedAt: Date.now(),
      };
      this.notifyListeners();
    }
  }

  public getState(): NetworkState {
    return { ...this.currentState };
  }

  public isOnline(): boolean {
    return this.currentState.isConnected && this.currentState.isInternetReachable;
  }

  public subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.warn('Network listener notification error:', err);
      }
    }
  }

  private startPeriodicCheck(intervalMs: number) {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => {
      this.checkNetwork().catch(() => {});
    }, intervalMs);
  }

  public cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.listeners.clear();
  }
}

export const networkService = new NetworkService();
