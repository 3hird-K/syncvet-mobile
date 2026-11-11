import { supabase } from '@lib/supabase';
import { todayISO } from '@lib/format';
import { useDataStore } from '@store/useDataStore';
import { queryClient, queryKeys } from '@lib/queryClient';
import type { Pet, Appointment } from '@services/data/types';

export type OutreachServiceType = 'vaccination' | 'consultation' | 'spay-neuter';

export interface OutreachDetails {
  opId: string;
  announcementId: string;
  title: string;
  barangay: string;
  venue: string;
  date: string;
  time: string;
  attendingVet: string;
  servicesOffered: OutreachServiceType[];
}

export interface OutreachQrPayload {
  valid: boolean;
  opId?: string;
  service?: OutreachServiceType;
  barangay?: string;
  vetName?: string;
  date?: string;
  token?: string;
  raw: string;
}

export interface RecordOutreachParams {
  pet: Pet;
  ownerId: string;
  ownerName: string;
  ownerPhone?: string;
  service: OutreachServiceType;
  outreachInfo: OutreachDetails;
}

export interface OutreachRecordResult {
  success: boolean;
  recordNo: string;
  pet: Pet;
  service: OutreachServiceType;
  serviceTitle: string;
  outreachInfo: OutreachDetails;
  administeredDate: string;
  nextDueDate?: string;
}

/**
 * Determines whether a given bulletin announcement represents an official CVO Outreach Visit / Field Operation.
 */
export function isOutreachAnnouncement(item: {
  title?: string;
  content?: string;
  category?: string;
  target_barangay?: string | null;
}): boolean {
  if (!item) return false;
  const title = (item.title || '').toLowerCase();
  const content = (item.content || '').toLowerCase();
  const category = (item.category || '').toLowerCase();

  return (
    title.includes('outreach') ||
    content.includes('[op_id:') ||
    content.includes('outreach visit') ||
    title.includes('field operation') ||
    (category === 'vaccination drive' &&
      Boolean(item.target_barangay) &&
      item.target_barangay !== 'All Cagayan de Oro')
  );
}

/**
 * Extracts structured outreach operation parameters from an announcement.
 */
export function parseOutreachDetails(item: {
  id: string;
  title: string;
  content: string;
  category: string;
  target_barangay: string | null;
}): OutreachDetails {
  const content = item.content || '';
  const title = item.title || '';

  // 1. Extract Operation ID: e.g. [OP_ID:FO-2026-004]
  const opIdMatch = content.match(/\[OP_ID:(FO-[^\]]+)\]/i);
  const opId = opIdMatch ? opIdMatch[1] : 'FO-2026';

  // 2. Extract Event Date: e.g. [EVENT_DATE:2026-11-09] or Date: Monday, November 9, 2026
  const eventDateMatch = content.match(/\[EVENT_DATE:([^\]]+)\]/i);
  let date = eventDateMatch ? eventDateMatch[1] : todayISO();

  // 3. Extract Barangay: from target_barangay or title/content
  let barangay = item.target_barangay || '';
  if (!barangay || barangay === 'All Cagayan de Oro') {
    const brgyMatch =
      title.match(/Brgy\.?\s+([A-Za-z\s]+)/i) ||
      content.match(/Barangay\s+([A-Za-z\s]+)/i);
    barangay = brgyMatch ? brgyMatch[1].trim() : 'Central District';
  }
  barangay = barangay.replace(/^Brgy\.?\s+/i, '').trim();

  // 4. Extract Venue
  const venueMatch = content.match(/Venue:\s*([^\n\r]+)/i);
  const venue = venueMatch ? venueMatch[1].trim() : `${barangay} Covered Court`;

  // 5. Extract Time
  const timeMatch = content.match(/Time:\s*([^\n\r]+)/i);
  const time = timeMatch ? timeMatch[1].trim() : '08:00 AM - 05:00 PM';

  // 6. Extract Attending Veterinarian
  const vetMatch = content.match(/Attending Veterinarian:\s*([^\n\r(]+)/i);
  const attendingVet = vetMatch
    ? vetMatch[1].trim()
    : 'Dr. Helen Ann P. Tacandong, DVM';

  // 7. Parse Services Offered
  const servicesOffered: OutreachServiceType[] = [];
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('anti-rabies') || lowerContent.includes('vaccin')) {
    servicesOffered.push('vaccination');
  }
  if (lowerContent.includes('consultation') || lowerContent.includes('triage') || lowerContent.includes('physical exam')) {
    servicesOffered.push('consultation');
  }
  if (lowerContent.includes('kapon') || lowerContent.includes('spay') || lowerContent.includes('neuter')) {
    servicesOffered.push('spay-neuter');
  }
  if (servicesOffered.length === 0) {
    servicesOffered.push('vaccination', 'consultation');
  }

  return {
    opId,
    announcementId: item.id,
    title,
    barangay,
    venue,
    date,
    time,
    attendingVet,
    servicesOffered,
  };
}

/**
 * Parses the QR code shown by the CVO admin / outreach station at the barangay venue.
 * Supports URL, JSON, and municipal token formats.
 */
export function parseOutreachAdminQr(raw: string): OutreachQrPayload {
  if (!raw) return { valid: false, raw: '' };
  const trimmed = raw.trim();

  try {
    // 1. Direct Web URL check
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const opId = url.searchParams.get('opId') || undefined;
      const serviceParam = url.searchParams.get('service') as OutreachServiceType | null;
      const barangay = url.searchParams.get('barangay') || undefined;
      const vetName = url.searchParams.get('vet') || undefined;
      const date = url.searchParams.get('date') || todayISO();
      const token = url.searchParams.get('token') || undefined;

      const service: OutreachServiceType | undefined =
        serviceParam === 'vaccination' ||
        serviceParam === 'consultation' ||
        serviceParam === 'spay-neuter'
          ? serviceParam
          : undefined;

      return {
        valid: true,
        opId,
        service,
        barangay,
        vetName,
        date,
        token,
        raw: trimmed,
      };
    }

    // 2. JSON check
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      const serviceParam = parsed.service as OutreachServiceType;
      const service: OutreachServiceType | undefined =
        serviceParam === 'vaccination' ||
        serviceParam === 'consultation' ||
        serviceParam === 'spay-neuter'
          ? serviceParam
          : undefined;

      return {
        valid: true,
        opId: parsed.opId || parsed.op_id,
        service,
        barangay: parsed.barangay,
        vetName: parsed.vet || parsed.vetName,
        date: parsed.date || todayISO(),
        token: parsed.token,
        raw: trimmed,
      };
    }

    // 3. Structured text token format: CVO-OUTREACH-LAPASAN-VAX
    if (trimmed.toUpperCase().includes('OUTREACH') || trimmed.toUpperCase().includes('CVO')) {
      const lower = trimmed.toLowerCase();
      const tokenService: OutreachServiceType | undefined = lower.includes('consult')
        ? 'consultation'
        : lower.includes('kapon') || lower.includes('spay') || lower.includes('neuter')
        ? 'spay-neuter'
        : lower.includes('vax') || lower.includes('vaccin') || lower.includes('rabies')
        ? 'vaccination'
        : undefined;

      return {
        valid: true,
        token: trimmed,
        service: tokenService,
        raw: trimmed,
      };
    }
  } catch {
    // ignore parse error
  }

  return {
    valid: false,
    raw: trimmed,
  };
}

/**
 * Calculates a one-year forward expiration date for annual anti-rabies immunity.
 */
function getOneYearNextDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const nextY = parseInt(parts[0], 10) + 1;
    return `${nextY}-${parts[1]}-${parts[2]}`;
  }
  return isoDate;
}

/**
 * Records that a resident's pet was consulted, vaccinated, or spayed/neutered
 * during an official CVO Barangay Outreach operation.
 * Synchronizes with Supabase and updates local Zustand caches.
 */
export async function recordOutreachService({
  pet,
  ownerId,
  ownerName,
  ownerPhone = '',
  service,
  outreachInfo,
}: RecordOutreachParams): Promise<OutreachRecordResult> {
  const today = todayISO();
  const nextDueDate = getOneYearNextDate(today);
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const recordNo = `VR-OUTREACH-${today.slice(0, 4)}-${randomSuffix}`;

  // 1. Prepare updated Pet fields
  const updatedPetFields: Partial<Pet> = {};
  if (service === 'vaccination') {
    updatedPetFields.isVaccinated = true;
    updatedPetFields.lastVaccinationDate = today;
    updatedPetFields.nextVaccinationDate = nextDueDate;
  } else if (service === 'spay-neuter') {
    updatedPetFields.isSpayedNeutered = true;
  }

  // 2. Update pet row in Supabase
  try {
    const petUpdatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (service === 'vaccination') {
      petUpdatePayload.is_vaccinated = true;
      petUpdatePayload.rabies_vaccinated = true;
      petUpdatePayload.last_vaccination_date = today;
      petUpdatePayload.next_vaccination_date = nextDueDate;
    } else if (service === 'spay-neuter') {
      petUpdatePayload.is_spayed_neutered = true;
    }

    await (supabase.from('pets') as any).update(petUpdatePayload).eq('id', pet.id);
  } catch (err) {
    console.warn('Outreach: Supabase pet update warning:', err);
  }

  // 3. If service is vaccination: insert into vaccination_records
  if (service === 'vaccination') {
    try {
      await supabase.from('vaccination_records').insert({
        record_no: recordNo,
        pet_id: pet.id,
        pet_name: pet.name,
        species: pet.species || 'dog',
        breed: pet.breed || null,
        owner_id: ownerId,
        owner_name: ownerName,
        owner_contact: ownerPhone,
        vaccine_name: 'Anti-Rabies Core Vaccine (CVO Outreach)',
        administered_date: today,
        next_due_date: nextDueDate,
        veterinarian: outreachInfo.attendingVet,
        barangay: outreachInfo.barangay,
        status: 'complete',
      });
    } catch (err) {
      console.warn('Outreach: Supabase vaccination_records insert warning:', err);
    }

    // Increment field_operations vaccinated count if matching operation exists
    if (outreachInfo.opId) {
      try {
        const { data: opData } = await supabase
          .from('field_operations')
          .select('id, vaccinated_pets')
          .eq('op_id', outreachInfo.opId)
          .maybeSingle();

        if (opData) {
          await (supabase.from('field_operations') as any)
            .update({
              vaccinated_pets: (opData.vaccinated_pets || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', opData.id);
        }
      } catch (err) {
        console.warn('Outreach: field_operations counter update warning:', err);
      }
    }
  }

  // 4. If service is consultation: insert into consultations
  if (service === 'consultation') {
    try {
      await supabase.from('consultations').insert({
        encounter_no: `ENC-OUTREACH-${randomSuffix}`,
        date: today,
        time: outreachInfo.time.split('-')[0]?.trim() || '09:00 AM',
        pet_id: pet.id,
        pet_name: pet.name,
        species: pet.species || 'dog',
        breed: pet.breed || null,
        owner_id: ownerId,
        owner_name: ownerName,
        owner_contact: ownerPhone,
        owner_barangay: outreachInfo.barangay,
        service_type: 'Community Outreach Clinical Evaluation',
        chief_complaint: 'Routine wellness physical exam & vitals check',
        symptoms: ['None (Routine Triage)'],
        diagnosis: 'Patient cleared healthy and fit for community registry',
        treatment: 'Physical examination completed at mobile outreach station',
        vet_name: outreachInfo.attendingVet,
        veterinarian_notes: `Barangay Outreach [${outreachInfo.opId}] at ${outreachInfo.venue}`,
        status: 'completed',
      });
    } catch (err) {
      console.warn('Outreach: Supabase consultations insert warning:', err);
    }
  }

  // 5. Record completed appointment so visit is immediately logged into History tab
  const appointmentId = `outreach-appt-${randomSuffix}`;
  const serviceName =
    service === 'vaccination'
      ? 'Anti-Rabies Core Vaccination'
      : service === 'spay-neuter'
      ? 'Spay & Neuter (Kapon Surgery)'
      : 'Clinical Examination & Wellness';

  const completedAppointment: Appointment = {
    id: appointmentId,
    ownerId,
    petId: pet.id,
    petName: pet.name,
    serviceId:
      service === 'spay-neuter'
        ? 'spay-neuter'
        : service === 'consultation'
        ? 'consultation'
        : 'vaccination',
    status: 'completed',
    date: today,
    timeSlot: outreachInfo.time || '08:00 AM - 05:00 PM',
    location: `Brgy. ${outreachInfo.barangay} Outreach Station`,
    notes: `Official CVO Barangay Outreach [${outreachInfo.opId}] at ${outreachInfo.venue}. Attended by ${outreachInfo.attendingVet}. [Record: ${recordNo}]`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await (supabase.from('appointments') as any).insert({
      id: appointmentId,
      owner_id: ownerId,
      pet_id: pet.id,
      pet_name: pet.name,
      service_id: completedAppointment.serviceId,
      status: 'completed',
      date: today,
      time_slot: completedAppointment.timeSlot,
      location: completedAppointment.location,
      notes: completedAppointment.notes,
    });
  } catch (err) {
    console.warn('Outreach: Supabase appointments insert warning:', err);
  }

  // 6. Update Zustand local caches and TanStack Query state
  const updatedPet: Pet = {
    ...pet,
    ...updatedPetFields,
    updatedAt: new Date().toISOString(),
  };

  useDataStore.setState((state) => ({
    pets: state.pets.map((p) => (p.id === updatedPet.id ? updatedPet : p)),
    appointments: [
      completedAppointment,
      ...state.appointments.filter((a) => a.id !== completedAppointment.id),
    ],
  }));

  // Update persistent query client cache
  if (ownerId) {
    queryClient.setQueryData<Pet[]>(queryKeys.pets(ownerId), (old = []) =>
      old.map((p) => (p.id === updatedPet.id ? updatedPet : p)),
    );
    queryClient.invalidateQueries({ queryKey: queryKeys.pets(ownerId) });

    queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) => [
      completedAppointment,
      ...old.filter((a) => a.id !== completedAppointment.id),
    ]);
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments(ownerId) });
  }

  return {
    success: true,
    recordNo,
    pet: updatedPet,
    service,
    serviceTitle: serviceName,
    outreachInfo,
    administeredDate: today,
    nextDueDate: service === 'vaccination' ? nextDueDate : undefined,
  };
}
