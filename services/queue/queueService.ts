import { supabase } from '@lib/supabase';
import { todayISO } from '@lib/format';
import type { Appointment, QueueTicketInfo } from '@services/data/types';

export interface ClinicQueueQrPayload {
  valid: boolean;
  date?: string;
  station?: string;
  token?: string;
  raw: string;
}

/**
 * Parses clinic check-in QR code payloads.
 * Supports web URL format:
 * https://veterinaryoffice-cdo.vercel.app/queue-checkin?date=2026-11-11&station=cvo-carmen&token=cvo-queue-2026-11-11
 * as well as JSON or plain text formats.
 */
export function parseClinicQueueQr(raw: string): ClinicQueueQrPayload {
  if (!raw) return { valid: false, raw: '' };
  const trimmed = raw.trim();

  try {
    // 1. Direct URL check
    if (trimmed.includes('queue-checkin') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const date = url.searchParams.get('date') || undefined;
      const station = url.searchParams.get('station') || undefined;
      const token = url.searchParams.get('token') || undefined;

      return {
        valid: Boolean(date),
        date,
        station: station === 'cvo-carmen' ? 'Carmen Central Clinic' : (station || 'Carmen Central Clinic'),
        token,
        raw: trimmed,
      };
    }

    // 2. JSON check
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.date || parsed.station) {
        return {
          valid: Boolean(parsed.date),
          date: parsed.date,
          station: parsed.station || 'Carmen Central Clinic',
          token: parsed.token,
          raw: trimmed,
        };
      }
    }
  } catch {
    // Ignore URL/JSON parse errors
  }

  return {
    valid: false,
    raw: trimmed,
  };
}

export type QueueEligibilityResult =
  | { eligible: true; alreadyQueued?: boolean; ticket?: QueueTicketInfo }
  | { eligible: false; reason: 'invalid_qr' | 'invalid_date' | 'overdue' | 'future' | 'completed' | 'cancelled'; message: string };

/**
 * Validates whether an appointment can be checked into the clinic queue with the scanned QR.
 */
export function validateCheckInEligibility(
  appointment: Appointment,
  qrPayload: ClinicQueueQrPayload,
): QueueEligibilityResult {
  if (!qrPayload.valid || !qrPayload.date) {
    return {
      eligible: false,
      reason: 'invalid_qr',
      message: 'This QR code is not a valid Clinic Queue Check-in station.',
    };
  }

  const today = todayISO();
  const qrDate = qrPayload.date;

  // The QR is only valid for today's clinic schedule
  if (qrDate !== today) {
    return {
      eligible: false,
      reason: 'invalid_date',
      message: `This Check-in QR is dated ${qrDate}. It is only valid for clinic hours today (${today}).`,
    };
  }

  if (appointment.status === 'completed') {
    return {
      eligible: false,
      reason: 'completed',
      message: `The visit for ${appointment.petName} has already been completed.`,
    };
  }

  if (appointment.status === 'cancelled') {
    return {
      eligible: false,
      reason: 'cancelled',
      message: `This appointment was cancelled and cannot be queued.`,
    };
  }

  // If already queued
  if (appointment.status === 'queued' || appointment.status === 'checked_in') {
    return {
      eligible: true,
      alreadyQueued: true,
      ticket: appointment.queueTicket,
    };
  }

  // Compare scheduled appointment date with QR date
  if (appointment.date < qrDate) {
    return {
      eligible: false,
      reason: 'overdue',
      message: `This appointment was scheduled for ${appointment.date} and was not attended on that day. Status is now Overdue.`,
    };
  }

  if (appointment.date > qrDate) {
    return {
      eligible: false,
      reason: 'future',
      message: `Your appointment is scheduled for ${appointment.date}. Clinic check-in opens on your scheduled visit day.`,
    };
  }

  return { eligible: true };
}

export interface CheckInAppointmentParams {
  appointment: Appointment;
  stationName?: string;
  user?: any;
  pet?: any;
}

/**
 * Registers an appointment into the Supabase queue_tickets table and updates the appointment status.
 */
export async function checkInAppointmentToQueue({
  appointment,
  stationName = 'Carmen Central Clinic',
  user,
  pet,
}: CheckInAppointmentParams): Promise<QueueTicketInfo> {
  const today = appointment.date || todayISO();

  // 1. Determine next sequence number for today from queue_tickets
  let nextSequence = 1;
  try {
    const { count, error } = await supabase
      .from('queue_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    if (!error && typeof count === 'number') {
      nextSequence = count + 1;
    }
  } catch (err) {
    console.warn('Error counting queue tickets:', err);
  }

  const ticketNumber = `Q-${String(nextSequence).padStart(3, '0')}`;
  const now = new Date();
  const checkInTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const encounterNo = `ENC-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const serviceTitle =
    appointment.serviceId === 'vaccination'
      ? 'Anti-Rabies Immunization & Health Check'
      : appointment.serviceId === 'spay-neuter'
      ? 'Spay & Neuter (Kapon) Surgery'
      : 'Clinical Consultation & Treatment';

  const ticketInfo: QueueTicketInfo = {
    id: ticketId,
    ticketNumber,
    queueSequence: nextSequence,
    status: 'waiting',
    consultationRoom: 'Consultation Desk 1',
    servingVet: 'Dr. Helen Ann P. Tacandong, DVM',
    checkInTime,
  };

  // 2. Insert into queue_tickets table in Supabase
  try {
    const { error: insertErr } = await supabase.from('queue_tickets').insert({
      id: ticketId,
      date: today,
      ticket_number: ticketNumber,
      queue_sequence: nextSequence,
      appointment_id: appointment.id,
      encounter_no: encounterNo,
      owner_id: user?.id || appointment.ownerId || null,
      owner_name: user?.fullName || 'Resident Owner',
      owner_contact: user?.primaryPhoneNumber?.phoneNumber || user?.phone || null,
      owner_barangay: 'Carmen',
      pet_id: appointment.petId || null,
      pet_name: appointment.petName,
      pet_photo_url: pet?.photoUrl || null,
      species: pet?.species ? (pet.species === 'cat' ? 'Cat' : 'Dog') : 'Companion',
      breed: pet?.breed || 'Domestic Companion',
      service_id: appointment.serviceId,
      service_title: serviceTitle,
      status: 'waiting',
      serving_vet: 'Dr. Helen Ann P. Tacandong, DVM',
      consultation_room: 'Consultation Desk 1',
      check_in_time: checkInTime,
      checked_in_at: now.toISOString(),
      checked_in_via: 'qr',
      notes: `[Checked in: Ticket ${ticketNumber}]`,
    });

    if (insertErr) {
      console.warn('Queue ticket insert error in Supabase:', insertErr.message);
    }
  } catch (err) {
    console.warn('Queue ticket insert exception:', err);
  }

  // 3. Update appointments table in Supabase
  try {
    const appendedNotes = appointment.notes
      ? `${appointment.notes} | [Checked in: Ticket ${ticketNumber}]`
      : `[Checked in: Ticket ${ticketNumber}]`;

    const { error: apptErr } = await supabase
      .from('appointments')
      .update({
        status: 'queued',
        notes: appendedNotes,
        updated_at: now.toISOString(),
      })
      .eq('id', appointment.id);

    if (apptErr) {
      console.warn('Appointment status update error:', apptErr.message);
    }
  } catch (err) {
    console.warn('Appointment status update exception:', err);
  }

  return ticketInfo;
}

/**
 * Marks an appointment as overdue in Supabase when its scheduled date has passed.
 */
export async function markAppointmentOverdue(appointmentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'overdue',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (error) {
      console.warn('Error marking appointment overdue:', error.message);
    }
  } catch (err) {
    console.warn('Exception marking appointment overdue:', err);
  }
}

/**
 * Marks an appointment and its queue ticket as completed, moving it into visit history.
 */
export async function completeQueueAppointment(
  appointmentId: string,
  ticketNumber?: string,
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await supabase
      .from('appointments')
      .update({
        status: 'completed',
        updated_at: now,
      })
      .eq('id', appointmentId);

    if (ticketNumber) {
      await supabase
        .from('queue_tickets')
        .update({
          status: 'completed',
          completed_at: now,
          updated_at: now,
        })
        .eq('ticket_number', ticketNumber);
    }
  } catch (err) {
    console.warn('Error completing appointment in Supabase:', err);
  }
}

/**
 * Updates status of queue ticket to 'called' in Supabase.
 */
export async function callQueueAppointment(
  appointmentId: string,
  ticketNumber?: string,
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await supabase
      .from('appointments')
      .update({
        status: 'called',
        updated_at: now,
      })
      .eq('id', appointmentId);

    if (ticketNumber) {
      await supabase
        .from('queue_tickets')
        .update({
          status: 'called',
          called_at: now,
          updated_at: now,
        })
        .eq('ticket_number', ticketNumber);
    }
  } catch (err) {
    console.warn('Error calling appointment in Supabase:', err);
  }
}

