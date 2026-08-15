import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DataService } from './DataService';
import type {
  ActivityItem,
  Appointment,
  BookingInput,
  Pet,
  PetInput,
} from './types';

interface OwnerData {
  pets: Pet[];
  appointments: Appointment[];
  activity: ActivityItem[];
}

function ownerKey(ownerId: string): string {
  return `syncvet.data.${ownerId}`;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function emptyOwnerData(): OwnerData {
  return { pets: [], appointments: [], activity: [] };
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
    data.activity.unshift({
      id: uid('act'),
      ownerId,
      type: 'registration',
      title: `${pet.name} registered`,
      detail: `${titleCase(pet.species)} · ${pet.breed}`,
      date: now,
      updatedAt: now,
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
    data.activity.unshift({
      id: uid('act'),
      ownerId,
      type: 'booking',
      title: 'Appointment request submitted',
      detail: `${appointment.petName} · ${serviceLabel(appointment.serviceId)}`,
      date: now,
      updatedAt: now,
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
      data.activity.unshift({
        id: uid('act'),
        ownerId,
        type: 'booking',
        title: 'Appointment cancelled',
        detail: `${appointment.petName} · ${serviceLabel(appointment.serviceId)}`,
        date: now,
        updatedAt: now,
      });
    }
    await this.save(ownerId, data);
  }

  async getActivity(ownerId: string): Promise<ActivityItem[]> {
    const data = await this.load(ownerId);
    return [...data.activity].sort((a, b) => b.date.localeCompare(a.date));
  }

  async logActivity(
    ownerId: string,
    input: Omit<ActivityItem, 'id' | 'ownerId' | 'date'>,
  ): Promise<void> {
    const data = await this.load(ownerId);
    const now = new Date().toISOString();
    data.activity.unshift({
      ...input,
      id: uid('act'),
      ownerId,
      date: now,
      updatedAt: now,
    });
    await this.save(ownerId, data);
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
    'spay-neuter': 'Spay / Neuter',
    deworming: 'Deworming',
    'pet-registration': 'Pet Registration',
    other: 'City Veterinary Service',
  };
  return labels[serviceId] ?? 'Veterinary service';
}
