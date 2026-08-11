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
