import type { ComponentType } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { PhotoIllustration } from '@components/ui/PhotoIllustration';
import { colors } from '@theme';

export interface OnboardingSlideData {
  id: string;
  subtitle: string;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  accentBg: string;
  badgeColor: string;
  illustration: ComponentType<{ size?: number }>;
  isAuthSlide?: boolean;
}
 
type IllustrationProps = { size?: number };

const DiscoverPhoto = ({ size = 450 }: IllustrationProps) => (
  <PhotoIllustration
    source={require('@assets/no-backgrounds/nurse1-removebg-preview.png')}
    size={size}
    accentColor={colors.primary}
  />
);

const RegisterPhoto = ({ size }: IllustrationProps) => (
  <PhotoIllustration
    source={require('@assets/no-backgrounds/nurse-pets-removebg-preview.png')}
    size={size}
    accentColor={colors.primary}
  />
);

const UpdatesPhoto = ({ size }: IllustrationProps) => (
  <PhotoIllustration
    source={require('@assets/no-backgrounds/dog11-removebg-preview.png')}
    size={size}
    accentColor={colors.primary}
  />
);

const WelcomePhoto = ({ size }: IllustrationProps) => (
  <PhotoIllustration
    source={require('@assets/no-backgrounds/nurse-pets2.png')}
    size={size}
    accentColor={colors.primary}
  />
);

export const ONBOARDING_SLIDES: OnboardingSlideData[] = [
  {
    id: 'discover',
    subtitle: 'DISCOVER SERVICES',
    title: 'Veterinary Services,\nMade Simple.',
    description:
      'Access the full range of veterinary services from your City Veterinary Office — right from your mobile device.',
    iconName: 'paw',
    accentBg: '#E6F5F2',
    badgeColor: colors.primary,
    illustration: DiscoverPhoto,
  },
  {
    id: 'register',
    subtitle: 'REGISTER EASILY',
    title: 'Register Without\nthe Long Wait.',
    description:
      'Submit registrations for consultations, vaccinations, spay and neuter procedures, and other services online.',
    iconName: 'medical',
    accentBg: '#E6F5F2',
    badgeColor: colors.primary,
    illustration: RegisterPhoto,
  },
  {
    id: 'updates',
    subtitle: 'STAY UPDATED',
    title: "Stay Updated on\nYour Pet's Care.",
    description:
      'Receive appointment updates, reminders, and important notifications so you never miss a visit.',
    iconName: 'notifications',
    accentBg: '#E6F5F2',
    badgeColor: colors.primary,
    illustration: UpdatesPhoto,
  },
  {
    id: 'welcome',
    subtitle: 'WELCOME TO SYNCVET',
    title: 'Better care for\nyour best friend.',
    description:
      'Access veterinary services from your City Veterinary Office, right from your phone.',
    iconName: 'heart',
    accentBg: '#E6F5F2',
    badgeColor: colors.primary,
    illustration: WelcomePhoto,
    isAuthSlide: true,
  },
];



