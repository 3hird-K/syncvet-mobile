import { create } from 'zustand';

import { getDataService } from '@services/data';
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
  error?: string;
  loadAll: (ownerId: string) => Promise<void>;
  addPet: (ownerId: string, input: PetInput) => Promise<Pet>;
  updatePet: (pet: Pet) => Promise<void>;
  deletePet: (ownerId: string, petId: string) => Promise<void>;
  bookAppointment: (ownerId: string, input: BookingInput) => Promise<Appointment>;
  cancelAppointment: (ownerId: string, appointmentId: string) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  pets: [],
  appointments: [],
  activity: [],
  loading: false,
  loaded: false,

  loadAll: async (ownerId) => {
    if (get().loading || get().loaded) return;
    set({ loading: true, error: undefined });
    try {
      const service = getDataService();
      const [pets, appointments, activity] = await Promise.all([
        service.getPets(ownerId),
        service.getAppointments(ownerId),
        service.getActivity(ownerId),
      ]);
      set({ pets, appointments, activity, loading: false, loaded: true });
    } catch {
      set({ loading: false, error: 'Something went wrong while loading your data.' });
    }
  },

  addPet: async (ownerId, input) => {
    const pet = await getDataService().addPet(ownerId, input);
    set((state) => ({ pets: [...state.pets, pet] }));
    return pet;
  },

  updatePet: async (pet) => {
    await getDataService().updatePet(pet);
    set((state) => ({
      pets: state.pets.map((p) => (p.id === pet.id ? pet : p)),
    }));
  },

  deletePet: async (ownerId, petId) => {
    await getDataService().deletePet(ownerId, petId);
    set((state) => ({
      pets: state.pets.filter((p) => p.id !== petId),
      appointments: state.appointments.filter((a) => a.petId !== petId),
    }));
  },

  bookAppointment: async (ownerId, input) => {
    const appointment = await getDataService().bookAppointment(ownerId, input);
    set((state) => ({ appointments: [...state.appointments, appointment] }));
    return appointment;
  },

  cancelAppointment: async (ownerId, appointmentId) => {
    await getDataService().cancelAppointment(ownerId, appointmentId);
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === appointmentId ? { ...a, status: 'cancelled' } : a,
      ),
    }));
  },
}));
