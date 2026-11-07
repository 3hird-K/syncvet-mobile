import type {
  ActivityItem,
  Appointment,
  BookingInput,
  Pet,
  PetInput,
  ServiceTransaction,
} from './types';

/**
 * Contract for all resident data (pets, appointments, activity).
 * Mirrors the AuthService pattern: a mock implementation stands in until a
 * real Supabase-backed service is swapped in.
 */
export interface DataService {
  getPets(ownerId: string): Promise<Pet[]>;
  getPetById?(petId: string): Promise<Pet | null>;
  getUserById?(userId: string): Promise<any | null>;
  addPet(ownerId: string, input: PetInput): Promise<Pet>;
  updatePet(pet: Pet): Promise<void>;
  deletePet(ownerId: string, petId: string): Promise<void>;

  getAppointments(ownerId: string): Promise<Appointment[]>;
  bookAppointment(ownerId: string, input: BookingInput): Promise<Appointment>;
  cancelAppointment(ownerId: string, appointmentId: string): Promise<void>;

  getTransactions(ownerId: string): Promise<ServiceTransaction[]>;
  logTransaction(
    ownerId: string,
    input: Omit<ServiceTransaction, 'id' | 'ownerId' | 'date' | 'createdAt' | 'transactionNo'> & {
      transactionNo?: string;
    },
  ): Promise<ServiceTransaction>;

  // Backward compatibility
  getActivity(ownerId: string): Promise<ServiceTransaction[]>;
  logActivity(
    ownerId: string,
    input: Omit<ServiceTransaction, 'id' | 'ownerId' | 'date' | 'createdAt' | 'transactionNo'>,
  ): Promise<void>;
}
