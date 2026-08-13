import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DataService } from './DataService';
import type {
  ActivityItem,
  Appointment,
  BookingInput,
  Pet,
  PetInput,
} from './types';
import { addDays, toISODate } from '@lib/format';

interface OwnerData {
  pets: Pet[];
  appointments: Appointment[];
  activity: ActivityItem[];
}

function ownerKey(ownerId: string): string {
  return `syncvet.data.${ownerId}`;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function emptyOwnerData(): OwnerData {
  return { pets: [], appointments: [], activity: [] };
}

/**
 * Mock data layer for resident content. Persists per-owner records in
 * AsyncStorage and mimics network latency so the real backend can be swapped
 * in through the DataService interface.
 */
export class MockDataService implements DataService {
  async getPets(ownerId: string): Promise<Pet[]> {
    const data = await this.load(ownerId);
    return [...data.pets].sort((a, b) => a.name.localeCompare(b.name));
  }

  async addPet(ownerId: string, input: PetInput): Promise<Pet> {
    await delay(700);
    const data = await this.load(ownerId);
    const pet: Pet = {
      ...input,
      id: uid('pet'),
      ownerId,
      createdAt: new Date().toISOString(),
    };
    data.pets.push(pet);
    data.activity.unshift({
      id: uid('act'),
      ownerId,
      type: 'registration',
      title: `${pet.name} registered`,
      detail: `${titleCase(pet.species)} · ${pet.breed}`,
      date: new Date().toISOString(),
    });
    await this.save(ownerId, data);
    return pet;
  }

  async updatePet(pet: Pet): Promise<void> {
    const data = await this.load(pet.ownerId);
    const index = data.pets.findIndex((p) => p.id === pet.id);
    if (index >= 0) data.pets[index] = pet;
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
    await delay(900);
    const data = await this.load(ownerId);
    const appointment: Appointment = {
      ...input,
      id: uid('apt'),
      ownerId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    data.appointments.push(appointment);
    data.activity.unshift({
      id: uid('act'),
      ownerId,
      type: 'booking',
      title: 'Appointment request submitted',
      detail: `${appointment.petName} · ${serviceLabel(appointment.serviceId)}`,
      date: new Date().toISOString(),
    });
    await this.save(ownerId, data);
    return appointment;
  }

  async cancelAppointment(ownerId: string, appointmentId: string): Promise<void> {
    const data = await this.load(ownerId);
    const appointment = data.appointments.find((a) => a.id === appointmentId);
    if (appointment && appointment.status !== 'completed') {
      appointment.status = 'cancelled';
      data.activity.unshift({
        id: uid('act'),
        ownerId,
        type: 'booking',
        title: 'Appointment cancelled',
        detail: `${appointment.petName} · ${serviceLabel(appointment.serviceId)}`,
        date: new Date().toISOString(),
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
    data.activity.unshift({
      ...input,
      id: uid('act'),
      ownerId,
      date: new Date().toISOString(),
    });
    await this.save(ownerId, data);
  }

  private async load(ownerId: string): Promise<OwnerData> {
    const raw = await AsyncStorage.getItem(ownerKey(ownerId));
    if (raw) {
      try {
        return JSON.parse(raw) as OwnerData;
      } catch {
        // fall through
      }
    }
    const initial = emptyOwnerData();
    await this.save(ownerId, initial);
    return initial;
  }

  private async save(ownerId: string, data: OwnerData): Promise<void> {
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
