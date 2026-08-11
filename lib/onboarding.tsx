import type { ComponentType } from 'react';

import { PhotoIllustration } from '@components/ui/PhotoIllustration';

export interface OnboardingSlideData {
  id: string;
  subtitle: string;
  title: string;
  description: string;
  illustration: ComponentType<{ size?: number }>;
}

type IllustrationProps = { size?: number };

const DiscoverPhoto = ({ size }: IllustrationProps) => (
  <PhotoIllustration source={require('@assets/image.png')} size={size} />
);

const RegisterPhoto = ({ size }: IllustrationProps) => (
  <PhotoIllustration source={require('@assets/boy-child.png')} size={size} />
);

const UpdatesPhoto = ({ size }: IllustrationProps) => (
  <PhotoIllustration source={require('@assets/image.png')} size={size} />
);

export const ONBOARDING_SLIDES: OnboardingSlideData[] = [
  {
    id: 'discover',
    subtitle: 'Discover Services',
    title: 'Veterinary Services, Made Simple.',
    description:
      'Access the full range of veterinary services from your City Veterinary Office — right from your mobile device.',
    illustration: DiscoverPhoto,
  },
  {
    id: 'register',
    subtitle: 'Register Easily',
    title: 'Register Without the Long Wait.',
    description:
      'Submit registrations for consultations, vaccinations, spay and neuter procedures, and other services online.',
    illustration: RegisterPhoto,
  },
  {
    id: 'updates',
    subtitle: 'Stay Updated',
    title: "Stay Updated on Your Pet's Care.",
    description:
      'Receive appointment updates, reminders, and important notifications so you never miss a visit.',
    illustration: UpdatesPhoto,
  },
];
