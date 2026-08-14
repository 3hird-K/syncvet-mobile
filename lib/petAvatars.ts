import type { ImageSourcePropType } from 'react-native';

export interface PetAvatarOption {
  id: string;
  label: string;
  species: 'dog' | 'cat';
  source: ImageSourcePropType;
}

export const DOG_AVATARS: PetAvatarOption[] = [
  {
    id: 'dog-1',
    label: 'Border Collie',
    species: 'dog',
    source: require('@assets/dog-profiles/image-removebg-preview (1).png'),
  },
  {
    id: 'dog-1-copy',
    label: 'Playful Aussie',
    species: 'dog',
    source: require('@assets/dog-profiles/image-removebg-preview (1) copy.png'),
  },
  {
    id: 'dog-3',
    label: 'Golden Retriever',
    species: 'dog',
    source: require('@assets/dog-profiles/image-removebg-preview (3).png'),
  },
  {
    id: 'dog-4',
    label: 'Happy Corgi',
    species: 'dog',
    source: require('@assets/dog-profiles/image-removebg-preview (4).png'),
  },
  {
    id: 'dog-5',
    label: 'Fluffy Shiba',
    species: 'dog',
    source: require('@assets/dog-profiles/image-removebg-preview (5).png'),
  },
  {
    id: 'dog-5-copy',
    label: 'Gentle Husky',
    species: 'dog',
    source: require('@assets/dog-profiles/image-removebg-preview (5) copy.png'),
  },
  {
    id: 'dog-8',
    label: 'Tiny Shih Tzu',
    species: 'dog',
    source: require('@assets/dog-profiles/image-removebg-preview (8).png'),
  },
  {
    id: 'dog-8-copy',
    label: 'Fluffy Pomeranian',
    species: 'dog',
    source: require('@assets/dog-profiles/image-removebg-preview (8) copy.png'),
  },
  {
    id: 'dog-9',
    label: 'Playful Beagle',
    species: 'dog',
    source: require('@assets/dog-profiles/image-removebg-preview (9).png'),
  },
  {
    id: 'dog-10',
    label: 'Charming Pug',
    species: 'dog',
    source: require('@assets/dog-profiles/image-removebg-preview (10).png'),
  },
  {
    id: 'dog-11',
    label: 'Loyal Shepherd',
    species: 'dog',
    source: require('@assets/dog-profiles/image-removebg-preview (11).png'),
  },
  {
    id: 'dog-aspin',
    label: 'Friendly Aspin',
    species: 'dog',
    source: require('@assets/no-backgrounds/dog11-removebg-preview.png'),
  },
  {
    id: 'dog-sunny',
    label: 'Sunny Retriever',
    species: 'dog',
    source: require('@assets/no-backgrounds/dog2-removebg-preview.png'),
  },
  {
    id: 'dog-snow',
    label: 'Snow Buddy',
    species: 'dog',
    source: require('@assets/no-backgrounds/dog3-removebg-preview.png'),
  },
];

export const CAT_AVATARS: PetAvatarOption[] = [
  {
    id: 'cat-default',
    label: 'Sweet Orange Tabby',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview.png'),
  },
  {
    id: 'cat-1',
    label: 'Calico Puspin',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview (1).png'),
  },
  {
    id: 'cat-2',
    label: 'Siamese Grace',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview (2).png'),
  },
  {
    id: 'cat-3',
    label: 'British Shorthair',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview (3).png'),
  },
  {
    id: 'cat-4',
    label: 'Persian Fluff',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview (4).png'),
  },
  {
    id: 'cat-5',
    label: 'Tuxedo Cat',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview (5).png'),
  },
  {
    id: 'cat-6',
    label: 'Ginger Stripe',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview (6).png'),
  },
  {
    id: 'cat-7',
    label: 'Midnight Black',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview (7).png'),
  },
  {
    id: 'cat-8',
    label: 'Snowy White',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview (8).png'),
  },
  {
    id: 'cat-9',
    label: 'Ragdoll Blue',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview (9).png'),
  },
  {
    id: 'cat-10',
    label: 'Maine Coon',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview (10).png'),
  },
  {
    id: 'cat-11',
    label: 'Scottish Fold',
    species: 'cat',
    source: require('@assets/cat-profiles/image-removebg-preview (11).png'),
  },
  {
    id: 'cat-joy',
    label: 'Kitten Joy',
    species: 'cat',
    source: require('@assets/no-backgrounds/cat1-removebg-preview.png'),
  },
  {
    id: 'cat-feline',
    label: 'Curious Feline',
    species: 'cat',
    source: require('@assets/no-backgrounds/cat2-removebg-preview.png'),
  },
  {
    id: 'cat-tabby',
    label: 'Playful Puspin',
    species: 'cat',
    source: require('@assets/no-backgrounds/cat3-removebg-preview.png'),
  },
];

export function getPetAvatarSource(
  avatarId?: string,
  species?: string,
  photoUrl?: string | null,
): ImageSourcePropType {
  if (photoUrl && (photoUrl.startsWith('http') || photoUrl.startsWith('file:') || photoUrl.startsWith('data:'))) {
    return { uri: photoUrl };
  }

  if (avatarId) {
    const dogFound = DOG_AVATARS.find((a) => a.id === avatarId);
    if (dogFound) return dogFound.source;
    const catFound = CAT_AVATARS.find((a) => a.id === avatarId);
    if (catFound) return catFound.source;
  }

  const isCat = species?.toLowerCase() === 'cat';
  return isCat ? CAT_AVATARS[0].source : DOG_AVATARS[0].source;
}
