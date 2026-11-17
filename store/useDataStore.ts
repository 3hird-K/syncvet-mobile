import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDataService } from '@services/data';
import { networkService } from '@services/network';
import { syncEngine, syncQueue } from '@services/sync';
import type { SyncOperation } from '@services/sync';
import { reminderEngine } from '@services/notifications';
import type {
  Appointment,
  AppointmentStatus,
  BookingInput,
  Pet,
  PetInput,
  ServiceTransaction,
} from '@services/data';
import { queryClient, queryKeys } from '@lib/queryClient';
import { generateMicrochipNumber, generateUUID } from '@lib/uuid';

interface DataState {
  pets: Pet[];
  appointments: Appointment[];
  transactions: ServiceTransaction[];
  activity: ServiceTransaction[]; // alias for backward compatibility
  loading: boolean;
  loaded: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  error?: string;

  loadAll: (ownerId: string, clerkUser?: any) => Promise<void>;
  addPet: (ownerId: string, input: PetInput, clerkUser?: any) => Promise<Pet>;
  updatePet: (pet: Pet, clerkUser?: any) => Promise<void>;
  deletePet: (ownerId: string, petId: string, clerkUser?: any) => Promise<void>;
  bookAppointment: (ownerId: string, input: BookingInput, clerkUser?: any) => Promise<Appointment>;
  cancelAppointment: (ownerId: string, appointmentId: string, clerkUser?: any) => Promise<void>;
  updateAppointmentStatus: (
    ownerId: string,
    appointmentId: string,
    status: AppointmentStatus,
    queueTicket?: any,
    notes?: string,
    options?: { queueForSync?: boolean },
  ) => Promise<void>;
  syncNow: (ownerId: string, clerkUser?: any) => Promise<void>;
  reset: () => void;
}

interface DataSnapshot {
  pets: Pet[];
  appointments: Appointment[];
  transactions: ServiceTransaction[];
}

const activeOwnerIds = {
  current: null as string | null,
};
const loadGenerations = new Map<string, number>();
const backgroundRefreshes = new Map<string, Promise<void>>();

function dataCacheKey(ownerId: string): string {
  return `syncvet.data.${ownerId}`;
}

function parseCachedSnapshot(raw: string | null): DataSnapshot {
  if (!raw) {
    return { pets: [], appointments: [], transactions: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      pets: Array.isArray(parsed?.pets) ? parsed.pets : [],
      appointments: Array.isArray(parsed?.appointments) ? parsed.appointments : [],
      transactions: Array.isArray(parsed?.transactions)
        ? parsed.transactions
        : Array.isArray(parsed?.activity)
          ? parsed.activity
          : [],
    };
  } catch {
    return { pets: [], appointments: [], transactions: [] };
  }
}

function omitPendingFlag<T extends { _pendingSync?: boolean }>(item: T): T {
  const next = { ...item };
  delete next._pendingSync;
  return next;
}

/**
 * Applies the durable offline queue to a local or remote snapshot. Pending
 * mutations always win over server rows so an offline edit never disappears
 * while it is waiting to sync.
 */
function reconcileWithQueue(
  ownerId: string,
  snapshot: DataSnapshot,
  pendingOps: SyncOperation[],
): DataSnapshot {
  const pendingPetIds = new Set<string>();
  const pendingAppointmentIds = new Set<string>();

  for (const op of pendingOps) {
    if (op.operation === 'CREATE_PET' || op.operation === 'UPDATE_PET' || op.operation === 'DELETE_PET') {
      if (op.entityId) pendingPetIds.add(op.entityId);
    }
    if (
      op.operation === 'BOOK_APPOINTMENT' ||
      op.operation === 'CANCEL_APPOINTMENT' ||
      op.operation === 'UPDATE_APPOINTMENT_STATUS'
    ) {
      if (op.entityId) pendingAppointmentIds.add(op.entityId);
    }
  }

  let pets = snapshot.pets.map((pet) =>
    pet._pendingSync && !pendingPetIds.has(pet.id) ? omitPendingFlag(pet) : pet,
  );
  let appointments = snapshot.appointments.map((appointment) =>
    appointment._pendingSync && !pendingAppointmentIds.has(appointment.id)
      ? omitPendingFlag(appointment)
      : appointment,
  );

  for (const op of pendingOps) {
    switch (op.operation) {
      case 'CREATE_PET':
      case 'UPDATE_PET': {
        const pet = op.payload as Pet | undefined;
        if (!pet?.id) break;
        const queuedPet: Pet = { ...pet, ownerId, _pendingSync: true };
        const index = pets.findIndex((candidate) => candidate.id === pet.id);
        if (index >= 0) {
          pets[index] = queuedPet;
        } else {
          pets.unshift(queuedPet);
        }
        break;
      }
      case 'DELETE_PET':
        pets = pets.filter((pet) => pet.id !== op.entityId);
        appointments = appointments.filter(
          (appointment) => appointment.petId !== op.entityId,
        );
        break;
      case 'BOOK_APPOINTMENT': {
        const appointment = op.payload as Appointment | undefined;
        if (!appointment?.id) break;
        const queuedAppointment: Appointment = {
          ...appointment,
          ownerId,
          _pendingSync: true,
        };
        const index = appointments.findIndex(
          (candidate) => candidate.id === appointment.id,
        );
        if (index >= 0) {
          appointments[index] = queuedAppointment;
        } else {
          appointments.push(queuedAppointment);
        }
        break;
      }
      case 'CANCEL_APPOINTMENT':
        appointments = appointments.map((appointment) =>
          appointment.id === op.entityId
            ? { ...appointment, status: 'cancelled' as const, _pendingSync: true }
            : appointment,
        );
        break;
      case 'UPDATE_APPOINTMENT_STATUS': {
        const payload = op.payload as {
          status?: AppointmentStatus;
          notes?: string | null;
          queueTicket?: Appointment['queueTicket'];
        };
        appointments = appointments.map((appointment) =>
          appointment.id === op.entityId
            ? {
                ...appointment,
                ...(payload.status ? { status: payload.status } : {}),
                ...(payload.notes !== undefined ? { notes: payload.notes ?? undefined } : {}),
                ...(payload.queueTicket
                  ? { queueTicket: payload.queueTicket }
                  : {}),
                _pendingSync: true,
              }
            : appointment,
        );
        break;
      }
      default:
        break;
    }
  }

  return { pets, appointments, transactions: snapshot.transactions };
}

/**
 * Keeps writes made while a background refresh was in flight from being
 * overwritten by a stale server response.
 */
function mergePendingLocalState(
  refreshed: DataSnapshot,
  current: DataSnapshot,
): DataSnapshot {
  const pets = [...refreshed.pets];
  const appointments = [...refreshed.appointments];

  for (const pet of current.pets) {
    if (!pet._pendingSync) continue;
    const index = pets.findIndex((candidate) => candidate.id === pet.id);
    if (index >= 0) {
      pets[index] = pet;
    } else {
      pets.unshift(pet);
    }
  }

  for (const appointment of current.appointments) {
    if (!appointment._pendingSync) continue;
    const index = appointments.findIndex(
      (candidate) => candidate.id === appointment.id,
    );
    if (index >= 0) {
      appointments[index] = appointment;
    } else {
      appointments.push(appointment);
    }
  }

  return {
    pets,
    appointments,
    transactions: refreshed.transactions,
  };
}

async function persistSnapshot(ownerId: string, snapshot: DataSnapshot): Promise<void> {
  await AsyncStorage.setItem(
    dataCacheKey(ownerId),
    JSON.stringify({
      pets: snapshot.pets,
      appointments: snapshot.appointments,
      transactions: snapshot.transactions,
      activity: snapshot.transactions,
    }),
  );
}

export const useDataStore = create<DataState>((set, get) => {
  // Subscribe to SyncEngine state changes
  syncEngine.subscribe((engineState) => {
    set({
      isSyncing: engineState.isSyncing,
      lastSyncedAt: engineState.lastSyncedAt,
      pendingCount: engineState.pendingCount,
    });
  });

  return {
    pets: [],
    appointments: [],
    transactions: [],
    activity: [],
    loading: false,
    loaded: false,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,

    reset: () => {
      activeOwnerIds.current = null;
      queryClient.clear();
      set({
        pets: [],
        appointments: [],
        transactions: [],
        activity: [],
        loading: false,
        loaded: false,
        pendingCount: 0,
        error: undefined,
      });
    },

    loadAll: async (ownerId, clerkUser) => {
      if (!ownerId) return;

      const generation = (loadGenerations.get(ownerId) || 0) + 1;
      loadGenerations.set(ownerId, generation);
      activeOwnerIds.current = ownerId;
      set({ loading: true, error: undefined });

      try {
        // 1. Local cache is the first UI source. Read it before touching the
        // network so a cold start while offline renders immediately.
        const [rawCache, pendingOps] = await Promise.all([
          AsyncStorage.getItem(dataCacheKey(ownerId)),
          syncQueue.getPending(ownerId),
        ]);
        if (loadGenerations.get(ownerId) !== generation) return;

        const localSnapshot = reconcileWithQueue(
          ownerId,
          parseCachedSnapshot(rawCache),
          pendingOps,
        );

        await persistSnapshot(ownerId, localSnapshot);
        if (loadGenerations.get(ownerId) !== generation) return;

        set({
          pets: localSnapshot.pets,
          appointments: localSnapshot.appointments,
          transactions: localSnapshot.transactions,
          activity: localSnapshot.transactions,
          loading: false,
          loaded: true,
          pendingCount: pendingOps.length,
          lastSyncedAt: syncEngine.getState().lastSyncedAt,
        });

        // Register session with sync engine for automatic background synchronization
        syncEngine.registerSession(ownerId, clerkUser);

        // Reconcile scheduled notifications for active resident
        reminderEngine
          .reconcile(localSnapshot.pets, localSnapshot.appointments, undefined, ownerId)
          .catch(() => {});

        // Make the persisted snapshot available to TanStack-backed consumers too.
        queryClient.setQueryData<Pet[]>(queryKeys.pets(ownerId), localSnapshot.pets);
        queryClient.setQueryData<Appointment[]>(
          queryKeys.appointments(ownerId),
          localSnapshot.appointments,
        );
        queryClient.setQueryData<ServiceTransaction[]>(
          queryKeys.transactions(ownerId),
          localSnapshot.transactions,
        );

        if (!networkService.isOnline() || backgroundRefreshes.has(ownerId)) {
          return;
        }

        // 2. Refresh remote data in the background. Failure here must not clear
        // the usable local snapshot or leave a full-screen spinner in place.
        const refreshTask = (async () => {
          try {
            if (clerkUser) {
              await syncEngine.sync(ownerId, clerkUser);
            }

            const remainingPending = await syncQueue.getPending(ownerId);
            const dataService = getDataService();
            const [remotePets, remoteAppointments, remoteTransactions] =
              await Promise.all([
                dataService.getPets(ownerId),
                dataService.getAppointments(ownerId),
                dataService.getTransactions(ownerId),
              ]);

            if (!networkService.isOnline() || activeOwnerIds.current !== ownerId) {
              return;
            }

            let refreshed = reconcileWithQueue(
              ownerId,
              {
                pets: remotePets ?? [],
                appointments: remoteAppointments ?? [],
                transactions: remoteTransactions ?? [],
              },
              remainingPending,
            );

            const currentState = get();
            refreshed = mergePendingLocalState(refreshed, {
              pets: currentState.pets,
              appointments: currentState.appointments,
              transactions: currentState.transactions,
            });

            await persistSnapshot(ownerId, refreshed);
            if (activeOwnerIds.current !== ownerId) return;

            set({
              pets: refreshed.pets,
              appointments: refreshed.appointments,
              transactions: refreshed.transactions,
              activity: refreshed.transactions,
              loading: false,
              loaded: true,
              pendingCount: remainingPending.length,
              lastSyncedAt: syncEngine.getState().lastSyncedAt,
              error: undefined,
            });

            queryClient.setQueryData<Pet[]>(queryKeys.pets(ownerId), refreshed.pets);
            queryClient.setQueryData<Appointment[]>(
              queryKeys.appointments(ownerId),
              refreshed.appointments,
            );
            queryClient.setQueryData<ServiceTransaction[]>(
              queryKeys.transactions(ownerId),
              refreshed.transactions,
            );

            reminderEngine
              .reconcile(refreshed.pets, refreshed.appointments, undefined, ownerId)
              .catch(() => {});
          } catch (err) {
            console.warn('Background data refresh note:', err);
            if (activeOwnerIds.current === ownerId) {
              set({ loading: false, loaded: true });
            }
          }
        })().finally(() => {
          backgroundRefreshes.delete(ownerId);
        });

        backgroundRefreshes.set(ownerId, refreshTask);
      } catch (err) {
        console.warn('Offline data load error:', err);
        if (activeOwnerIds.current === ownerId) {
          set({
            loading: false,
            loaded: true,
            error: 'Could not load offline data.',
          });
        }
      }
    },

    addPet: async (ownerId, input, clerkUser) => {
      const now = new Date().toISOString();
      const petId =
        (input as any).id && !(input as any).id.startsWith('pet-') && !(input as any).id.startsWith('pet_')
          ? (input as any).id
          : generateUUID();
      const microchipNumber =
        (input as any).microchipNumber || (input as any).microchip_number || generateMicrochipNumber();

      const pet: Pet = {
        ...input,
        id: petId,
        ownerId,
        microchipNumber,
        createdAt: (input as any).createdAt || now,
        updatedAt: now,
        _pendingSync: true,
      };

      set((state) => ({
        pets: [pet, ...state.pets.filter((p) => p.id !== pet.id)],
      }));

      // Persist in local storage
      const currentPets = get().pets;
      const currentAppts = get().appointments;
      const currentTransactions = get().transactions;
      await persistSnapshot(ownerId, {
        pets: currentPets,
        appointments: currentAppts,
        transactions: currentTransactions,
      });

      // Reconcile reminders
      reminderEngine.reconcile(currentPets, currentAppts, undefined, ownerId).catch(() => {});

      // Queue durable mutation
      await syncQueue.enqueue(ownerId, 'pet', pet.id, 'CREATE_PET', pet);
      const pendingCount = await syncQueue.getPendingCount(ownerId);
      set({ pendingCount });

      // Keep TanStack cache immediately updated
      queryClient.setQueryData<Pet[]>(queryKeys.pets(ownerId), (old = []) => {
        if (old.some((p) => p.id === pet.id)) return old;
        return [pet, ...old];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(ownerId) });

      // Trigger background sync if online
      syncEngine.sync(ownerId, clerkUser).catch(() => {});

      return pet;
    },

    updatePet: async (pet, clerkUser) => {
      const updatedPet: Pet = { ...pet, _pendingSync: true, updatedAt: new Date().toISOString() };
      set((state) => ({
        pets: state.pets.map((p) => (p.id === pet.id ? updatedPet : p)),
      }));

      const currentPets = get().pets;
      const currentAppts = get().appointments;
      const currentTransactions = get().transactions;
      await persistSnapshot(pet.ownerId, {
        pets: currentPets,
        appointments: currentAppts,
        transactions: currentTransactions,
      });

      reminderEngine.reconcile(currentPets, currentAppts, undefined, pet.ownerId).catch(() => {});

      await syncQueue.enqueue(pet.ownerId, 'pet', pet.id, 'UPDATE_PET', updatedPet);
      const pendingCount = await syncQueue.getPendingCount(pet.ownerId);
      set({ pendingCount });

      // Keep TanStack cache immediately updated
      queryClient.setQueryData<Pet[]>(queryKeys.pets(pet.ownerId), (old = []) => {
        return old.map((p) => (p.id === updatedPet.id ? updatedPet : p));
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(pet.ownerId) });

      syncEngine.sync(pet.ownerId, clerkUser).catch(() => {});
    },

    deletePet: async (ownerId, petId, clerkUser) => {
      set((state) => ({
        pets: state.pets.filter((p) => p.id !== petId),
        appointments: state.appointments.filter((a) => a.petId !== petId),
      }));

      const currentPets = get().pets;
      const currentAppts = get().appointments;
      const currentTransactions = get().transactions;
      await persistSnapshot(ownerId, {
        pets: currentPets,
        appointments: currentAppts,
        transactions: currentTransactions,
      });

      reminderEngine.reconcile(currentPets, currentAppts, undefined, ownerId).catch(() => {});

      await syncQueue.enqueue(ownerId, 'pet', petId, 'DELETE_PET', { id: petId });
      const pendingCount = await syncQueue.getPendingCount(ownerId);
      set({ pendingCount });

      // Keep TanStack cache immediately updated
      queryClient.setQueryData<Pet[]>(queryKeys.pets(ownerId), (old = []) => {
        return old.filter((p) => p.id !== petId);
      });
      queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) => {
        return old.filter((a) => a.petId !== petId);
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(ownerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(ownerId) });

      syncEngine.sync(ownerId, clerkUser).catch(() => {});
    },

    bookAppointment: async (ownerId, input, clerkUser) => {
      const now = new Date().toISOString();
      const appointment: Appointment = {
        ...input,
        id: (input as any).id || `apt-${Date.now()}`,
        ownerId,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        _pendingSync: true,
      };

      set((state) => ({
        appointments: [...state.appointments, appointment],
      }));

      const currentPets = get().pets;
      const currentAppts = get().appointments;
      const currentTransactions = get().transactions;
      await persistSnapshot(ownerId, {
        pets: currentPets,
        appointments: currentAppts,
        transactions: currentTransactions,
      });

      reminderEngine.reconcile(currentPets, currentAppts, undefined, ownerId).catch(() => {});

      await syncQueue.enqueue(ownerId, 'appointment', appointment.id, 'BOOK_APPOINTMENT', appointment);
      const pendingCount = await syncQueue.getPendingCount(ownerId);
      set({ pendingCount });

      // Immediately sync into TanStack Query cache so appointments view updates instantly
      queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) => {
        if (old.some((a) => a.id === appointment.id)) return old;
        return [appointment, ...old];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(ownerId) });

      syncEngine.sync(ownerId, clerkUser).catch(() => {});
      return appointment;
    },

    cancelAppointment: async (ownerId, appointmentId, clerkUser) => {
      set((state) => ({
        appointments: state.appointments.map((a) =>
          a.id === appointmentId ? { ...a, status: 'cancelled', _pendingSync: true } : a,
        ),
      }));

      const currentPets = get().pets;
      const currentAppts = get().appointments;
      const currentTransactions = get().transactions;
      await persistSnapshot(ownerId, {
        pets: currentPets,
        appointments: currentAppts,
        transactions: currentTransactions,
      });

      reminderEngine.reconcile(currentPets, currentAppts, undefined, ownerId).catch(() => {});

      await syncQueue.enqueue(ownerId, 'appointment', appointmentId, 'CANCEL_APPOINTMENT', { id: appointmentId });
      const pendingCount = await syncQueue.getPendingCount(ownerId);
      set({ pendingCount });

      // Immediately sync into TanStack Query cache
      queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) => {
        return old.map((a) => (a.id === appointmentId ? { ...a, status: 'cancelled' } : a));
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(ownerId) });

      syncEngine.sync(ownerId, clerkUser).catch(() => {});
    },

    updateAppointmentStatus: async (
      ownerId,
      appointmentId,
      status,
      queueTicket,
      notes,
      options,
    ) => {
      const shouldQueue = options?.queueForSync !== false;
      const existing = get().appointments.find((a) => a.id === appointmentId);
      let syncNotes = notes ?? existing?.notes;

      // The server derives the queue ticket from the appointment notes, so keep
      // that marker when a local status change is synced later.
      if (
        queueTicket?.ticketNumber &&
        !syncNotes?.includes(`[Checked in: Ticket ${queueTicket.ticketNumber}]`)
      ) {
        const marker = `[Checked in: Ticket ${queueTicket.ticketNumber}]`;
        syncNotes = syncNotes ? `${syncNotes} | ${marker}` : marker;
      }

      const applyStatus = (appointment: Appointment): Appointment => ({
        ...appointment,
        status,
        updatedAt: new Date().toISOString(),
        _pendingSync: shouldQueue,
        ...(queueTicket ? { queueTicket } : {}),
        ...(syncNotes ? { notes: syncNotes } : {}),
      });

      // Local UI updates immediately; the durable queue handles remote delivery.
      set((state) => ({
        appointments: state.appointments.map((a) =>
          a.id === appointmentId ? applyStatus(a) : a,
        ),
      }));

      const currentPets = get().pets;
      const currentAppts = get().appointments;
      const currentTransactions = get().transactions;
      await persistSnapshot(ownerId, {
        pets: currentPets,
        appointments: currentAppts,
        transactions: currentTransactions,
      });

      if (shouldQueue) {
        await syncQueue.enqueue(ownerId, 'appointment', appointmentId, 'UPDATE_APPOINTMENT_STATUS', {
          status,
          notes: syncNotes ?? null,
          queueTicket: queueTicket ?? null,
        });
        set({ pendingCount: await syncQueue.getPendingCount(ownerId) });
      }

      queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) => {
        return old.map((a) => (a.id === appointmentId ? applyStatus(a) : a));
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(ownerId) });

      if (shouldQueue) {
        syncEngine.sync(ownerId).catch(() => {});
      }
    },

    syncNow: async (ownerId, clerkUser) => {
      if (!ownerId) return;
      await syncEngine.sync(ownerId, clerkUser);
      await get().loadAll(ownerId, clerkUser);
    },
  };
});
