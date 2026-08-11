import type {
  ActivityItem,
  Appointment,
  BookingInput,
  Pet,
  PetInput,
} from './types';

/**
 * Contract for all resident data (pets, appointments, activity).
 * Mirrors the AuthService pattern: a mock implementation stands in until a
 * real Supabase-backed service is swapped in.
 */
export interface DataService {
  getPets(ownerId: string): Promise<Pet[]>;
  addPet(ownerId: string, input: PetInput): Promise<Pet>;
  updatePet(pet: Pet): Promise<void>;
  deletePet(ownerId: string, petId: string): Promise<void>;

  getAppointments(ownerId: string): Promise<Appointment[]>;
  bookAppointment(ownerId: string, input: BookingInput): Promise<Appointment>;
  cancelAppointment(ownerId: string, appointmentId: string): Promise<void>;

  getActivity(ownerId: string): Promise<ActivityItem[]>;
  logActivity(
    ownerId: string,
    input: Omit<ActivityItem, 'id' | 'ownerId' | 'date'>,
  ): Promise<void>;
}
