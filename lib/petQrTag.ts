import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Pet } from '@services/data';
import { getAvatarPath } from './petAvatars';

export interface PetTagOwner {
  id?: string;
  name: string;
  phone: string;
  address: string;
}

export interface PetTagPayload {
  protocol: 'syncvet-tag-v1';
  tagId: string;
  description?: string;
  issuedAt: string;
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    gender?: string;
    birthYear?: number;
    isVaccinated: boolean;
    isSpayedNeutered?: boolean;
    notes?: string;
    avatarId?: string;
    photoUrl?: string;
  };
  owner: PetTagOwner;
  cvo: {
    office: string;
    hotline: string;
    city: string;
  };
}

export const CVO_HOTLINE = '0888572260';
export const CVO_HOTLINE_DISPLAY = '(088) 857-2260';
export const CVO_OFFICE_NAME = 'Cagayan de Oro City Veterinary Office';
export const PET_TAG_DESCRIPTION =
  'An official digital collar tag for lost pet identification and owner contact.';

export const VERCEL_VERIFY_BASE_URL = 'https://veterinaryoffice-cdo.vercel.app/verify/pet';

/**
 * Generates or retrieves the 9-digit municipal pet microchip tag number (e.g. "pet-493355620").
 */
export function getPetTagCode(pet: Pet): string {
  if (pet.microchipNumber) return pet.microchipNumber;
  let hash = 0;
  const str = pet.id || pet.name || 'syncvet';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positive = (Math.abs(hash) % 900000000) + 100000000;
  return `pet-${positive}`;
}

/**
 * Generates an official tag ID string from pet ID.
 */
export function generateTagId(petId: string): string {
  const cleanId = petId ? petId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() : 'PENDING';
  return `CVO-TAG-${cleanId}`;
}

/**
 * Builds the official live verification website URL for the companion animal.
 * Matches: https://veterinaryoffice-cdo.vercel.app/verify/pet/:petId?...
 */
export function buildPetVerificationUrl(
  pet: Pet,
  owner: { id?: string; fullName?: string; mobileNumber?: string; address?: string },
): string {
  const speciesFormatted = pet.species?.toLowerCase() === 'cat' ? 'Cat' : 'Dog';
  const tagCode = getPetTagCode(pet);
  const avatarRelPath = pet.photoUrl?.startsWith('/assets/')
    ? pet.photoUrl
    : (pet.avatarId ? getAvatarPath(pet.avatarId, pet.species) : getAvatarPath(undefined, pet.species));

  const params = new URLSearchParams({
    name: pet.name || '',
    species: speciesFormatted,
    breed: pet.breed || '',
    tag: tagCode,
    owner: owner.fullName || 'SyncVet Resident',
    contact: owner.mobileNumber || '',
    bgy: owner.address || 'Cagayan de Oro City',
    vax: pet.isVaccinated ? '1' : '0',
    lastVax: pet.lastVaccinationDate || '',
    nextVax: pet.nextVaccinationDate || '',
    photo: avatarRelPath,
  });

  return `${VERCEL_VERIFY_BASE_URL}/${pet.id}?${params.toString()}`;
}

/**
 * Builds the verification string to encode inside the QR code.
 * Encodes the live website URL so any camera scanner opens the official verification page directly.
 */
export function buildPetTagString(
  pet: Pet,
  owner: { id?: string; fullName?: string; mobileNumber?: string; address?: string },
): string {
  return buildPetVerificationUrl(pet, owner);
}

/**
 * Parses a scanned QR string into a structured PetTagPayload,
 * supporting the official verification URL, JSON, and legacy formats.
 */
export function parsePetTagPayload(rawText: string): PetTagPayload | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const trimmed = rawText.trim();

  // 1. Try parsing official Verification URL (e.g. https://veterinaryoffice-cdo.vercel.app/verify/pet/:id?...)
  if (trimmed.includes('/verify/pet/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const qIdx = trimmed.indexOf('?');
      const urlPath = qIdx !== -1 ? trimmed.slice(0, qIdx) : trimmed;
      const queryStr = qIdx !== -1 ? trimmed.slice(qIdx + 1) : '';

      const pathSegments = urlPath.split('/').filter(Boolean);
      const petIdIdx = pathSegments.indexOf('pet');
      const petId = petIdIdx !== -1 && pathSegments[petIdIdx + 1] ? pathSegments[petIdIdx + 1] : 'UNKNOWN';

      const searchParams = new URLSearchParams(queryStr);
      const name = searchParams.get('name') || 'Unknown Pet';
      const species = (searchParams.get('species')?.toLowerCase() || 'dog') as 'dog' | 'cat';
      const breed = searchParams.get('breed') || undefined;
      const tag = searchParams.get('tag') || `CVO-TAG-${petId.slice(0, 8).toUpperCase()}`;
      const ownerName = searchParams.get('owner') || 'SyncVet Resident';
      const contact = searchParams.get('contact') || '';
      const bgy = searchParams.get('bgy') || 'Cagayan de Oro City';
      const vax = searchParams.get('vax') === '1';
      const photo = searchParams.get('photo') || undefined;

      return {
        protocol: 'syncvet-tag-v1',
        tagId: tag,
        issuedAt: new Date().toISOString().split('T')[0],
        pet: {
          id: petId,
          name,
          species,
          breed,
          isVaccinated: vax,
          photoUrl: photo,
        },
        owner: {
          name: ownerName,
          phone: contact,
          address: bgy,
        },
        cvo: {
          office: CVO_OFFICE_NAME,
          hotline: CVO_HOTLINE,
          city: 'Cagayan de Oro City',
        },
      };
    } catch {
      // Fall through to JSON
    }
  }

  // 2. Try parsing JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && (parsed.protocol === 'syncvet-tag-v1' || parsed.pet)) {
      return {
        protocol: 'syncvet-tag-v1',
        tagId: parsed.tagId || generateTagId(parsed.pet?.id || 'UNKNOWN'),
        issuedAt: parsed.issuedAt || new Date().toISOString().split('T')[0],
        pet: {
          id: parsed.pet?.id || '',
          name: parsed.pet?.name || 'Unknown Pet',
          species: parsed.pet?.species || 'dog',
          breed: parsed.pet?.breed,
          gender: parsed.pet?.gender,
          birthYear: parsed.pet?.birthYear,
          isVaccinated: Boolean(parsed.pet?.isVaccinated),
          isSpayedNeutered: Boolean(parsed.pet?.isSpayedNeutered),
          notes: parsed.pet?.notes,
          avatarId: parsed.pet?.avatarId,
          photoUrl: parsed.pet?.photoUrl,
        },
        owner: {
          id: parsed.owner?.id,
          name: parsed.owner?.name || 'Pet Owner',
          phone: parsed.owner?.phone || '',
          address: parsed.owner?.address || '',
        },
        cvo: {
          office: CVO_OFFICE_NAME,
          hotline: CVO_HOTLINE,
          city: 'Cagayan de Oro City',
        },
      };
    }
  } catch {
    // Not valid JSON
  }

  // 2. Fallback: Parse line-by-line format or URL if someone encoded text
  if (trimmed.includes('Pet:') || trimmed.includes('Owner:')) {
    const lines = trimmed.split('\n');
    let petName = 'Unknown Pet';
    let species = 'dog';
    let breed = '';
    let ownerName = 'Pet Owner';
    let ownerPhone = '';
    let ownerAddress = '';

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith('pet:') || lower.startsWith('name:')) {
        petName = line.split(':')[1]?.trim() || petName;
      } else if (lower.startsWith('species:')) {
        species = line.split(':')[1]?.trim() || species;
      } else if (lower.startsWith('breed:')) {
        breed = line.split(':')[1]?.trim() || breed;
      } else if (lower.startsWith('owner:')) {
        ownerName = line.split(':')[1]?.trim() || ownerName;
      } else if (lower.startsWith('phone:') || lower.startsWith('contact:')) {
        ownerPhone = line.split(':')[1]?.trim() || ownerPhone;
      } else if (lower.startsWith('address:')) {
        ownerAddress = line.split(':')[1]?.trim() || ownerAddress;
      }
    }

    return {
      protocol: 'syncvet-tag-v1',
      tagId: `CVO-TAG-SCAN`,
      issuedAt: new Date().toISOString().split('T')[0],
      pet: {
        id: '',
        name: petName,
        species,
        breed,
        isVaccinated: true,
      },
      owner: {
        name: ownerName,
        phone: ownerPhone,
        address: ownerAddress,
      },
      cvo: {
        office: CVO_OFFICE_NAME,
        hotline: CVO_HOTLINE,
        city: 'Cagayan de Oro City',
      },
    };
  }

  return null;
}

/**
 * Downloads and saves the pet QR tag as an image (.png).
 * Works reliably across Expo Go, Android, iOS, and Web.
 */
export async function downloadPetTag(
  svgRef: any,
  petName: string,
): Promise<{ success: boolean; uri?: string; error?: string }> {
  return new Promise((resolve) => {
    if (!svgRef || typeof svgRef.toDataURL !== 'function') {
      resolve({ success: false, error: 'QR Code component is not ready.' });
      return;
    }

    svgRef.toDataURL(async (dataURL: string) => {
      try {
        if (!dataURL) {
          resolve({ success: false, error: 'Could not generate QR image data.' });
          return;
        }

        const cleanName = (petName || 'Pet').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `SyncVet_Tag_${cleanName}_${Date.now()}.png`;

        // Web direct download
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          const link = document.createElement('a');
          link.href = `data:image/png;base64,${dataURL}`;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          resolve({ success: true });
          return;
        }

        // Android direct file save using StorageAccessFramework
        if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
          try {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                filename,
                'image/png'
              );
              await FileSystem.writeAsStringAsync(safUri, dataURL, {
                encoding: FileSystem.EncodingType.Base64,
              });
              resolve({ success: true, uri: safUri });
              return;
            }
          } catch (safErr) {
            console.warn('StorageAccessFramework dismissed, falling back to share:', safErr);
          }
        }

        // Native (Android / iOS) file write to cache
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, dataURL, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Trigger native image save/download sheet
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'image/png',
            dialogTitle: `Download ${petName}’s Digital Pet Tag`,
            UTI: 'public.png',
          });
          resolve({ success: true, uri: fileUri });
        } else {
          resolve({
            success: true,
            uri: fileUri,
          });
        }
      } catch (err: any) {
        console.error('downloadPetTag error:', err);
        resolve({ success: false, error: err?.message || 'Failed to download pet tag image.' });
      }
    });
  });
}

/**
 * Kept for backwards compatibility.
 */
export async function sharePetTag(
  svgRef: any,
  petName: string,
): Promise<{ success: boolean; uri?: string; error?: string }> {
  return downloadPetTag(svgRef, petName);
}
