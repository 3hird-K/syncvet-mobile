/** Date/format helpers shared across screens and the data layer. */

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Local date string in YYYY-MM-DD for a Date. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Returns a Date offset by `days` from now (negative for the past). */
export function addDays(days: number, from = new Date()): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

export function isISOInPast(iso: string): boolean {
  return iso < todayISO();
}

/** "Aug 20" from YYYY-MM-DD. */
export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  if (!month || !day) return iso;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[month - 1]} ${day}`;
}

/** "Aug 20, 2026" from YYYY-MM-DD. */
export function formatDateWithYear(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!month || !day || !year) return iso;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[month - 1]} ${day}, ${year}`;
}

const CLINIC_HOURS_LABEL = '8:00 AM - 5:00 PM';

/**
 * Appointment cards may contain legacy session labels from older bookings.
 * Show the current clinic-hours label instead of morning/afternoon session text.
 */
export function formatAppointmentTimeSlot(timeSlot?: string | null): string {
  const raw = (timeSlot || '').trim();
  if (!raw) return 'Time TBD';

  const withoutParentheses = raw.replace(/\s*\([^)]*\)/g, '').trim();
  const isLegacySession =
    /\b(morning|afternoon)\s+session\b/i.test(raw) ||
    /\b8:30\s*AM\s*[-–—]\s*11:30\s*AM\b/i.test(withoutParentheses) ||
    /\b1:30\s*PM\s*[-–—]\s*4:30\s*PM\b/i.test(withoutParentheses);

  return isLegacySession ? CLINIC_HOURS_LABEL : withoutParentheses || raw;
}

/** "Monday, Aug 20" from YYYY-MM-DD. */
export function formatWeekdayDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** "Tuesday, 20 August" for headers. */
export function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function currentYear(): number {
  return new Date().getFullYear();
}

/** Age in whole years from a birth year (clamped at 0). */
export function ageFromBirthYear(birthYear: number): number {
  const age = currentYear() - birthYear;
  return Math.max(age, 0);
}

export function formatAge(age: number): string {
  if (age === 0) return 'Under a year';
  if (age === 1) return '1 year';
  return `${age} years`;
}

/** First word of a full name, capitalized-friendly. */
export function getFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first || 'there';
}

export function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Relative "Today"/"Tomorrow"/"Mon, Aug 24" label for a date string. */
export function relativeDay(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Today';
  if (iso === toISODate(addDays(1))) return 'Tomorrow';
  if (iso === toISODate(addDays(-1))) return 'Yesterday';
  return formatWeekdayDate(iso);
}
