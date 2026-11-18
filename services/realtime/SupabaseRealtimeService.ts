import type { RealtimeChannel } from '@supabase/supabase-js';

export interface QueueCallAlert {
  appointment: Appointment;
  ticket: QueueTicketInfo;
}

import { supabase } from '@lib/supabase';
import { queryClient, queryKeys } from '@lib/queryClient';
import { persistSnapshot, useDataStore } from '@store/useDataStore';
import { useAuthStore } from '@store/useAuthStore';
import {
  toPetModel,
  toAppointmentModel,
  toActivityModel,
} from '@services/data/supabaseDataService';
import { normalizeAppointmentStatus } from '@services/data/types';
import type {
  Pet,
  Appointment,
  AppointmentStatus,
  ActivityItem,
  QueueTicketInfo,
} from '@services/data/types';
import {
  mapQueueStatusToAppointmentStatus,
  normalizeQueueStatus,
  toQueueTicketInfo,
} from '@services/queue/queueService';
import { toast } from '@components/ui/Sonner';
import { replayQueueCallChime, startQueueRing, stopQueueRing } from '@lib/sound';

class SupabaseRealtimeService {
  private static instance: SupabaseRealtimeService;
  private activeChannel: RealtimeChannel | null = null;
  private currentOwnerId: string | null = null;
  private onAccountDeletedCallback?: () => Promise<void>;
  private queueCallAlert: QueueCallAlert | null = null;
  private queueCallListeners = new Set<(alert: QueueCallAlert | null) => void>();
  private lastAppliedQueueStatus = new Map<string, string>();

  public setOnAccountDeleted(callback?: () => Promise<void>): void {
    this.onAccountDeletedCallback = callback;
  }

  /** Global call alert subscribers receive the active call (or null when cleared). */
  public addQueueCallListener(
    listener: (alert: QueueCallAlert | null) => void,
  ): () => void {
    this.queueCallListeners.add(listener);
    listener(this.queueCallAlert);
    return () => {
      this.queueCallListeners.delete(listener);
    };
  }

  private emitQueueCallAlert(): void {
    this.queueCallListeners.forEach((listener) => listener(this.queueCallAlert));
  }

  public acknowledgeQueueCall(): void {
    if (!this.queueCallAlert) return;
    this.queueCallAlert = null;
    stopQueueRing();
    this.emitQueueCallAlert();
  }

  private clearQueueCallAlert(ticketId?: string): void {
    if (!this.queueCallAlert) return;
    if (ticketId && this.queueCallAlert.ticket.id !== ticketId) return;
    this.queueCallAlert = null;
    stopQueueRing();
    this.emitQueueCallAlert();
  }

  private raiseQueueCall(appointment: Appointment, ticket: QueueTicketInfo): void {
    this.queueCallAlert = { appointment, ticket };
    this.emitQueueCallAlert();

    startQueueRing(
      appointment.petName,
      ticket.ticketNumber,
      ticket.consultationRoom || 'Consultation Desk 1',
    );

    toast.warning('Now Calling You!', {
      description: `Ticket ${ticket.ticketNumber} is called. Please proceed to the clinic desk with ${appointment.petName}.`,
      duration: 14_000,
      id: `queue-call-${ticket.id}`,
      action: {
        label: 'Hear Chime',
        onClick: () => replayQueueCallChime(ticket.ticketNumber),
      },
    });
  }

  /** Polling fallback for owners whose Realtime socket was missed or dropped. */
  public async syncQueueStatus(ownerId: string): Promise<void> {
    if (!ownerId) return;
    const { data, error } = await supabase
      .from('queue_tickets')
      .select('*')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error || !data?.length) return;
    for (const ticket of data) {
      this.handleQueueTicketChange(ownerId, { eventType: 'UPDATE', new: ticket });
    }
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
      // 3. CLINIC QUEUE REALTIME LISTENER — all canonical ticket statuses.
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_tickets',
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          this.handleQueueTicketChange(ownerId, payload);
        },
      )
      // 4. SERVICE TRANSACTIONS REALTIME LISTENER
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

    // Keep the offline snapshot aligned with the live row so a cold start or
    // airplane-mode session sees the same upcoming appointments.
    this.persistCurrentSnapshot(ownerId);
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments(ownerId) });
  }

  /**
   * Applies every canonical queue ticket status to the linked appointment:
   * waiting → queued, in-consultation → called, completed → completed,
   * skipped → missed, overdue → overdue.
   */
  private handleQueueTicketChange(ownerId: string, payload: any): void {
    if (payload.eventType === 'DELETE') return;

    const row = payload.new as any;
    if (!row) return;
    if (row.owner_id && row.owner_id !== ownerId) return;

    const queueStatus = normalizeQueueStatus(row.status);
    const appointmentStatus = mapQueueStatusToAppointmentStatus(row.status);
    if (!queueStatus || !appointmentStatus) return;

    if (!row.appointment_id) return;

    const cached = queryClient.getQueryData<Appointment[]>(queryKeys.appointments(ownerId)) || [];
    const local = useDataStore.getState().appointments || [];
    const appointment = [...local, ...cached].find((a) => a.id === row.appointment_id);

    // A stale ticket linked only by pet identity must never change a new visit.
    if (!appointment) return;

    const ticketCreatedAt = row.created_at ? new Date(row.created_at).getTime() : 0;
    const appointmentCreatedAt = appointment.createdAt
      ? new Date(appointment.createdAt).getTime()
      : 0;
    if (ticketCreatedAt && appointmentCreatedAt && ticketCreatedAt < appointmentCreatedAt) {
      return;
    }

    // Never move a finished/cancelled appointment back into Upcoming because of
    // an older or out-of-order queue event.
    const currentStatus = normalizeAppointmentStatus(appointment.status);
    if (
      (currentStatus === 'completed' || currentStatus === 'cancelled') &&
      appointmentStatus !== 'completed'
    ) {
      return;
    }

    const ticket = toQueueTicketInfo(row);
    const previousStatus = this.lastAppliedQueueStatus.get(ticket.id);

    // A refetch can replace the cache with an older appointment row even after
    // a ticket status was applied. Re-apply when either source is still stale.
    const cachedAppointment = cached.find((a) => a.id === appointment.id);
    const localAppointment = local.find((a) => a.id === appointment.id);
    const needsStatusPatch =
      normalizeAppointmentStatus(cachedAppointment?.status) !== appointmentStatus ||
      normalizeAppointmentStatus(localAppointment?.status) !== appointmentStatus;
    if (previousStatus === queueStatus && !needsStatusPatch) return;
    this.lastAppliedQueueStatus.set(ticket.id, queueStatus);

    const updatedAppointment: Appointment = {
      ...appointment,
      status: appointmentStatus,
      queueTicket: ticket,
      updatedAt: new Date().toISOString(),
    };

    // Patch TanStack immediately. The store helper below patches it again after
    // its async persistence step, which is too late for the current render.
    queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) =>
      old.map((a) => (a.id === updatedAppointment.id ? updatedAppointment : a)),
    );
    useDataStore.setState((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === updatedAppointment.id ? updatedAppointment : a,
      ),
    }));

    useDataStore
      .getState()
      .updateAppointmentStatus(
        ownerId,
        appointment.id,
        appointmentStatus,
        ticket,
        undefined,
        { queueForSync: false },
      )
      .catch((err) => {
        console.warn('[SupabaseRealtime] Queue status apply note:', err);
      });

    if (appointmentStatus === 'called' && previousStatus !== 'called') {
      this.raiseQueueCall(updatedAppointment, ticket);
    } else {
      this.clearQueueCallAlert(ticket.id);
      if (appointmentStatus === 'completed') {
        toast.success('Visit Completed', {
          description: `${appointment.petName}'s visit was completed and placed in History.`,
        });
      }
    }
  }

  private persistCurrentSnapshot(ownerId: string): void {
    const state = useDataStore.getState();
    persistSnapshot(ownerId, {
      pets: state.pets,
      appointments: state.appointments,
      transactions: state.transactions,
    }).catch((err) => {
      console.warn('[SupabaseRealtime] Snapshot persist note:', err);
    });
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
    this.lastAppliedQueueStatus.clear();
    this.clearQueueCallAlert();
  }
}

export const supabaseRealtimeService = SupabaseRealtimeService.getInstance();
