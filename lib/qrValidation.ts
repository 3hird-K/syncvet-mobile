import type { Appointment, AppointmentStatus } from '@services/data/types';

/**
 * QR families used by SyncVet. `appointment` is a sub-type of the clinic queue
 * family, not a separate flow. Field-op always wins classification precedence.
 */
export type QrCodeKind = 'field-op' | 'queue' | 'appointment' | 'unknown';

export interface ParsedQrCode {
  kind: QrCodeKind;
  raw: string;
}

export interface QrFamilyValidationResult {
  valid: boolean;
  kind: QrCodeKind;
  title?: string;
  message?: string;
  /** Title + message, ready to display in a scanner error banner. */
  displayMessage?: string;
}

export function isQueueFamily(kind: QrCodeKind): boolean {
  return kind === 'queue' || kind === 'appointment';
}

function fieldOpDisplayMessage(): QrFamilyValidationResult {
  return {
    valid: false,
    kind: 'field-op',
    title: 'Field Operation QR Detected',
    message: "This is a Barangay Outreach attendance QR. It cannot be used to join Today's Clinic Queue.",
    displayMessage:
      "Field Operation QR Detected: This is a Barangay Outreach attendance QR. It cannot be used to join Today's Clinic Queue.",
  };
}

function queueFamilyDisplayMessage(kind: QrCodeKind): QrFamilyValidationResult {
  return {
    valid: false,
    kind,
    title: 'Clinic Queue QR Detected',
    message:
      'This is not a field operation QR. It cannot be scanned to record Barangay Outreach attendance.',
    displayMessage:
      'Clinic Queue QR Detected: This is not a field operation QR. It cannot be scanned to record Barangay Outreach attendance.',
  };
}

/**
 * Classifies the raw decoded QR string before any parser or side effect runs.
 * Keeps the two check-in families isolated even when a QR is malformed.
 */
export function parseQrCode(raw: string): ParsedQrCode {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { kind: 'unknown', raw: trimmed };

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const path = url.pathname.toLowerCase();
      const type = (url.searchParams.get('type') || '').toLowerCase();
      const token = url.searchParams.get('token') || '';

      // Field-op precedence: check first, including any opId marker.
      const isFieldOp =
        path.includes('outreach') ||
        path.includes('field-op') ||
        path.includes('field_operation') ||
        type === 'outreach' ||
        type === 'outreach-attendance' ||
        type === 'field-op' ||
        url.searchParams.has('opId') ||
        url.searchParams.has('op_id') ||
        /OUTREACH/i.test(token);
      if (isFieldOp) return { kind: 'field-op', raw: trimmed };

      const isQueue =
        path.includes('queue-checkin') ||
        type === 'clinic-queue' ||
        type === 'appointment' ||
        /^cvo-queue-/i.test(token);
      if (isQueue) return { kind: 'queue', raw: trimmed };

      return { kind: 'unknown', raw: trimmed };
    } catch {
      return { kind: 'unknown', raw: trimmed };
    }
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const payload = JSON.parse(trimmed) as Record<string, any>;

      // Field-op precedence over an appointmentId if both were embedded.
      const token = typeof payload.token === 'string' ? payload.token : '';
      const isFieldOp =
        Boolean(payload.opId || payload.op_id) ||
        payload.type === 'outreach' ||
        payload.type === 'field-op' ||
        payload.type === 'outreach-attendance' ||
        /OUTREACH|FIELD.?OP/i.test(token);
      if (isFieldOp) return { kind: 'field-op', raw: trimmed };

      if (payload.appointmentId || payload.appointment_id) {
        return { kind: 'appointment', raw: trimmed };
      }

      const isQueue =
        payload.type === 'clinic-queue' ||
        payload.type === 'appointment' ||
        Boolean(payload.station) ||
        /^cvo-queue-/i.test(token);
      if (isQueue) return { kind: 'queue', raw: trimmed };

      return { kind: 'unknown', raw: trimmed };
    } catch {
      return { kind: 'unknown', raw: trimmed };
    }
  }

  const upper = trimmed.toUpperCase();
  if (/CVO-OUTREACH|\bFO-\d{4}-\d+/.test(upper)) {
    return { kind: 'field-op', raw: trimmed };
  }
  if (/^CVO-QUEUE-\d{4}-\d{2}-\d{2}$/.test(upper)) {
    return { kind: 'queue', raw: trimmed };
  }

  return { kind: 'unknown', raw: trimmed };
}

/** Gate for scanners opened from an outreach / field-operation screen. */
export function validateFieldOpQr(raw: string): QrFamilyValidationResult {
  const { kind } = parseQrCode(raw);

  if (isQueueFamily(kind)) return queueFamilyDisplayMessage(kind);

  if (kind !== 'field-op') {
    return {
      valid: false,
      kind,
      title: 'Invalid Attendance QR',
      message: 'This is not an official Barangay Outreach attendance QR.',
      displayMessage: 'Invalid Attendance QR: This is not an official Barangay Outreach attendance QR.',
    };
  }

  return { valid: true, kind };
}

/** Gate for scanners opened from the clinic queue / appointment screen. */
export function validateQueueQr(raw: string): QrFamilyValidationResult {
  const { kind } = parseQrCode(raw);

  if (kind === 'field-op') return fieldOpDisplayMessage();

  if (!isQueueFamily(kind)) {
    return {
      valid: false,
      kind,
      title: 'Invalid Clinic Check-in QR',
      message: 'This is not a valid Clinic Queue Check-in station.',
      displayMessage:
        'Invalid Clinic Check-in QR: This is not a valid Clinic Queue Check-in station.',
    };
  }

  return { valid: true, kind };
}

const ACTIVE_QUEUE_STATUSES = new Set<AppointmentStatus>([
  'queued',
  'checked_in',
  'called',
  'serving',
]);

/** True when the pet already holds an active clinic queue ticket. */
export function isActiveQueueAppointment(appointment: Appointment): boolean {
  return ACTIVE_QUEUE_STATUSES.has(appointment.status);
}

/** True for appointments created by a Barangay outreach / field-operation visit. */
export function isOutreachAppointment(appointment: Appointment): boolean {
  const text = `${appointment.id} ${appointment.location || ''} ${appointment.notes || ''}`.toLowerCase();
  return text.includes('outreach') || text.includes('field operation');
}
