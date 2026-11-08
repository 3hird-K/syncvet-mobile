import type { ImageSourcePropType } from 'react-native';

export interface PetAvatarOption {
  id: string;
  label: string;
  species: 'dog' | 'cat';
  source: ImageSourcePropType;
  path: string;
}

export const DOG_AVATARS: PetAvatarOption[] = [
  {
    id: 'dog-5',
    label: 'Fluffy Shiba',
    species: 'dog',
    path: '/assets/dog-profiles/image-removebg-preview (5).png',
    source: require('@assets/dog-profiles/image-removebg-preview (5).png'),
  },
  {
    id: 'dog-1',
    label: 'Border Collie',
    species: 'dog',
    path: '/assets/dog-profiles/image-removebg-preview (1).png',
    source: require('@assets/dog-profiles/image-removebg-preview (1).png'),
  },
  {
    id: 'dog-1-copy',
    label: 'Playful Aussie',
    species: 'dog',
    path: '/assets/dog-profiles/image-removebg-preview (1) copy.png',
    source: require('@assets/dog-profiles/image-removebg-preview (1) copy.png'),
  },
  {
    id: 'dog-3',
    label: 'Golden Retriever',
    species: 'dog',
    path: '/assets/dog-profiles/image-removebg-preview (3).png',
    source: require('@assets/dog-profiles/image-removebg-preview (3).png'),
  },
  {
    id: 'dog-4',
    label: 'Happy Corgi',
    species: 'dog',
    path: '/assets/dog-profiles/image-removebg-preview (4).png',
    source: require('@assets/dog-profiles/image-removebg-preview (4).png'),
  },
  {
    id: 'dog-5-copy',
    label: 'Gentle Husky',
    species: 'dog',
    path: '/assets/dog-profiles/image-removebg-preview (5) copy.png',
    source: require('@assets/dog-profiles/image-removebg-preview (5) copy.png'),
  },
  {
    id: 'dog-8',
    label: 'Tiny Shih Tzu',
    species: 'dog',
    path: '/assets/dog-profiles/image-removebg-preview (8).png',
    source: require('@assets/dog-profiles/image-removebg-preview (8).png'),
  },
  {
    id: 'dog-8-copy',
    label: 'Fluffy Pomeranian',
    species: 'dog',
    path: '/assets/dog-profiles/image-removebg-preview (8) copy.png',
    source: require('@assets/dog-profiles/image-removebg-preview (8) copy.png'),
  },
  {
    id: 'dog-9',
    label: 'Playful Beagle',
    species: 'dog',
    path: '/assets/dog-profiles/image-removebg-preview (9).png',
    source: require('@assets/dog-profiles/image-removebg-preview (9).png'),
  },
  {
    id: 'dog-10',
    label: 'Charming Pug',
    species: 'dog',
    path: '/assets/dog-profiles/image-removebg-preview (10).png',
    source: require('@assets/dog-profiles/image-removebg-preview (10).png'),
  },
  {
    id: 'dog-11',
    label: 'Loyal Shepherd',
    species: 'dog',
    path: '/assets/dog-profiles/image-removebg-preview (11).png',
    source: require('@assets/dog-profiles/image-removebg-preview (11).png'),
  },
  {
    id: 'dog-aspin',
    label: 'Friendly Aspin',
    species: 'dog',
    path: '/assets/no-backgrounds/dog11-removebg-preview.png',
    source: require('@assets/no-backgrounds/dog11-removebg-preview.png'),
  },
  {
    id: 'dog-sunny',
    label: 'Sunny Retriever',
    species: 'dog',
    path: '/assets/no-backgrounds/dog2-removebg-preview.png',
    source: require('@assets/no-backgrounds/dog2-removebg-preview.png'),
  },
  {
    id: 'dog-snow',
    label: 'Snow Buddy',
    species: 'dog',
    path: '/assets/no-backgrounds/dog3-removebg-preview.png',
    source: require('@assets/no-backgrounds/dog3-removebg-preview.png'),
  },
];

export const DEFAULT_DOG_AVATAR = require('@assets/dog-profiles/image-removebg-preview (5).png');
export const DEFAULT_CAT_AVATAR = require('@assets/cat-profiles/image-removebg-preview (2).png');

export const CAT_AVATARS: PetAvatarOption[] = [
  {
    id: 'cat-2',
    label: 'Siamese Grace',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview (2).png',
    source: require('@assets/cat-profiles/image-removebg-preview (2).png'),
  },
  {
    id: 'cat-8',
    label: 'Snowy White',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview (8).png',
    source: require('@assets/cat-profiles/image-removebg-preview (8).png'),
  },
  {
    id: 'cat-default',
    label: 'Sweet Orange Tabby',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview.png',
    source: require('@assets/cat-profiles/image-removebg-preview.png'),
  },
  {
    id: 'cat-1',
    label: 'Calico Puspin',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview (1).png',
    source: require('@assets/cat-profiles/image-removebg-preview (1).png'),
  },
  {
    id: 'cat-3',
    label: 'British Shorthair',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview (3).png',
    source: require('@assets/cat-profiles/image-removebg-preview (3).png'),
  },
  {
    id: 'cat-4',
    label: 'Persian Fluff',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview (4).png',
    source: require('@assets/cat-profiles/image-removebg-preview (4).png'),
  },
  {
    id: 'cat-5',
    label: 'Tuxedo Cat',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview (5).png',
    source: require('@assets/cat-profiles/image-removebg-preview (5).png'),
  },
  {
    id: 'cat-6',
    label: 'Ginger Stripe',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview (6).png',
    source: require('@assets/cat-profiles/image-removebg-preview (6).png'),
  },
  {
    id: 'cat-7',
    label: 'Midnight Black',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview (7).png',
    source: require('@assets/cat-profiles/image-removebg-preview (7).png'),
  },
  {
    id: 'cat-9',
    label: 'Ragdoll Blue',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview (9).png',
    source: require('@assets/cat-profiles/image-removebg-preview (9).png'),
  },
  {
    id: 'cat-10',
    label: 'Maine Coon',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview (10).png',
    source: require('@assets/cat-profiles/image-removebg-preview (10).png'),
  },
  {
    id: 'cat-11',
    label: 'Scottish Fold',
    species: 'cat',
    path: '/assets/cat-profiles/image-removebg-preview (11).png',
    source: require('@assets/cat-profiles/image-removebg-preview (11).png'),
  },
  {
    id: 'cat-joy',
    label: 'Kitten Joy',
    species: 'cat',
    path: '/assets/no-backgrounds/cat1-removebg-preview.png',
    source: require('@assets/no-backgrounds/cat1-removebg-preview.png'),
  },
  {
    id: 'cat-feline',
    label: 'Curious Feline',
    species: 'cat',
    path: '/assets/no-backgrounds/cat2-removebg-preview.png',
    source: require('@assets/no-backgrounds/cat2-removebg-preview.png'),
  },
  {
    id: 'cat-tabby',
    label: 'Playful Puspin',
    species: 'cat',
    path: '/assets/no-backgrounds/cat3-removebg-preview.png',
    source: require('@assets/no-backgrounds/cat3-removebg-preview.png'),
  },
  {
    id: 'cat-kittens',
    label: 'Maine Coon Family',
    species: 'cat',
    path: '/assets/no-backgrounds/catsss-removebg-preview.png',
    source: require('@assets/no-backgrounds/catsss-removebg-preview.png'),
  },
];

/**
 * Returns the relative asset file path (matching the database `photo_url` format)
 * e.g. "/assets/dog-profiles/image-removebg-preview (5).png"
 */
export function getAvatarPath(avatarId?: string, species?: string): string {
  if (avatarId) {
    const foundDog = DOG_AVATARS.find((d) => d.id === avatarId);
    if (foundDog) return foundDog.path;
    const foundCat = CAT_AVATARS.find((c) => c.id === avatarId);
    if (foundCat) return foundCat.path;
  }
  const isCat = species?.toLowerCase() === 'cat';
  return isCat
    ? '/assets/cat-profiles/image-removebg-preview (2).png'
    : '/assets/dog-profiles/image-removebg-preview (5).png';
}

/**
 * Maps a stored asset path string from Supabase `photo_url` back to the bundled Image source
 */
export function getAvatarSourceByPath(path: string): ImageSourcePropType | null {
  const clean = path.trim();
  const dogMatch = DOG_AVATARS.find((d) => d.path === clean);
  if (dogMatch) return dogMatch.source;
  const catMatch = CAT_AVATARS.find((c) => c.path === clean);
  if (catMatch) return catMatch.source;
  return null;
}

export function getPetAvatarSource(
  avatarId?: string,
  species?: string,
  photoUrl?: string | null,
  petName?: string,
): ImageSourcePropType {
  // 1. If photoUrl is an asset path stored in database (e.g. '/assets/...'), resolve directly
  if (photoUrl && typeof photoUrl === 'string') {
    const cleanUrl = photoUrl.trim();
    if (cleanUrl.startsWith('/assets/')) {
      const mapped = getAvatarSourceByPath(cleanUrl);
      if (mapped) return mapped;
    }
    // 2. If photoUrl is a remote URL or file uri
    if (
      cleanUrl.length > 0 &&
      cleanUrl !== 'null' &&
      cleanUrl !== 'undefined' &&
      (cleanUrl.startsWith('http://') ||
        cleanUrl.startsWith('https://') ||
        cleanUrl.startsWith('file:') ||
        cleanUrl.startsWith('data:') ||
        cleanUrl.startsWith('content:'))
    ) {
      return { uri: cleanUrl };
    }
  }

  // 3. Special name & breed presets
  const nameKey = (petName || '').toLowerCase().trim();
  if (nameKey === 'cadmus') {
    return require('@assets/cat-profiles/image-removebg-preview (3).png');
  }
  if (nameKey === 'gehlee') {
    return require('@assets/cat-profiles/image-removebg-preview (10).png');
  }
  if (nameKey === 'angela') {
    return require('@assets/cat-profiles/image-removebg-preview (1).png');
  }
  if (nameKey === 'oreo') {
    return require('@assets/dog-profiles/image-removebg-preview (1) copy.png');
  }

  // 4. Avatar ID match
  if (avatarId) {
    const dogFound = DOG_AVATARS.find((a) => a.id === avatarId);
    if (dogFound) return dogFound.source;
    const catFound = CAT_AVATARS.find((a) => a.id === avatarId);
    if (catFound) return catFound.source;
  }

  // 5. Default fallback: dog-5 for dog, cat-2 for cat
  const isCat = species?.toLowerCase() === 'cat';
  return isCat ? DEFAULT_CAT_AVATAR : DEFAULT_DOG_AVATAR;
}
