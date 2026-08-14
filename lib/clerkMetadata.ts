export interface UserActivityItem {
  id: string;
  type: 'booking' | 'confirmed' | 'completed' | 'registration';
  title: string;
  detail: string;
  date: string;
}

const SERVICE_TITLES: Record<string, string> = {
  consultation: 'Consultation',
  vaccination: 'Vaccination',
  'spay-neuter': 'Spay & Neuter',
  deworming: 'Deworming',
  'pet-registration': 'Pet Registration',
  other: 'Veterinary Service',
};

/**
 * Derives and returns real activities strictly for the signed-in user from Clerk metadata:
 * - Registered pets
 * - Booked & confirmed appointments
 * - Explicit logged activities
 * Sorted chronologically descending (newest first).
 */
export function getUserActivities(clerkUser: any): UserActivityItem[] {
  if (!clerkUser) return [];
  const metadata = (clerkUser.unsafeMetadata || {}) as Record<string, any>;

  const activities: UserActivityItem[] = [];

  // 1. Explicit activities array from metadata if stored
  const explicitActivities = Array.isArray(metadata.activities) ? metadata.activities : [];
  for (const act of explicitActivities) {
    if (act && act.title && act.date) {
      activities.push({
        id: act.id || `act-${act.date}-${Math.random()}`,
        type: act.type || 'booking',
        title: act.title,
        detail: act.detail || '',
        date: act.date,
      });
    }
  }

  // 2. Derive from real registered pets
  const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];
  for (const p of metaPets) {
    if (p && p.name) {
      const petDate = p.createdAt || p.registeredAt || new Date().toISOString();
      const speciesTitle =
        p.species?.toLowerCase() === 'dog'
          ? 'Dog'
          : p.species?.toLowerCase() === 'cat'
            ? 'Cat'
            : p.species || 'Pet';
      const breedText = p.breed ? ` · ${p.breed}` : '';

      activities.push({
        id: `pet-reg-${p.id || p.name}`,
        type: 'registration',
        title: `${p.name} registered`,
        detail: `${speciesTitle}${breedText}`,
        date: petDate,
      });
    }
  }

  // 3. Derive from real appointments
  const metaAppts = Array.isArray(metadata.appointments) ? metadata.appointments : [];
  for (const a of metaAppts) {
    if (a && (a.petName || a.serviceId)) {
      const apptDate = a.createdAt || (a.date ? `${a.date}T08:00:00.000Z` : new Date().toISOString());
      const serviceName = SERVICE_TITLES[a.serviceId] || 'Veterinary Service';
      let actType: 'booking' | 'confirmed' | 'completed' = 'booking';
      let actTitle = 'Appointment request submitted';

      if (a.status === 'confirmed') {
        actType = 'confirmed';
        actTitle = 'Appointment confirmed';
      } else if (a.status === 'completed') {
        actType = 'completed';
        actTitle = 'Visit completed';
      } else if (a.status === 'cancelled') {
        actTitle = 'Appointment cancelled';
      }

      activities.push({
        id: `appt-act-${a.id || a.date}-${a.serviceId}`,
        type: actType,
        title: actTitle,
        detail: `${a.petName || 'Pet'} · ${serviceName}`,
        date: apptDate,
      });
    }
  }

  // Deduplicate and sort chronologically (newest first)
  const seen = new Set<string>();
  const unique: UserActivityItem[] = [];

  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const item of activities) {
    const key = `${item.type}:${item.title}:${item.detail}:${item.date.slice(0, 16)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique;
}

/**
 * Safely updates Clerk user metadata using updateMetadata (deep merge)
 * to prevent deprecation warnings in newer @clerk/expo releases,
 * with fallback to update() if updateMetadata is unavailable.
 */
export async function updateClerkUnsafeMetadata(
  clerkUser: any,
  unsafeMetadata: Record<string, any>,
): Promise<void> {
  if (!clerkUser) return;
  try {
    if (typeof clerkUser.updateMetadata === 'function') {
      await clerkUser.updateMetadata({
        unsafeMetadata,
      });
    } else if (typeof clerkUser.update === 'function') {
      await clerkUser.update({
        unsafeMetadata: {
          ...(clerkUser.unsafeMetadata || {}),
          ...unsafeMetadata,
        },
      });
    }
  } catch (error) {
    console.log('Clerk metadata update note:', error);
  }
}
