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

/** Time slots offered at the City Veterinary Office. */
export const TIME_SLOTS = [
  '8:00 AM',
  '9:30 AM',
  '11:00 AM',
  '1:30 PM',
  '3:00 PM',
  '4:30 PM',
] as const;

export const SERVICE_LOCATION = 'City Veterinary Office';
