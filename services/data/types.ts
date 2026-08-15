export type Species = 'dog' | 'cat';

export type PetGender = 'male' | 'female';

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: Species;
  breed: string;
  gender: PetGender;
  /** Year of birth. Age is derived from the current year. */
  birthYear: number;
  isVaccinated?: boolean;
  isSpayedNeutered?: boolean;
  weightCategory?: string;
  notes?: string;
  avatarId?: string;
  photoUrl?: string;
  vaccinationDoses?: number;
  lastVaccinationDate?: string;
  nextVaccinationDate?: string;
  createdAt: string;
  updatedAt?: string;
  /** True when changes are queued locally and pending remote sync */
  _pendingSync?: boolean;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  ownerId: string;
  petId: string;
  petName: string;
  serviceId: string;
  status: AppointmentStatus;
  /** ISO date string, e.g. 2026-08-20 */
  date: string;
  /** Human display slot, e.g. "9:30 AM" */
  timeSlot: string;
  location: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  /** True when changes are queued locally and pending remote sync */
  _pendingSync?: boolean;
}

export interface BookingInput {
  petId: string;
  petName: string;
  serviceId: string;
  date: string;
  timeSlot: string;
  location: string;
  notes?: string;
}

export type ActivityType =
  | 'booking'
  | 'confirmed'
  | 'completed'
  | 'registration';

export interface ActivityItem {
  id: string;
  ownerId: string;
  type: ActivityType;
  title: string;
  detail?: string;
  /** ISO timestamp. */
  date: string;
  updatedAt?: string;
}

export type PetInput = Omit<Pet, 'id' | 'createdAt' | 'ownerId' | 'updatedAt' | '_pendingSync'>;
