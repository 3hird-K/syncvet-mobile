import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDataService } from '@services/data';
import { syncEngine, syncQueue } from '@services/sync';
import type {
  ActivityItem,
  Appointment,
  BookingInput,
  Pet,
  PetInput,
} from '@services/data';

interface DataState {
  pets: Pet[];
  appointments: Appointment[];
  activity: ActivityItem[];
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
    activity: [],
    loading: false,
    loaded: false,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,

    reset: () => {
      set({
        pets: [],
        appointments: [],
        activity: [],
        loading: false,
        loaded: false,
        pendingCount: 0,
      });
    },

    loadAll: async (ownerId, clerkUser) => {
      if (!ownerId) return;

      try {
        let activePets: Pet[] = [];
        let activeAppts: Appointment[] = [];
        let activeActivity: ActivityItem[] = [];

        // 1. Remote Clerk Metadata
        const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
        const rawPets = Array.isArray(metadata.pets) ? metadata.pets : [];
        const rawAppts = Array.isArray(metadata.appointments) ? metadata.appointments : [];

        // 2. Local Persistent Cache
        const rawCache = await AsyncStorage.getItem(`syncvet.data.${ownerId}`);
        let cachedPets: Pet[] = [];
        let cachedAppts: Appointment[] = [];
        let cachedAct: ActivityItem[] = [];
        if (rawCache) {
          try {
            const parsed = JSON.parse(rawCache);
            cachedPets = parsed.pets || [];
            cachedAppts = parsed.appointments || [];
            cachedAct = parsed.activity || [];
          } catch {}
        }

        // 3. Pending Offline Queue Items
        const pendingOps = await syncQueue.getPending(ownerId);

        if (clerkUser && rawPets.length > 0) {
          activePets = rawPets.map((p: any, idx: number) => ({
            id: p.id || `pet-${idx}`,
            ownerId,
            name: p.name || 'My Pet',
            species: p.species || 'dog',
            breed: p.breed || '',
            gender: p.gender || 'male',
            birthYear: p.birthYear,
            isVaccinated: Boolean(p.isVaccinated),
            isSpayedNeutered: Boolean(p.isSpayedNeutered),
            weightCategory: p.weightCategory,
            notes: p.notes,
            avatarId: p.avatarId,
            photoUrl: p.photoUrl,
            vaccinationDoses: p.vaccinationDoses,
            lastVaccinationDate: p.lastVaccinationDate,
            nextVaccinationDate: p.nextVaccinationDate,
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString(),
          }));
        } else if (cachedPets.length > 0) {
          activePets = cachedPets;
        }

        if (clerkUser && rawAppts.length > 0) {
          activeAppts = rawAppts.map((a: any, idx: number) => ({
            id: a.id || `apt-${idx}`,
            ownerId,
            petId: a.petId || '',
            petName: a.petName || '',
            serviceId: a.serviceId || 'consultation',
            status: a.status || 'pending',
            date: a.date,
            timeSlot: a.timeSlot,
            location: a.location || 'City Veterinary Office',
            notes: a.notes,
            createdAt: a.createdAt || new Date().toISOString(),
            updatedAt: a.updatedAt || new Date().toISOString(),
          }));
        } else if (cachedAppts.length > 0) {
          activeAppts = cachedAppts;
        }

        activeActivity = cachedAct;

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
            activity: activeActivity,
          }),
        );

        set({
          pets: activePets,
          appointments: activeAppts,
          activity: activeActivity,
          loading: false,
          loaded: true,
          pendingCount: pendingOps.length,
          lastSyncedAt: syncEngine.getState().lastSyncedAt,
        });

        // Register session with sync engine for automatic background synchronization
        syncEngine.registerSession(ownerId, clerkUser);

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
      const pet: Pet = {
        ...input,
        id: (input as any).id || `pet-${Date.now()}`,
        ownerId,
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

      // Queue durable mutation
      await syncQueue.enqueue(ownerId, 'pet', pet.id, 'CREATE_PET', pet);
      const pendingCount = await syncQueue.getPendingCount(ownerId);
      set({ pendingCount });

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

      await syncQueue.enqueue(pet.ownerId, 'pet', pet.id, 'UPDATE_PET', updatedPet);
      const pendingCount = await syncQueue.getPendingCount(pet.ownerId);
      set({ pendingCount });

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

      await syncQueue.enqueue(ownerId, 'pet', petId, 'DELETE_PET', { id: petId });
      const pendingCount = await syncQueue.getPendingCount(ownerId);
      set({ pendingCount });

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

      await syncQueue.enqueue(ownerId, 'appointment', appointment.id, 'BOOK_APPOINTMENT', appointment);
      const pendingCount = await syncQueue.getPendingCount(ownerId);
      set({ pendingCount });

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

      await syncQueue.enqueue(ownerId, 'appointment', appointmentId, 'CANCEL_APPOINTMENT', { id: appointmentId });
      const pendingCount = await syncQueue.getPendingCount(ownerId);
      set({ pendingCount });

      syncEngine.sync(ownerId, clerkUser).catch(() => {});
    },

    syncNow: async (ownerId, clerkUser) => {
      if (!ownerId) return;
      await syncEngine.sync(ownerId, clerkUser);
      if (clerkUser) {
        await clerkUser.reload?.().catch(() => {});
        const metadata = (clerkUser.unsafeMetadata || {}) as Record<string, any>;
        const rawPets = Array.isArray(metadata.pets) ? metadata.pets : [];
        const rawAppts = Array.isArray(metadata.appointments) ? metadata.appointments : [];
        const pendingOps = await syncQueue.getPending(ownerId);

        let activePets = rawPets;
        let activeAppts = rawAppts;

        for (const op of pendingOps) {
          if (op.operation === 'CREATE_PET' && op.payload) {
            const pet = { ...op.payload, _pendingSync: true };
            if (!activePets.some((p) => p.id === pet.id)) {
              activePets.unshift(pet);
            }
          } else if (op.operation === 'UPDATE_PET' && op.payload) {
            const updated = { ...op.payload, _pendingSync: true };
            activePets = activePets.map((p) => (p.id === updated.id ? updated : p));
          } else if (op.operation === 'DELETE_PET') {
            activePets = activePets.filter((p) => p.id !== op.entityId);
            activeAppts = activeAppts.filter((a) => a.petId !== op.entityId);
          } else if (op.operation === 'BOOK_APPOINTMENT' && op.payload) {
            const appt = { ...op.payload, _pendingSync: true };
            if (!activeAppts.some((a) => a.id === appt.id)) {
              activeAppts.push(appt);
            }
          } else if (op.operation === 'CANCEL_APPOINTMENT') {
            activeAppts = activeAppts.map((a) =>
              a.id === op.entityId ? { ...a, status: 'cancelled', _pendingSync: true } : a,
            );
          }
        }

        set({
          pets: activePets,
          appointments: activeAppts,
        });
      }
    },
  };
});
