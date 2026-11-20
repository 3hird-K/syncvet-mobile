import { Platform } from 'react-native';
import * as Network from 'expo-network';
import { withTimeout } from '@lib/asyncUtils';
import type { ConnectionStatus, NetworkState, NetworkStatusListener } from './types';

const NETWORK_CHECK_TIMEOUT_MS = 2000;

class NetworkService {
  private currentState: NetworkState = {
    isConnected: true,
    isInternetReachable: true,
    status: 'online',
    lastCheckedAt: Date.now(),
  };

  private listeners = new Set<NetworkStatusListener>();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private networkSubscription: { remove: () => void } | null = null;
  private webOnlineHandler: (() => void) | null = null;
  private webOfflineHandler: (() => void) | null = null;
  private isChecking = false;
  private isSyncing = false;
  private ready = false;
  private readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.init();
  }

  private async init() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.webOnlineHandler = () => this.handleWebStatusChange(true);
      this.webOfflineHandler = () => this.handleWebStatusChange(false);
      window.addEventListener('online', this.webOnlineHandler);
      window.addEventListener('offline', this.webOfflineHandler);
    } else {
      // Native listener gives us near-instant connectivity transitions instead of
      // relying only on the slower fallback heartbeat below.
      try {
        this.networkSubscription = Network.addNetworkStateListener((state) => {
          const isConnected = state.isConnected ?? this.ready;
          const isInternetReachable = state.isInternetReachable ?? isConnected;
          this.updateState({
            isConnected,
            isInternetReachable,
            status: this.deriveStatus(isConnected, isInternetReachable),
            lastCheckedAt: Date.now(),
          });
        });
      } catch {
        // Older runtimes may not expose the listener; periodic checks still work.
      }
    }

    try {
      await this.checkNetwork();
    } catch {
      // checkNetwork already falls back conservatively on cold start.
    } finally {
      // Consumers (auth bridge, data store, UI) must not treat the optimistic
      // "online" default as real until the first native check has settled.
      this.ready = true;
      this.notifyListeners();
    }

    // Periodic check every 15 seconds to ensure heartbeat liveness without excessive battery drain
    this.startPeriodicCheck(15000);
  }

  /** Resolves once the first connectivity check has completed. */
  public waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  public isReady(): boolean {
    return this.ready;
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

      const state = await withTimeout(
        () => Network.getNetworkStateAsync(),
        NETWORK_CHECK_TIMEOUT_MS,
        'Network state check timed out',
      );
      const isConnected = state.isConnected ?? this.ready;
      const isInternetReachable = state.isInternetReachable ?? isConnected;

      this.updateState({
        isConnected,
        isInternetReachable,
        status: this.deriveStatus(isConnected, isInternetReachable),
        lastCheckedAt: Date.now(),
      });
    } catch {
      // If the very first native check is unavailable, assume offline so auth
      // and data code cannot mistake an optimistic default for connectivity.
      if (!this.ready) {
        this.updateState({
          isConnected: false,
          isInternetReachable: false,
          status: 'offline',
          lastCheckedAt: Date.now(),
        });
      }
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
    return (
      this.ready && this.currentState.isConnected && this.currentState.isInternetReachable
    );
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
    this.networkSubscription?.remove();
    this.networkSubscription = null;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (this.webOnlineHandler) window.removeEventListener('online', this.webOnlineHandler);
      if (this.webOfflineHandler) window.removeEventListener('offline', this.webOfflineHandler);
    }
    this.webOnlineHandler = null;
    this.webOfflineHandler = null;

    this.listeners.clear();
  }
}

export const networkService = new NetworkService();
