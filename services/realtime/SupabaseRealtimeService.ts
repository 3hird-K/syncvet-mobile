import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@lib/supabase';
import { queryClient, queryKeys } from '@lib/queryClient';
import { useDataStore } from '@store/useDataStore';
import { useAuthStore } from '@store/useAuthStore';
import {
  toPetModel,
  toAppointmentModel,
  toActivityModel,
} from '@services/data/supabaseDataService';
import type { Pet, Appointment, ActivityItem } from '@services/data/types';

class SupabaseRealtimeService {
  private static instance: SupabaseRealtimeService;
  private activeChannel: RealtimeChannel | null = null;
  private currentOwnerId: string | null = null;
  private onAccountDeletedCallback?: () => Promise<void>;

  public setOnAccountDeleted(callback?: () => Promise<void>): void {
    this.onAccountDeletedCallback = callback;
  }

  public static getInstance(): SupabaseRealtimeService {
    if (!SupabaseRealtimeService.instance) {
      SupabaseRealtimeService.instance = new SupabaseRealtimeService();
    }
    return SupabaseRealtimeService.instance;
  }

  /**
   * Subscribes to PostgreSQL Change Data Capture (CDC) events for the active resident.
   * Listens for INSERT, UPDATE, and DELETE on pets, appointments, and activities.
   */
  public subscribeToResident(ownerId: string): void {
    if (!ownerId) return;

    // Avoid duplicate subscriptions to the same owner
    if (this.activeChannel && this.currentOwnerId === ownerId) {
      return;
    }

    // Tear down any previous channel
    this.unsubscribe();

    this.currentOwnerId = ownerId;
    const channelName = `realtime-resident-${ownerId}`;

    this.activeChannel = supabase
      .channel(channelName)
      // 1. PETS REALTIME LISTENER
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pets',
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          this.handlePetChange(ownerId, payload);
        },
      )
      // 2. APPOINTMENTS REALTIME LISTENER
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          this.handleAppointmentChange(ownerId, payload);
        },
      )
      // 3. SERVICE TRANSACTIONS REALTIME LISTENER
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_transactions',
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          this.handleTransactionChange(ownerId, payload);
        },
      )
      // 4. USERS (ACCOUNT DELETION) REALTIME LISTENER
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'users',
        },
        async (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (!deletedId || deletedId === ownerId) {
            console.warn(`[SupabaseRealtime] Resident account deleted in Supabase for owner: ${ownerId}. Logging out.`);
            this.unsubscribe();
            try {
              if (this.onAccountDeletedCallback) {
                await this.onAccountDeletedCallback();
              }
              await useAuthStore.getState().signOut();
            } catch (err) {
              console.error('[SupabaseRealtime] Sign out error:', err);
            }
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${ownerId}`,
        },
        async () => {
          console.warn(`[SupabaseRealtime] Resident account deleted in Supabase for owner: ${ownerId}. Logging out.`);
          this.unsubscribe();
          try {
            if (this.onAccountDeletedCallback) {
              await this.onAccountDeletedCallback();
            }
            await useAuthStore.getState().signOut();
          } catch (err) {
            console.error('[SupabaseRealtime] Sign out error:', err);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(`[SupabaseRealtime] Realtime channel error for owner: ${ownerId}`);
        }
      });
  }

  /**
   * Handles live changes on public.pets
   */
  private handlePetChange(ownerId: string, payload: any): void {
    const eventType = payload.eventType;

    if (eventType === 'INSERT') {
      const newPet = toPetModel(payload.new);
      // Update TanStack Query cache, reconciling temporary optimistic IDs
      queryClient.setQueryData<Pet[]>(queryKeys.pets(ownerId), (old = []) => {
        const filtered = old.filter(
          (p) => !(p.id.startsWith('pet-') && p.name.toLowerCase() === newPet.name.toLowerCase()),
        );
        if (filtered.some((p) => p.id === newPet.id)) return filtered;
        return [newPet, ...filtered];
      });
      // Update Zustand store
      useDataStore.setState((state) => {
        const filtered = state.pets.filter(
          (p) => !(p.id.startsWith('pet-') && p.name.toLowerCase() === newPet.name.toLowerCase()),
        );
        if (filtered.some((p) => p.id === newPet.id)) return { pets: filtered };
        return { pets: [newPet, ...filtered] };
      });
    } else if (eventType === 'UPDATE') {
      const updatedPet = toPetModel(payload.new);
      queryClient.setQueryData<Pet[]>(queryKeys.pets(ownerId), (old = []) => {
        return old.map((p) => (p.id === updatedPet.id ? updatedPet : p));
      });
      useDataStore.setState((state) => ({
        pets: state.pets.map((p) => (p.id === updatedPet.id ? updatedPet : p)),
      }));
    } else if (eventType === 'DELETE') {
      const deletedId = payload.old?.id;
      if (deletedId) {
        queryClient.setQueryData<Pet[]>(queryKeys.pets(ownerId), (old = []) => {
          return old.filter((p) => p.id !== deletedId);
        });
        useDataStore.setState((state) => ({
          pets: state.pets.filter((p) => p.id !== deletedId),
        }));
      }
    }

    // Invalidate queries to ensure full consistency
    queryClient.invalidateQueries({ queryKey: queryKeys.pets(ownerId) });
  }

  /**
   * Handles live changes on public.appointments
   */
  private handleAppointmentChange(ownerId: string, payload: any): void {
    const eventType = payload.eventType;

    if (eventType === 'INSERT') {
      const newAppt = toAppointmentModel(payload.new);
      // Update TanStack Query cache, reconciling temporary optimistic IDs
      queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) => {
        const filtered = old.filter(
          (a) => !(a.id.startsWith('apt-') && a.date === newAppt.date && a.timeSlot === newAppt.timeSlot),
        );
        if (filtered.some((a) => a.id === newAppt.id)) return filtered;
        return [newAppt, ...filtered];
      });
      useDataStore.setState((state) => {
        const filtered = state.appointments.filter(
          (a) => !(a.id.startsWith('apt-') && a.date === newAppt.date && a.timeSlot === newAppt.timeSlot),
        );
        if (filtered.some((a) => a.id === newAppt.id)) return { appointments: filtered };
        return { appointments: [newAppt, ...filtered] };
      });
    } else if (eventType === 'UPDATE') {
      const updatedAppt = toAppointmentModel(payload.new);
      queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) => {
        return old.map((a) => (a.id === updatedAppt.id ? updatedAppt : a));
      });
      useDataStore.setState((state) => ({
        appointments: state.appointments.map((a) =>
          a.id === updatedAppt.id ? updatedAppt : a,
        ),
      }));
    } else if (eventType === 'DELETE') {
      const deletedId = payload.old?.id;
      if (deletedId) {
        queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) => {
          return old.filter((a) => a.id !== deletedId);
        });
        useDataStore.setState((state) => ({
          appointments: state.appointments.filter((a) => a.id !== deletedId),
        }));
      }
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.appointments(ownerId) });
  }

  /**
   * Handles live changes on public.service_transactions
   */
  private handleTransactionChange(ownerId: string, payload: any): void {
    const eventType = payload.eventType;

    if (eventType === 'INSERT') {
      const newTx = toActivityModel(payload.new);
      queryClient.setQueryData<ActivityItem[]>(queryKeys.transactions(ownerId), (old = []) => {
        if (old.some((a) => a.id === newTx.id)) return old;
        return [newTx, ...old];
      });
      useDataStore.setState((state) => {
        const existingTx = (state as any).transactions || state.activity || [];
        if (existingTx.some((a: any) => a.id === newTx.id)) return state;
        return {
          activity: [newTx, ...existingTx],
          transactions: [newTx, ...existingTx],
        } as any;
      });
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.transactions(ownerId) });
  }

  /**
   * Tears down active Realtime subscription channel.
   */
  public unsubscribe(): void {
    if (this.activeChannel) {
      supabase.removeChannel(this.activeChannel);
      this.activeChannel = null;
    }
    this.currentOwnerId = null;
  }
}

export const supabaseRealtimeService = SupabaseRealtimeService.getInstance();
