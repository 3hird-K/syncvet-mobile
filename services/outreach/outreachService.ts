import { supabase } from '@lib/supabase';
import { todayISO } from '@lib/format';
import { useDataStore } from '@store/useDataStore';
import { queryClient, queryKeys } from '@lib/queryClient';
import type { Pet, Appointment } from '@services/data/types';

export type OutreachServiceType = 'vaccination' | 'consultation' | 'spay-neuter';

export type OutreachAvailabilityStatus = 'active_today' | 'upcoming' | 'expired';

export interface FieldOperationRecord {
  id: string;
  op_id: string;
  barangay: string;
  scheduled_date: string;
  status: string;
  notes?: string | null;
  lead?: string | null;
}

export interface OutreachDetails {
  opId: string;
  announcementId: string;
  title: string;
  barangay: string;
  venue: string;
  date: string;
  expiresDate?: string;
  time: string;
  attendingVet: string;
  servicesOffered: OutreachServiceType[];
  operationStatus?: string;
  availability: OutreachAvailabilityStatus;
  canScanQr: boolean;
}

export interface OutreachQrPayload {
  valid: boolean;
  isOutreachQr: boolean;
  opId?: string;
  announcementId?: string;
  service?: OutreachServiceType;
  barangay?: string;
  vetName?: string;
  date?: string;
  token?: string;
  raw: string;
}

export type OutreachValidationResult =
  | { valid: true; payload: OutreachQrPayload; service: OutreachServiceType }
  | { valid: false; message: string };

const MONTHS: Record<string, string> = {
  january: '01', jan: '01',
  february: '02', feb: '02',
  march: '03', mar: '03',
  april: '04', apr: '04',
  may: '05',
  june: '06', jun: '06',
  july: '07', jul: '07',
  august: '08', aug: '08',
  september: '09', sep: '09', sept: '09',
  october: '10', oct: '10',
  november: '11', nov: '11',
  december: '12', dec: '12',
};

/**
 * Parses ISO (YYYY-MM-DD) or human date strings (e.g. "Monday, November 9, 2026")
 * into timezone-safe ISO YYYY-MM-DD format.
 */
export function parseHumanDateToISO(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const isoMatch = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const textMatch = trimmed.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (textMatch) {
    const month = MONTHS[textMatch[1].toLowerCase()];
    if (month) {
      const day = textMatch[2].padStart(2, '0');
      return `${textMatch[3]}-${month}-${day}`;
    }
  }
  return null;
}

/**
 * Computes whether QR scanning is open for an outreach event based on its scheduled date,
 * expiration tag, and field operation status.
 */
export function getOutreachAvailability(
  eventDate: string,
  operationStatus?: string,
  expiresDate?: string,
): { availability: OutreachAvailabilityStatus; canScanQr: boolean } {
  const today = todayISO();
  const normStatus = (operationStatus || '').toLowerCase().trim();

  if (normStatus === 'completed' || normStatus === 'cancelled' || normStatus === 'expired') {
    return { availability: 'expired', canScanQr: false };
  }

  if (expiresDate && expiresDate < today) {
    return { availability: 'expired', canScanQr: false };
  }

  if (!eventDate || eventDate < today) {
    return { availability: 'expired', canScanQr: false };
  }

  if (eventDate > today) {
    return { availability: 'upcoming', canScanQr: false };
  }

  return { availability: 'active_today', canScanQr: true };
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
 * Helper to extract an outreach op_id token from announcement content.
 */
  export function extractOutreachOpId(content?: string): string | null {
    if (!content) return null;
    const match =
      content.match(/\[OP_ID:(FO-[^\]]+)\]/i) ||
      content.match(/\b(FO-\d{4}-\d+[A-Z0-9-]*)\b/i);
    return match ? match[1].toUpperCase().trim() : null;
  }

  /**
   * Extracts structured outreach operation parameters from an announcement and optional field operation record.
   */
  export function parseOutreachDetails(
    item: {
      id: string;
      title: string;
      content: string;
      category: string;
      target_barangay: string | null;
      created_at?: string;
    },
    fieldOp?: FieldOperationRecord | null,
  ): OutreachDetails {
    const content = item.content || '';
    const title = item.title || '';

    // Parse optional JSON metadata from field_operations.notes
    let fieldMeta: any = null;
    if (fieldOp?.notes && fieldOp.notes.includes('__CVO_FIELD_META__:')) {
      try {
        const jsonPart = fieldOp.notes.split('__CVO_FIELD_META__:')[1];
        fieldMeta = JSON.parse(jsonPart);
      } catch {
        // ignore invalid meta JSON
      }
    }

    // 1. Extract Operation ID: e.g. [OP_ID:FO-2026-004]
    const opId = fieldOp?.op_id?.trim() || extractOutreachOpId(content) || 'FO-2026';

    // 2. Extract Event Date (authoritative: fieldOp.scheduled_date > [EVENT_DATE:...] > Date: line > created_at)
    const eventDateMatch = content.match(/\[EVENT_DATE:([^\]]+)\]/i);
    const humanDateMatch = content.match(/Date:\s*([^\n\r]+)/i);
    const expiresMatch = content.match(/\[EXPIRES:([^\]]+)\]/i);

    const date =
      parseHumanDateToISO(fieldOp?.scheduled_date) ||
      parseHumanDateToISO(eventDateMatch?.[1]) ||
      parseHumanDateToISO(humanDateMatch?.[1]) ||
      parseHumanDateToISO(item.created_at) ||
      todayISO();

    const expiresDate = parseHumanDateToISO(expiresMatch?.[1]) || undefined;

    // 3. Extract Barangay: from fieldOp, target_barangay, or title/content
    let barangay = fieldOp?.barangay || item.target_barangay || '';
    if (!barangay || barangay === 'All Cagayan de Oro') {
      const brgyMatch =
        title.match(/Brgy\.?\s+([A-Za-z\s]+)/i) ||
        content.match(/Barangay\s+([A-Za-z\s]+)/i);
      barangay = brgyMatch ? brgyMatch[1].trim() : 'Central District';
    }
    barangay = barangay.replace(/^(Brgy\.?|Barangay)\s+/i, '').trim();

    // 4. Extract Venue
    const venueMatch = content.match(/Venue:\s*([^\n\r]+)/i);
    const venue =
      fieldMeta?.venue?.trim() ||
      (venueMatch ? venueMatch[1].trim() : `${barangay} Covered Court`);

    // 5. Extract Time
    const timeMatch = content.match(/Time:\s*([^\n\r]+)/i);
    const time =
      fieldMeta?.timeWindow?.trim() ||
      (timeMatch ? timeMatch[1].trim() : '08:00 AM - 05:00 PM');

    // 6. Extract Attending Veterinarian
    const vetMatch = content.match(/Attending Veterinarian:\s*([^\n\r(]+)/i);
    const attendingVet =
      fieldMeta?.vetProfile?.name?.trim() ||
      fieldOp?.lead?.trim() ||
      (vetMatch ? vetMatch[1].trim() : 'Dr. Helen Ann P. Tacandong, DVM');

    // 7. Parse Services Offered strictly from fieldMeta or SERVICES OFFERED block (excluding boilerplate reminders)
    const servicesOffered: OutreachServiceType[] = [];
      if (Array.isArray(fieldMeta?.services) && fieldMeta.services.length > 0) {
        for (const s of fieldMeta.services) {
          if (s === 'vaccination' || s === 'consultation' || s === 'spay-neuter') {
            if (!servicesOffered.includes(s)) servicesOffered.push(s);
          }
        }
      } else {
        const servicesSectionMatch = content.match(
          /SERVICES OFFERED:\s*([\s\S]*?)(?:\n\s*\n|Target Capacity:|Reminders|$)/i,
        );
        const servicesText = (servicesSectionMatch ? servicesSectionMatch[1] : content).toLowerCase();

        if (servicesText.includes('anti-rabies') || servicesText.includes('vaccin')) {
          servicesOffered.push('vaccination');
        }
        if (
          servicesText.includes('consultation') ||
          servicesText.includes('triage') ||
          servicesText.includes('physical exam')
        ) {
          servicesOffered.push('consultation');
        }
        if (servicesText.includes('kapon') || servicesText.includes('spay') || servicesText.includes('neuter')) {
          servicesOffered.push('spay-neuter');
        }
      }

      if (servicesOffered.length === 0) {
        servicesOffered.push('vaccination', 'consultation');
      }

      const operationStatus = fieldOp?.status;
      const { availability, canScanQr } = getOutreachAvailability(
        date,
        operationStatus,
        expiresDate,
      );

      return {
        opId,
        announcementId: item.id,
        title,
        barangay,
        venue,
        date,
        expiresDate,
        time,
        attendingVet,
        servicesOffered,
        operationStatus,
        availability,
        canScanQr,
      };
    }

    /**
     * Parses the QR code shown by the CVO admin / outreach station at the barangay venue.
     * Rejects unrelated URLs, pet passport tags, clinic appointment queue QRs, and generic text.
     */
    export function parseOutreachAdminQr(raw: string): OutreachQrPayload {
      if (!raw) return { valid: false, isOutreachQr: false, raw: '' };
      const trimmed = raw.trim();

      try {
        // 1. Strict CVO Outreach Web URL check
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          const url = new URL(trimmed);
          const pathLower = url.pathname.toLowerCase();
          const hostLower = url.hostname.toLowerCase();

          // Explicitly reject Pet Passport verification URLs and Clinic Queue check-in URLs
          if (pathLower.includes('/verify/pet') || pathLower.includes('queue-checkin')) {
            return { valid: false, isOutreachQr: false, raw: trimmed };
          }

          const isCvoHost =
            hostLower.includes('veterinaryoffice-cdo') ||
            hostLower.includes('syncvet') ||
            hostLower === 'localhost';
          const isOutreachRoute =
            pathLower.includes('outreach') ||
            pathLower.includes('field-op') ||
            url.searchParams.get('type') === 'outreach';

          const opIdParam =
            url.searchParams.get('opId') ||
            url.searchParams.get('op_id') ||
            undefined;
          const announcementId =
            url.searchParams.get('announcementId') ||
            url.searchParams.get('eventId') ||
            undefined;
          const serviceParam = url.searchParams.get('service') as OutreachServiceType | null;
          const barangay = url.searchParams.get('barangay') || undefined;
          const vetName = url.searchParams.get('vet') || undefined;
          const date = parseHumanDateToISO(url.searchParams.get('date')) || undefined;
          const token = url.searchParams.get('token') || undefined;

          // Also inspect token if opId was embedded inside token
          const tokenOpId = token?.match(/(FO-\d{4}-\d+[A-Z0-9-]*)/i)?.[1];
          const resolvedOpId = opIdParam || tokenOpId;

          if (!isCvoHost && !isOutreachRoute) {
            return { valid: false, isOutreachQr: false, raw: trimmed };
          }

          if (!isOutreachRoute && !resolvedOpId) {
            return { valid: false, isOutreachQr: false, raw: trimmed };
          }

          const service: OutreachServiceType | undefined =
            serviceParam === 'vaccination' ||
              serviceParam === 'consultation' ||
              serviceParam === 'spay-neuter'
              ? serviceParam
              : undefined;

          const hasIdentifier = Boolean(resolvedOpId || barangay || announcementId);

          return {
            valid: hasIdentifier,
            isOutreachQr: true,
            opId: resolvedOpId,
            announcementId,
            service,
            barangay,
            vetName,
            date,
            token,
            raw: trimmed,
          };
        }

        // 2. Strict Outreach JSON check
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const parsed = JSON.parse(trimmed);

          // Reject clinic queue JSON or pet tag JSON
          if (parsed.type === 'clinic-queue' || (parsed.station && !parsed.opId && !parsed.op_id)) {
            return { valid: false, isOutreachQr: false, raw: trimmed };
          }

          const resolvedOpId = parsed.opId || parsed.op_id;
          const tokenStr = parsed.token ? String(parsed.token) : '';
          const isOutreach =
            Boolean(resolvedOpId) ||
            parsed.type === 'outreach' ||
            tokenStr.toUpperCase().includes('OUTREACH');

          if (!isOutreach) {
            return { valid: false, isOutreachQr: false, raw: trimmed };
          }

          const serviceParam = parsed.service as OutreachServiceType;
          const service: OutreachServiceType | undefined =
            serviceParam === 'vaccination' ||
              serviceParam === 'consultation' ||
              serviceParam === 'spay-neuter'
              ? serviceParam
              : undefined;

          return {
            valid: Boolean(resolvedOpId || parsed.barangay || parsed.announcementId),
            isOutreachQr: true,
            opId: resolvedOpId,
            announcementId: parsed.announcementId || parsed.eventId,
            service,
            barangay: parsed.barangay,
            vetName: parsed.vet || parsed.vetName,
            date: parseHumanDateToISO(parsed.date) || undefined,
            token: parsed.token,
            raw: trimmed,
          };
        }

          // 3. Structured municipal outreach token format: CVO-OUTREACH:FO-2026-004 or FO-2026-004
          const upper = trimmed.toUpperCase();
          const opMatch = upper.match(/\b(FO-\d{4}-\d+[A-Z0-9-]*)\b/);
          if (upper.startsWith('CVO-OUTREACH') || opMatch) {
            const lower = trimmed.toLowerCase();
            const tokenService: OutreachServiceType | undefined = lower.includes('consult')
              ? 'consultation'
              : lower.includes('kapon') || lower.includes('spay') || lower.includes('neuter')
                ? 'spay-neuter'
                : lower.includes('vax') || lower.includes('vaccin') || lower.includes('rabies')
                  ? 'vaccination'
                  : undefined;
            const tokenDate = parseHumanDateToISO(trimmed) || undefined;

            return {
              valid: Boolean(opMatch || upper.startsWith('CVO-OUTREACH')),
              isOutreachQr: true,
              opId: opMatch?.[1],
              date: tokenDate,
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
          isOutreachQr: false,
          raw: trimmed,
        };
      }

/**
 * Validates that a scanned QR code strictly matches the specific Barangay Outreach event
 * (by operation ID, barangay, active date, and offered service) and is not expired.
 */
export function validateOutreachQrForEvent(
        payload: OutreachQrPayload,
        outreachInfo: OutreachDetails,
        selectedService: OutreachServiceType,
      ): OutreachValidationResult {
        const today = todayISO();

        // 1. Reject if the outreach event itself is expired, concluded, or not scheduled for today
        if (!outreachInfo.canScanQr || outreachInfo.availability !== 'active_today') {
          return {
            valid: false,
            message:
              outreachInfo.availability === 'upcoming'
                ? `This outreach event is scheduled for ${outreachInfo.date}. Check-in opens on the scheduled date.`
                : `This outreach visit (${outreachInfo.date}) has already concluded or expired.`,
          };
        }

        // 2. Reject any QR that is not an official CVO Outreach Check-in QR
        if (!payload.valid || !payload.isOutreachQr) {
          return {
            valid: false,
            message: `Invalid QR code. You can only scan the official outreach QR for ${outreachInfo.opId} (Brgy. ${outreachInfo.barangay}).`,
          };
        }

        // 3. Reject if QR date does not match event date or today
        if (payload.date && payload.date !== outreachInfo.date) {
          return {
            valid: false,
            message: `This QR code is dated ${payload.date}, which does not match this event's schedule (${outreachInfo.date}).`,
          };
        }
        if (payload.date && payload.date !== today) {
          return {
            valid: false,
            message: `This QR code (${payload.date}) is expired and only valid on the scheduled day.`,
          };
        }

        const normBrgy = (val?: string) =>
          (val || '')
            .toLowerCase()
            .replace(/^(brgy\.?|barangay)\s+/i, '')
            .trim();
        const normOp = (val?: string) => (val || '').toUpperCase().trim();

        const expectedOp = normOp(outreachInfo.opId);
        const expectedBrgy = normBrgy(outreachInfo.barangay);

        let matchedIdentity = false;

        // 4. Reject if opId is specified and belongs to a different operation
        if (payload.opId) {
          if (normOp(payload.opId) !== expectedOp) {
            return {
              valid: false,
              message: `Wrong event QR: this code is for ${payload.opId}, not ${outreachInfo.opId} (Brgy. ${outreachInfo.barangay}).`,
            };
          }
          matchedIdentity = true;
        }

        // 5. Reject if announcementId is specified and belongs to a different post
        if (payload.announcementId) {
          if (payload.announcementId !== outreachInfo.announcementId) {
            return {
              valid: false,
              message: `Wrong event QR: this code belongs to a different announcement.`,
            };
          }
          matchedIdentity = true;
        }

        // 6. Reject if barangay is specified and belongs to a different barangay
        if (payload.barangay) {
          if (normBrgy(payload.barangay) !== expectedBrgy) {
            return {
              valid: false,
              message: `Wrong barangay QR: this code is for Brgy. ${payload.barangay}, not Brgy. ${outreachInfo.barangay}.`,
            };
          }
          matchedIdentity = true;
        }

        // Also check if a structured token contains this event's barangay when opId wasn't in token
        if (!matchedIdentity && payload.token) {
          const upperToken = payload.token.toUpperCase();
          if (upperToken.includes(expectedOp) || (expectedBrgy && upperToken.includes(expectedBrgy.toUpperCase()))) {
            matchedIdentity = true;
          }
        }

        // Require at least one explicit match to THIS specific event
        if (!matchedIdentity) {
          return {
            valid: false,
            message: `Unrecognized QR for this event. Please scan the official Admin QR for ${outreachInfo.opId} (Brgy. ${outreachInfo.barangay}).`,
          };
        }

        // 7. Reject if the service is not offered at this event
        const effectiveService = payload.service || selectedService;
        if (
          outreachInfo.servicesOffered.length > 0 &&
          !outreachInfo.servicesOffered.includes(effectiveService)
        ) {
          return {
            valid: false,
            message: `That service (${effectiveService}) is not offered during Brgy. ${outreachInfo.barangay}'s outreach event.`,
          };
        }

        return {
          valid: true,
          payload,
          service: effectiveService,
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
