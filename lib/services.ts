import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors } from '@theme';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface ServiceDef {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: IoniconName;
  color: string;
  bg: string;
  cta: string;
}

export const SERVICES: ServiceDef[] = [
  {
    id: 'consultation',
    name: 'Consultation',
    tagline: 'Talk to a city veterinarian',
    description:
      'Book a consultation for a wellness check, health concern, or expert advice for your pet.',
    icon: 'chatbubbles-outline',
    color: colors.primaryDark,
    bg: colors.primaryLight,
    cta: 'Book a Consultation',
  },
  {
    id: 'vaccination',
    name: 'Vaccination',
    tagline: 'Keep your pet protected',
    description:
      'Schedule core and booster vaccines to keep your pet protected against preventable diseases.',
    icon: 'medical-outline',
    color: colors.accentDark,
    bg: colors.accentLight,
    cta: 'Schedule Vaccination',
  },
  {
    id: 'spay-neuter',
    name: 'Spay & Neuter',
    tagline: 'Responsible pet ownership',
    description:
      'Register your pet for the city’s free spay and neuter program.',
    icon: 'fitness-outline',
    color: colors.info,
    bg: colors.infoLight,
    cta: 'Register for Surgery',
  },
  {
    id: 'deworming',
    name: 'Deworming',
    tagline: 'Regular parasite protection',
    description:
      'Schedule routine deworming to keep your pet healthy and parasite-free.',
    icon: 'medkit-outline',
    color: colors.warningDark,
    bg: colors.warningLight,
    cta: 'Schedule Deworming',
  },
  {
    id: 'pet-registration',
    name: 'Pet Registration',
    tagline: 'Register a pet with the city',
    description:
      'Register a new pet with the City Veterinary Office for licensing and record keeping.',
    icon: 'paw-outline',
    color: colors.successDark,
    bg: colors.successLight,
    cta: 'Register Your Pet',
  },
  {
    id: 'other',
    name: 'Other Services',
    tagline: 'Everything else from the office',
    description:
      'Reach out about other city veterinary services, programs, and support.',
    icon: 'grid-outline',
    color: colors.textSecondary,
    bg: colors.surfaceMuted,
    cta: 'Contact the Office',
  },
];

export function getService(serviceId: string): ServiceDef | undefined {
  return SERVICES.find((s) => s.id === serviceId);
}

export const MORNING_SLOTS = [
  '8:30 AM',
  '9:30 AM',
  '10:30 AM',
] as const;

export const AFTERNOON_SLOTS = [
  '1:30 PM',
  '2:30 PM',
  '3:30 PM',
] as const;

/** Time slots offered at the City Veterinary Office (Monday - Friday). */
export const TIME_SLOTS = [
  ...MORNING_SLOTS,
  ...AFTERNOON_SLOTS,
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

/** Converts a slot string like "8:30 AM" or "1:30 PM" to decimal hours (e.g. 8.5 or 13.5). */
export function slotToHour(slot: string): number {
  const match = slot.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 8;
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour + min / 60;
}

/** Check if a time slot is still open for a given date (requires at least 30 min advance). */
export function isSlotAvailable(dateISO: string, slot: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;

  if (dateISO < today) return false;
  if (dateISO > today) return true;

  const currentHour = now.getHours() + now.getMinutes() / 60;
  const slotHour = slotToHour(slot);
  return slotHour > currentHour + 0.5;
}

export const SERVICE_LOCATION = 'City Veterinary Office';
