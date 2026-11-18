import { normalizeServiceId } from '@lib/services';
import { normalizeAppointmentStatus } from '@services/data/types';

export type ProcedureServiceId = 'vaccination' | 'spay-neuter';

export interface BookingAppointmentLike {
  id?: string;
  serviceId?: string | null;
  date?: string | null;
  status?: string | null;
  petId?: string | null;
  petName?: string | null;
}

interface SameDayQuery {
  appointments?: BookingAppointmentLike[] | null;
  petId?: string | null;
  petName?: string | null;
  date?: string | null;
  serviceId?: string | null;
}

export type SameDayConflictReason = 'procedure' | 'consultation';

export interface SameDayConflict {
  appointment: BookingAppointmentLike;
  reason: SameDayConflictReason;
}

const PROCEDURE_SERVICE_IDS: ProcedureServiceId[] = ['vaccination', 'spay-neuter'];

const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'missed', 'overdue']);

/** True for procedure bookings that share an operating day for safety reasons. */
export function isProcedureService(serviceId?: string | null): serviceId is ProcedureServiceId {
  const id = normalizeServiceId(serviceId);
  return PROCEDURE_SERVICE_IDS.includes(id as ProcedureServiceId);
}

function matchesPet(
  appointment: BookingAppointmentLike,
  petId?: string | null,
  petName?: string | null,
): boolean {
  if (petId && appointment.petId === petId) return true;
  const name = (petName || '').trim().toLowerCase();
  return Boolean(name) && (appointment.petName || '').trim().toLowerCase() === name;
}

function findSameDayAppointment(
  { appointments, petId, petName, date }: SameDayQuery,
  serviceId: string,
): BookingAppointmentLike | undefined {
  if (!date) return undefined;

  return (appointments || []).find((appointment) => {
    if (!appointment || appointment.date !== date) return false;
    if (TERMINAL_STATUSES.has(normalizeAppointmentStatus(appointment.status))) return false;
    if (normalizeServiceId(appointment.serviceId) !== serviceId) return false;
    return matchesPet(appointment, petId, petName);
  });
}

/**
 * Finds the opposing procedure already booked for the same pet on the same day.
 * Vaccination and spay/neuter must never share a day (anesthesia safety), even
 * when their time slots differ.
 */
export function findSameDayProcedureConflict(
  query: SameDayQuery,
): BookingAppointmentLike | undefined {
  const target = normalizeServiceId(query.serviceId);
  if (!isProcedureService(target) || !query.date) return undefined;

  const opposing: ProcedureServiceId = target === 'vaccination' ? 'spay-neuter' : 'vaccination';
  return findSameDayAppointment(query, opposing);
}

/** A pet can have only one consultation booking per day. */
export function findSameDayConsultationConflict(
  query: SameDayQuery,
): BookingAppointmentLike | undefined {
  if (normalizeServiceId(query.serviceId) !== 'consultation') return undefined;
  return findSameDayAppointment(query, 'consultation');
}

/** Combined guard used by the booking screens before writing a new appointment. */
export function findSameDayBookingConflict(query: SameDayQuery): SameDayConflict | undefined {
  const procedure = findSameDayProcedureConflict(query);
  if (procedure) return { appointment: procedure, reason: 'procedure' };

  const consultation = findSameDayConsultationConflict(query);
  if (consultation) return { appointment: consultation, reason: 'consultation' };

  return undefined;
}
