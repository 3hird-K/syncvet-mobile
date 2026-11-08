import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDataService } from '@services/data';
import { syncEngine, syncQueue } from '@services/sync';
import { reminderEngine } from '@services/notifications';
import type {
  Appointment,
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
  syncNow: (ownerId: string, clerkUser?: any) => Promise<void>;
  reset: () => void;
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

      try {
        let activePets: Pet[] = [];
        let activeAppts: Appointment[] = [];
        let activeTransactions: ServiceTransaction[] = [];

        // 1. Fetch live data from Supabase via DataService
        let supabasePets: Pet[] = [];
        let supabaseAppts: Appointment[] = [];
        let supabaseTransactions: ServiceTransaction[] = [];

        try {
          const dataService = getDataService();
          [supabasePets, supabaseAppts, supabaseTransactions] = await Promise.all([
            dataService.getPets(ownerId),
            dataService.getAppointments(ownerId),
            dataService.getTransactions(ownerId),
          ]);
        } catch (dbErr) {
          console.warn('Supabase initial fetch note:', dbErr);
        }

        // 2. Local Persistent Cache (for instant offline startup)
        const rawCache = await AsyncStorage.getItem(`syncvet.data.${ownerId}`);
        let cachedPets: Pet[] = [];
        let cachedAppts: Appointment[] = [];
        let cachedTx: ServiceTransaction[] = [];
        if (rawCache) {
          try {
            const parsed = JSON.parse(rawCache);
            cachedPets = parsed.pets || [];
            cachedAppts = parsed.appointments || [];
            cachedTx = parsed.transactions || parsed.activity || [];
          } catch {}
        }

        // 3. Pending Offline Queue Items
        const pendingOps = await syncQueue.getPending(ownerId);

        activePets = supabasePets.length > 0 ? supabasePets : cachedPets;
        activeAppts = supabaseAppts.length > 0 ? supabaseAppts : cachedAppts;
        activeTransactions = supabaseTransactions.length > 0 ? supabaseTransactions : cachedTx;

        // 4. Reconcile any pending local mutations so offline created/updated pets & appointments appear immediately
        for (const op of pendingOps) {
          if (op.operation === 'CREATE_PET' && op.payload) {
            const pet = { ...op.payload, _pendingSync: true };
            const exists = activePets.some((p) => p.id === pet.id);
            if (!exists) {
              activePets.unshift(pet);
            } else {
              activePets = activePets.map((p) => (p.id === pet.id ? pet : p));
            }
          } else if (op.operation === 'UPDATE_PET' && op.payload) {
            const updated = { ...op.payload, _pendingSync: true };
            activePets = activePets.map((p) => (p.id === updated.id ? updated : p));
          } else if (op.operation === 'DELETE_PET') {
            activePets = activePets.filter((p) => p.id !== op.entityId);
            activeAppts = activeAppts.filter((a) => a.petId !== op.entityId);
          } else if (op.operation === 'BOOK_APPOINTMENT' && op.payload) {
            const appt = { ...op.payload, _pendingSync: true };
            const exists = activeAppts.some((a) => a.id === appt.id);
            if (!exists) {
              activeAppts.push(appt);
            }
          } else if (op.operation === 'CANCEL_APPOINTMENT') {
            activeAppts = activeAppts.map((a) =>
              a.id === op.entityId ? { ...a, status: 'cancelled', _pendingSync: true } : a,
            );
          }
        }

        // Save reconciled state to local persistent cache
        await AsyncStorage.setItem(
          `syncvet.data.${ownerId}`,
          JSON.stringify({
            pets: activePets,
            appointments: activeAppts,
            transactions: activeTransactions,
            activity: activeTransactions,
          }),
        );

        set({
          pets: activePets,
          appointments: activeAppts,
          transactions: activeTransactions,
          activity: activeTransactions,
          loading: false,
          loaded: true,
          pendingCount: pendingOps.length,
          lastSyncedAt: syncEngine.getState().lastSyncedAt,
        });

        // Register session with sync engine for automatic background synchronization
        syncEngine.registerSession(ownerId, clerkUser);

        // Reconcile scheduled notifications for active resident
        reminderEngine.reconcile(activePets, activeAppts, undefined, ownerId).catch(() => {});

        if (clerkUser) {
          syncEngine.sync(ownerId, clerkUser).catch(() => {});
        }
      } catch (err) {
        console.warn('Data load error:', err);
        set({ loading: false, loaded: true, error: 'Could not load offline data.' });
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
      const currentAct = get().activity;
      await AsyncStorage.setItem(
        `syncvet.data.${ownerId}`,
        JSON.stringify({ pets: currentPets, appointments: currentAppts, activity: currentAct }),
      );

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
      const currentAct = get().activity;
      await AsyncStorage.setItem(
        `syncvet.data.${pet.ownerId}`,
        JSON.stringify({ pets: currentPets, appointments: currentAppts, activity: currentAct }),
      );

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
      const currentAct = get().activity;
      await AsyncStorage.setItem(
        `syncvet.data.${ownerId}`,
        JSON.stringify({ pets: currentPets, appointments: currentAppts, activity: currentAct }),
      );

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
      const currentAct = get().activity;
      await AsyncStorage.setItem(
        `syncvet.data.${ownerId}`,
        JSON.stringify({ pets: currentPets, appointments: currentAppts, activity: currentAct }),
      );

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
      const currentAct = get().activity;
      await AsyncStorage.setItem(
        `syncvet.data.${ownerId}`,
        JSON.stringify({ pets: currentPets, appointments: currentAppts, activity: currentAct }),
      );

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

    syncNow: async (ownerId, clerkUser) => {
      if (!ownerId) return;
      await syncEngine.sync(ownerId, clerkUser);
      await get().loadAll(ownerId, clerkUser);
    },
  };
});
