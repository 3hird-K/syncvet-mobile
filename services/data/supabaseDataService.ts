import { supabase } from '@lib/supabase';
import type { DataService } from './DataService';
import type {
  Appointment,
  BookingInput,
  Pet,
  PetInput,
  ServiceTransaction,
} from './types';

export function toPetModel(row: any): Pet {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    species: (row.species?.toLowerCase() === 'cat' ? 'cat' : 'dog') as any,
    breed: row.breed || '',
    gender: (row.gender || 'male') as any,
    birthYear: row.birth_year ?? new Date().getFullYear(),
    isVaccinated: Boolean(row.is_vaccinated),
    isSpayedNeutered: Boolean(row.is_spayed_neutered),
    weightCategory: row.weight_category || undefined,
    notes: row.notes || undefined,
    avatarId: row.avatar_id || undefined,
    photoUrl: row.photo_url || undefined,
    vaccinationDoses: row.vaccination_doses ?? 0,
    lastVaccinationDate: row.last_vaccination_date || undefined,
    nextVaccinationDate: row.next_vaccination_date || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAppointmentModel(row: any): Appointment {
  const petName = row.pets?.name || row.pet_name || 'Companion';
  return {
    id: row.id,
    ownerId: row.owner_id,
    petId: row.pet_id || '',
    petName,
    serviceId: row.service_id,
    status: (row.status || 'pending') as any,
    date: row.date,
    timeSlot: row.time_slot,
    location: row.location || 'City Veterinary Office Main Clinic',
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTransactionModel(row: any): ServiceTransaction {
  return {
    id: row.id,
    transactionNo: row.transaction_no || `TXN-${row.id?.slice(-6)?.toUpperCase() || 'REF'}`,
    ownerId: row.owner_id,
    type: (row.transaction_type || row.type || 'booking') as any,
    title: row.title,
    detail: row.detail || undefined,
    status: (row.status || 'completed') as any,
    referenceId: row.reference_id || undefined,
    date: row.date || row.created_at,
    createdAt: row.created_at,
  };
}

// Backward compatibility alias
export const toActivityModel = toTransactionModel;

export class SupabaseDataService implements DataService {
  async getPets(ownerId: string): Promise<Pet[]> {
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching pets from Supabase:', error.message);
      return [];
    }
    return (data || []).map(toPetModel);
  }

  /**
   * Ensures a valid resident row exists in `public.users` before inserting
   * child rows that have a foreign key reference (`owner_id -> users.id`).
   */
  private async ensureUserExists(ownerId: string): Promise<void> {
    if (!ownerId) return;
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', ownerId)
        .maybeSingle();

      if (!existingUser) {
        await supabase
          .from('users')
          .upsert(
            {
              id: ownerId,
              email: `${ownerId}@resident.syncvet.app`,
              full_name: 'Resident',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' },
          );
      }
    } catch (err: any) {
      console.warn('ensureUserExists note:', err?.message);
    }
  }

  async addPet(ownerId: string, input: PetInput): Promise<Pet> {
    await this.ensureUserExists(ownerId);
    const now = new Date().toISOString();
    const id = (input as any).id || `pet_${Date.now()}`;

    const { data, error } = await supabase
      .from('pets')
      .insert({
        id,
        owner_id: ownerId,
        name: input.name,
        species: input.species,
        breed: input.breed || null,
        gender: input.gender || 'male',
        birth_year: input.birthYear,
        is_vaccinated: Boolean(input.isVaccinated),
        is_spayed_neutered: Boolean(input.isSpayedNeutered),
        weight_category: input.weightCategory || null,
        notes: input.notes || null,
        avatar_id: input.avatarId || null,
        photo_url: input.photoUrl || null,
        vaccination_doses: input.vaccinationDoses ?? 0,
        last_vaccination_date: input.lastVaccinationDate || null,
        next_vaccination_date: input.nextVaccinationDate || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding pet to Supabase:', error.message);
      throw error;
    }

    const pet = toPetModel(data);

    // Auto-log official pet registration transaction
    try {
      await this.logTransaction(ownerId, {
        type: 'registration',
        title: `${pet.name} Registered`,
        detail: `${pet.species === 'cat' ? 'Cat' : 'Dog'}${pet.breed ? ` · ${pet.breed}` : ''}`,
        status: 'completed',
        referenceId: pet.id,
      });
    } catch (txErr: any) {
      console.warn('Note logging pet registration transaction:', txErr?.message);
    }

    return pet;
  }

  async updatePet(pet: Pet): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('pets')
      .update({
        name: pet.name,
        species: pet.species,
        breed: pet.breed || null,
        gender: pet.gender,
        birth_year: pet.birthYear,
        is_vaccinated: Boolean(pet.isVaccinated),
        is_spayed_neutered: Boolean(pet.isSpayedNeutered),
        weight_category: pet.weightCategory || null,
        notes: pet.notes || null,
        avatar_id: pet.avatarId || null,
        photo_url: pet.photoUrl || null,
        vaccination_doses: pet.vaccinationDoses ?? 0,
        last_vaccination_date: pet.lastVaccinationDate || null,
        next_vaccination_date: pet.nextVaccinationDate || null,
        updated_at: now,
      })
      .eq('id', pet.id);

    if (error) {
      console.error('Error updating pet in Supabase:', error.message);
      throw error;
    }
  }

  async deletePet(ownerId: string, petId: string): Promise<void> {
    // 1. Delete associated appointments in Supabase (immediate guarantee alongside SQL ON DELETE CASCADE)
    try {
      await supabase
        .from('appointments')
        .delete()
        .eq('pet_id', petId)
        .eq('owner_id', ownerId);
    } catch (apptErr: any) {
      console.warn('Note deleting pet appointments before pet deletion:', apptErr?.message);
    }

    // 2. Delete pet record from Supabase
    const { error } = await supabase
      .from('pets')
      .delete()
      .eq('id', petId)
      .eq('owner_id', ownerId);

    if (error) {
      console.error('Error deleting pet from Supabase:', error.message);
      throw error;
    }
  }

  async getAppointments(ownerId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, pets(id, name, species, breed, avatar_id, photo_url)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching appointments with pets join from Supabase:', error.message);
      // Fallback query if join has any syntax difference
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('appointments')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (fallbackError) {
        console.warn('Error fetching fallback appointments from Supabase:', fallbackError.message);
        return [];
      }
      return (fallbackData || []).map(toAppointmentModel);
    }
    return (data || []).map(toAppointmentModel);
  }

  /**
   * Fetch a pet record directly by pet ID
   */
  async getPetById(petId: string): Promise<Pet | null> {
    if (!petId) return null;
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', petId)
      .maybeSingle();

    if (error || !data) return null;
    return toPetModel(data);
  }

  /**
   * Fetch a user profile record directly by user ID
   */
  async getUserById(userId: string): Promise<any | null> {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  async bookAppointment(ownerId: string, input: BookingInput): Promise<Appointment> {
    await this.ensureUserExists(ownerId);
    const now = new Date().toISOString();
    const id = `apt_${Date.now()}`;

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        id,
        owner_id: ownerId,
        pet_id: input.petId || null,
        pet_name: input.petName,
        service_id: input.serviceId,
        status: 'pending',
        date: input.date,
        time_slot: input.timeSlot,
        location: input.location || 'City Veterinary Office Main Clinic',
        notes: input.notes || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('Error booking appointment in Supabase:', error.message);
      throw error;
    }

    const appt = toAppointmentModel(data);

    // Auto-log official service transaction
    try {
      await this.logTransaction(ownerId, {
        type: 'booking',
        title: `Appointment Filed: ${appt.petName}`,
        detail: `${appt.date} at ${appt.timeSlot}`,
        status: 'pending',
        referenceId: appt.id,
      });
    } catch (txErr: any) {
      console.warn('Note logging appointment booking transaction:', txErr?.message);
    }

    return appt;
  }

  async cancelAppointment(ownerId: string, appointmentId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .eq('id', appointmentId)
      .eq('owner_id', ownerId);

    if (error) {
      console.error('Error cancelling appointment in Supabase:', error.message);
      throw error;
    }

    // Auto-log cancellation transaction
    try {
      await this.logTransaction(ownerId, {
        type: 'cancellation',
        title: 'Appointment Cancelled',
        detail: `Reference: ${appointmentId}`,
        status: 'cancelled',
        referenceId: appointmentId,
      });
    } catch (txErr: any) {
      console.warn('Note logging cancellation transaction:', txErr?.message);
    }
  }

  async getTransactions(ownerId: string): Promise<ServiceTransaction[]> {
    const { data, error } = await supabase
      .from('service_transactions')
      .select('*')
      .eq('owner_id', ownerId)
      .order('date', { ascending: false });

    if (error) {
      console.warn('Error fetching transactions from Supabase:', error.message);
      return [];
    }
    return (data || []).map(toTransactionModel);
  }

  async logTransaction(
    ownerId: string,
    input: Omit<ServiceTransaction, 'id' | 'ownerId' | 'date' | 'createdAt' | 'transactionNo'> & {
      transactionNo?: string;
    },
  ): Promise<ServiceTransaction> {
    const now = new Date().toISOString();
    const id = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const dateStamp = now.slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const transactionNo = input.transactionNo || `TXN-${dateStamp}-${randomHex}`;

    // Verify user exists in public.users before attempting remote insert to avoid RLS error
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', ownerId)
      .maybeSingle();

    if (!userExists) {
      return {
        id,
        transactionNo,
        ownerId,
        type: input.type,
        title: input.title,
        detail: input.detail,
        status: input.status || 'completed',
        referenceId: input.referenceId,
        date: now,
        createdAt: now,
      };
    }

    const { data, error } = await supabase
      .from('service_transactions')
      .insert({
        id,
        transaction_no: transactionNo,
        owner_id: ownerId,
        transaction_type: input.type,
        title: input.title,
        detail: input.detail || null,
        status: input.status || 'completed',
        reference_id: input.referenceId || null,
        date: now,
        created_at: now,
      })
      .select()
      .single();

    if (error) {
      console.warn('Error logging service transaction to Supabase:', error.message);
      return {
        id,
        transactionNo,
        ownerId,
        type: input.type,
        title: input.title,
        detail: input.detail,
        status: input.status || 'completed',
        referenceId: input.referenceId,
        date: now,
        createdAt: now,
      };
    }

    return toTransactionModel(data);
  }

  // Backward-compatible methods
  async getActivity(ownerId: string): Promise<ServiceTransaction[]> {
    return this.getTransactions(ownerId);
  }

  async logActivity(
    ownerId: string,
    input: Omit<ServiceTransaction, 'id' | 'ownerId' | 'date' | 'createdAt' | 'transactionNo'>,
  ): Promise<void> {
    await this.logTransaction(ownerId, input);
  }
}
