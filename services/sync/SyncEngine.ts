import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService } from '@services/network';
import { supabase } from '@lib/supabase';
import { getDataService } from '@services/data';
import { syncQueue } from './SyncQueue';
import { ConflictResolver } from './ConflictResolver';
import type { SyncEngineState, SyncOperation, SyncResult } from './types';
import type { ActivityItem, Appointment, BookingInput, Pet, PetInput } from '@services/data/types';
import { queryClient, queryKeys } from '@lib/queryClient';

function lastSyncKey(ownerId: string): string {
  return `syncvet.last_sync.${ownerId}`;
}

type SyncStateListener = (state: SyncEngineState) => void;

export class SyncEngine {
  private static instance: SyncEngine;

  private state: SyncEngineState = {
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
  };

  private listeners = new Set<SyncStateListener>();
  private activeOwnerId: string | null = null;
  private clerkUserRef: any = null;
  private isProcessing = false;

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  constructor() {
    this.init();
  }

  private init() {
    // 1. Auto-sync on network reconnect
    networkService.subscribe((netState) => {
      if (netState.isConnected && netState.isInternetReachable && this.activeOwnerId) {
        this.sync(this.activeOwnerId, this.clerkUserRef).catch(() => {});
      }
    });

    // 2. Auto-sync on App returning to foreground
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && this.activeOwnerId && networkService.isOnline()) {
        this.sync(this.activeOwnerId, this.clerkUserRef).catch(() => {});
      }
    });
  }

  public registerSession(ownerId: string, clerkUser?: any) {
    this.activeOwnerId = ownerId;
    if (clerkUser) {
      this.clerkUserRef = clerkUser;
    }
    this.loadLastSyncTime(ownerId).catch(() => {});
    this.updatePendingCount(ownerId).catch(() => {});
  }

  private async loadLastSyncTime(ownerId: string) {
    try {
      const time = await AsyncStorage.getItem(lastSyncKey(ownerId));
      if (time) {
        this.updateState({ lastSyncedAt: time });
      }
    } catch {}
  }

  public async updatePendingCount(ownerId: string): Promise<number> {
    const count = await syncQueue.getPendingCount(ownerId);
    this.updateState({ pendingCount: count });
    return count;
  }

  public getState(): SyncEngineState {
    return { ...this.state };
  }

  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<SyncEngineState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.getState());
      } catch (e) {
        console.warn('SyncEngine listener error:', e);
      }
    }
  }

  /**
   * Main synchronization entry point.
   * 1. Checks connectivity
   * 2. Processes pending mutation queue
   * 3. Syncs and merges remote state
   * 4. Updates lastSyncedAt
   */
  public async sync(ownerId: string, clerkUser?: any): Promise<SyncResult> {
    if (!ownerId) {
      return { success: false, processedCount: 0, failedCount: 0, errors: [] };
    }

    this.activeOwnerId = ownerId;
    if (clerkUser) this.clerkUserRef = clerkUser;

    const userToUse = clerkUser || this.clerkUserRef;

    if (!networkService.isOnline()) {
      await this.updatePendingCount(ownerId);
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [{ operationId: 'network', error: 'Device is offline' }],
      };
    }

    if (this.isProcessing) {
      return { success: true, processedCount: 0, failedCount: 0, errors: [] };
    }

    this.isProcessing = true;
    this.updateState({ isSyncing: true, lastError: undefined });
    networkService.setSyncing(true);

    const result: SyncResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Step 1: Ensure user profile is registered and aligned in Supabase
      if (userToUse) {
        await this.syncUserProfileToSupabase(userToUse);
      }

      // Step 2: Process local queued mutations against Supabase
      const queueResult = await this.processMutationQueue(ownerId, userToUse);
      result.processedCount += queueResult.processedCount;
      result.failedCount += queueResult.failedCount;
      result.errors.push(...queueResult.errors);

      // Step 4: Record sync completion timestamp
      const nowISO = new Date().toISOString();
      await AsyncStorage.setItem(lastSyncKey(ownerId), nowISO);
      const pending = await syncQueue.getPendingCount(ownerId);

      this.updateState({
        isSyncing: false,
        lastSyncedAt: nowISO,
        pendingCount: pending,
      });

      // Keep TanStack Query cache strictly aligned with synced server state
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(ownerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(ownerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(ownerId) });

      result.success = result.failedCount === 0;
    } catch (err: any) {
      const errorMsg = err?.message || 'Sync failed';
      this.updateState({
        isSyncing: false,
        lastError: errorMsg,
      });
      result.success = false;
      result.errors.push({ operationId: 'sync_engine', error: errorMsg });
    } finally {
      this.isProcessing = false;
      networkService.setSyncing(false);
    }

    return result;
  }

  /**
   * Ensures user profile exists in Supabase public.users table
   */
  private async syncUserProfileToSupabase(clerkUser: any): Promise<void> {
    if (!clerkUser) return;
    try {
      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const fullName =
        clerkUser.fullName ||
        `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
        null;
      const avatarUrl = clerkUser.imageUrl || null;

      // Update existing user profile in public.users.
      // Do NOT upsert here to avoid resurrecting deleted accounts.
      await supabase
        .from('users')
        .update({
          email: email || `${clerkUser.id}@resident.syncvet.app`,
          full_name: fullName || 'Resident',
          first_name: clerkUser.firstName || null,
          last_name: clerkUser.lastName || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clerkUser.id);
    } catch (err) {
      console.warn('Sync profile to Supabase note:', err);
    }
  }

  /**
   * Sequentially executes pending mutations from the durable queue.
   */
  private async processMutationQueue(ownerId: string, clerkUser?: any): Promise<SyncResult> {
    const pending = await syncQueue.getPending(ownerId);
    const result: SyncResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      errors: [],
    };

    if (pending.length === 0) {
      await this.updatePendingCount(ownerId);
      return result;
    }

    for (const op of pending) {
      await syncQueue.markStatus(ownerId, op.id, 'syncing');

      try {
        await this.executeOperation(op, clerkUser);
        await syncQueue.remove(ownerId, op.id);
        result.processedCount++;
      } catch (err: any) {
        const message = err?.message || 'Operation sync failed';
        await syncQueue.markStatus(ownerId, op.id, 'failed', message);
        result.failedCount++;
        result.errors.push({ operationId: op.id, error: message });
      }
    }

    await this.updatePendingCount(ownerId);
    return result;
  }

  private async executeOperation(op: SyncOperation, clerkUser?: any): Promise<void> {
    const dataService = getDataService();

    // 1. Execute mutation against Supabase
    switch (op.operation) {
      case 'CREATE_PET': {
        const newPet = op.payload as Pet;
        await dataService.addPet(op.ownerId, newPet);
        break;
      }

      case 'UPDATE_PET': {
        const updatedPet = op.payload as Pet;
        await dataService.updatePet(updatedPet);
        break;
      }

      case 'DELETE_PET': {
        const petIdToDelete = op.entityId;
        await dataService.deletePet(op.ownerId, petIdToDelete);
        break;
      }

      case 'BOOK_APPOINTMENT': {
        const newAppt = op.payload as Appointment;
        await dataService.bookAppointment(op.ownerId, {
          petId: newAppt.petId,
          petName: newAppt.petName,
          serviceId: newAppt.serviceId,
          date: newAppt.date,
          timeSlot: newAppt.timeSlot,
          location: newAppt.location,
          notes: newAppt.notes,
        });
        break;
      }

      case 'CANCEL_APPOINTMENT': {
        const apptId = op.entityId;
        await dataService.cancelAppointment(op.ownerId, apptId);
        break;
      }

      case 'UPDATE_PROFILE': {
        const profile = op.payload as { mobileNumber?: string; address?: string; fullName?: string };
        await supabase
          .from('users')
          .update({
            ...(profile.mobileNumber ? { phone_number: profile.mobileNumber } : {}),
            ...(profile.address ? { address: profile.address } : {}),
            ...(profile.fullName ? { full_name: profile.fullName } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', op.ownerId);
        break;
      }
    }
  }
}

export const syncEngine = SyncEngine.getInstance();
