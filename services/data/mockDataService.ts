import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DataService } from './DataService';
import type {
  Appointment,
  BookingInput,
  Pet,
  PetInput,
  ServiceTransaction,
} from './types';

interface OwnerData {
  pets: Pet[];
  appointments: Appointment[];
  transactions: ServiceTransaction[];
}

function ownerKey(ownerId: string): string {
  return `syncvet.data.${ownerId}`;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function emptyOwnerData(): OwnerData {
  return { pets: [], appointments: [], transactions: [] };
}

/**
 * Local Data Service layer for resident content. Persists per-owner records in
 * AsyncStorage immediately for true offline-first performance and zero UI latency.
 */
export class MockDataService implements DataService {
  async getPets(ownerId: string): Promise<Pet[]> {
    const data = await this.load(ownerId);
    return [...data.pets].sort((a, b) => a.name.localeCompare(b.name));
  }

  async addPet(ownerId: string, input: PetInput): Promise<Pet> {
    const data = await this.load(ownerId);
    const now = new Date().toISOString();
    const pet: Pet = {
      ...input,
      id: (input as any).id || uid('pet'),
      ownerId,
      createdAt: (input as any).createdAt || now,
      updatedAt: now,
      _pendingSync: true,
    };
    data.pets = [pet, ...data.pets.filter((p) => p.id !== pet.id)];
    const txId = uid('txn');
    data.transactions.unshift({
      id: txId,
      transactionNo: `TXN-${Date.now().toString().slice(-6)}-REG`,
      ownerId,
      type: 'registration',
      title: `${pet.name} Registered`,
      detail: `${titleCase(pet.species)} · ${pet.breed}`,
      status: 'completed',
      referenceId: pet.id,
      date: now,
      createdAt: now,
    });
    await this.save(ownerId, data);
    return pet;
  }

  async updatePet(pet: Pet): Promise<void> {
    const data = await this.load(pet.ownerId);
    const now = new Date().toISOString();
    const updated: Pet = {
      ...pet,
      updatedAt: now,
    };
    const index = data.pets.findIndex((p) => p.id === pet.id);
    if (index >= 0) {
      data.pets[index] = updated;
    } else {
      data.pets.push(updated);
    }
    await this.save(pet.ownerId, data);
  }

  async deletePet(ownerId: string, petId: string): Promise<void> {
    const data = await this.load(ownerId);
    data.pets = data.pets.filter((p) => p.id !== petId);
    data.appointments = data.appointments.filter((a) => a.petId !== petId);
    await this.save(ownerId, data);
  }

  async getAppointments(ownerId: string): Promise<Appointment[]> {
    const data = await this.load(ownerId);
    return [...data.appointments].sort((a, b) => a.date.localeCompare(b.date));
  }

  async bookAppointment(
    ownerId: string,
    input: BookingInput,
  ): Promise<Appointment> {
    const data = await this.load(ownerId);
    const now = new Date().toISOString();
    const appointment: Appointment = {
      ...input,
      id: (input as any).id || uid('apt'),
      ownerId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      _pendingSync: true,
    };
    data.appointments.push(appointment);
    data.transactions.unshift({
      id: uid('txn'),
      transactionNo: `TXN-${Date.now().toString().slice(-6)}-APT`,
      ownerId,
      type: 'booking',
      title: 'Appointment Filed',
      detail: `${appointment.petName} · ${serviceLabel(appointment.serviceId)}`,
      status: 'pending',
      referenceId: appointment.id,
      date: now,
      createdAt: now,
    });
    await this.save(ownerId, data);
    return appointment;
  }

  async cancelAppointment(ownerId: string, appointmentId: string): Promise<void> {
    const data = await this.load(ownerId);
    const now = new Date().toISOString();
    const appointment = data.appointments.find((a) => a.id === appointmentId);
    if (appointment && appointment.status !== 'completed') {
      appointment.status = 'cancelled';
      appointment.updatedAt = now;
      data.transactions.unshift({
        id: uid('txn'),
        transactionNo: `TXN-${Date.now().toString().slice(-6)}-CAN`,
        ownerId,
        type: 'cancellation',
        title: 'Appointment Cancelled',
        detail: `${appointment.petName} · ${serviceLabel(appointment.serviceId)}`,
        status: 'cancelled',
        referenceId: appointmentId,
        date: now,
        createdAt: now,
      });
    }
    await this.save(ownerId, data);
  }

  async getTransactions(ownerId: string): Promise<ServiceTransaction[]> {
    const data = await this.load(ownerId);
    return [...(data.transactions || [])].sort((a, b) => b.date.localeCompare(a.date));
  }

  async logTransaction(
    ownerId: string,
    input: Omit<ServiceTransaction, 'id' | 'ownerId' | 'date' | 'createdAt' | 'transactionNo'> & {
      transactionNo?: string;
    },
  ): Promise<ServiceTransaction> {
    const data = await this.load(ownerId);
    const now = new Date().toISOString();
    const tx: ServiceTransaction = {
      ...input,
      id: uid('txn'),
      transactionNo: input.transactionNo || `TXN-${Date.now().toString().slice(-6)}-GEN`,
      ownerId,
      status: input.status || 'completed',
      date: now,
      createdAt: now,
    };
    data.transactions = data.transactions || [];
    data.transactions.unshift(tx);
    await this.save(ownerId, data);
    return tx;
  }

  // Backward compatibility
  async getActivity(ownerId: string): Promise<ServiceTransaction[]> {
    return this.getTransactions(ownerId);
  }

  async logActivity(
    ownerId: string,
    input: Omit<ServiceTransaction, 'id' | 'ownerId' | 'date' | 'createdAt' | 'transactionNo'>,
  ): Promise<void> {
    await this.logTransaction(ownerId, input);
  }

  public async load(ownerId: string): Promise<OwnerData> {
    if (!ownerId) return emptyOwnerData();
    try {
      const raw = await AsyncStorage.getItem(ownerKey(ownerId));
      if (raw) {
        return JSON.parse(raw) as OwnerData;
      }
    } catch {}
    const initial = emptyOwnerData();
    await this.save(ownerId, initial);
    return initial;
  }

  public async save(ownerId: string, data: OwnerData): Promise<void> {
    if (!ownerId) return;
    await AsyncStorage.setItem(ownerKey(ownerId), JSON.stringify(data));
  }
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function serviceLabel(serviceId: string): string {
  const labels: Record<string, string> = {
    consultation: 'Consultation',
    vaccination: 'Vaccination',
    'spay-neuter': 'Spay & Neuter',
  };
  return labels[serviceId] ?? 'Veterinary service';
}
