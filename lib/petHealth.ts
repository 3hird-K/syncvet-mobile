import type { Pet } from '@services/data/types';

import { formatDateWithYear, pad2, todayISO } from './format';
import { normalizeServiceId } from './services';

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDateOnly(value?: string | null): string | undefined {
  if (!value) return undefined;
  const datePart = String(value).split('T')[0];
  return ISO_DATE_ONLY.test(datePart) ? datePart : undefined;
}

/** Adds one calendar year to a YYYY-MM-DD date, clamping leap-day anniversaries. */
export function addOneYearToISODate(value?: string | null): string | undefined {
  const iso = toDateOnly(value);
  if (!iso) return undefined;

  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return undefined;

  const nextYear = year + 1;
  const lastDayOfMonth = new Date(nextYear, month, 0).getDate();
  const safeDay = Math.min(day, lastDayOfMonth);

  return `${nextYear}-${pad2(month)}-${pad2(safeDay)}`;
}

/**
 * Annual booster due date. Uses the clinic-provided date when present and
 * otherwise derives the anniversary from the last vaccination date.
 */
export function getVaccinationDueDate(pet?: Pet | null): string | undefined {
  if (!pet) return undefined;

  const explicitDueDate = toDateOnly(pet.nextVaccinationDate);
  if (explicitDueDate) return explicitDueDate;

  if (!pet.isVaccinated) return undefined;

  const lastVaccinationDate =
    toDateOnly(pet.lastVaccinationDate) || toDateOnly(pet.createdAt);
  return addOneYearToISODate(lastVaccinationDate);
}

/** True while a recorded vaccination is still current (before its 1-year anniversary). */
export function isVaccinationCurrent(pet?: Pet | null, nowDate = todayISO()): boolean {
  if (!pet?.isVaccinated) return false;

  const dueDate = getVaccinationDueDate(pet);
  return !dueDate || dueDate > nowDate;
}

/** True when a municipal service is already completed and should not be offered again. */
export function isServiceUnavailableForPet(
  pet?: Pet | null,
  serviceId?: string | null,
): boolean {
  if (!pet) return false;

  const canonicalId = normalizeServiceId(serviceId);
  if (canonicalId === 'vaccination') return isVaccinationCurrent(pet);
  if (canonicalId === 'spay-neuter') return Boolean(pet.isSpayedNeutered);
  return false;
}

/** User-facing explanation for a completed service that is disabled for this pet. */
export function getServiceUnavailableMessage(
  pet?: Pet | null,
  serviceId?: string | null,
): string | undefined {
  if (!pet) return undefined;

  const canonicalId = normalizeServiceId(serviceId);
  if (canonicalId === 'vaccination' && isVaccinationCurrent(pet)) {
    const dueDate = getVaccinationDueDate(pet);
    return `${pet.name} is already vaccinated${dueDate ? ` and is due for the annual booster on ${formatDateWithYear(dueDate)}` : ''}.`;
  }
  if (canonicalId === 'spay-neuter' && pet.isSpayedNeutered) {
    return `${pet.name} is already recorded as spayed/neutered.`;
  }
  return undefined;
}
