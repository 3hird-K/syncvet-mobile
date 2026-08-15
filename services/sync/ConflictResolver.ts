import type { ActivityItem, Appointment, Pet } from '@services/data/types';
import type { AuthUser } from '@services/auth/types';

export class ConflictResolver {
  /**
   * Merges local and remote pet lists using Last-Write-Wins and ID matching.
   */
  public static mergePets(localPets: Pet[], remotePets: Pet[]): Pet[] {
    const petMap = new Map<string, Pet>();

    // 1. Add all remote pets
    for (const remote of remotePets) {
      if (remote && remote.id) {
        petMap.set(remote.id, remote);
      }
    }

    // 2. Merge local pets
    for (const local of localPets) {
      if (!local || !local.id) continue;

      const existingRemote = petMap.get(local.id);
      if (!existingRemote) {
        // Exists locally only (e.g. offline created or pending)
        petMap.set(local.id, local);
      } else {
        // Both exist: compare updatedAt/createdAt timestamps
        const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
        const remoteTime = new Date(existingRemote.updatedAt || existingRemote.createdAt || 0).getTime();

        if (localTime >= remoteTime) {
          petMap.set(local.id, {
            ...existingRemote,
            ...local,
          });
        } else {
          petMap.set(local.id, {
            ...local,
            ...existingRemote,
          });
        }
      }
    }

    return Array.from(petMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Merges local and remote appointments.
   */
  public static mergeAppointments(localAppts: Appointment[], remoteAppts: Appointment[]): Appointment[] {
    const apptMap = new Map<string, Appointment>();

    for (const remote of remoteAppts) {
      if (remote && remote.id) {
        apptMap.set(remote.id, remote);
      }
    }

    for (const local of localAppts) {
      if (!local || !local.id) continue;

      const existingRemote = apptMap.get(local.id);
      if (!existingRemote) {
        apptMap.set(local.id, local);
      } else {
        const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
        const remoteTime = new Date(existingRemote.updatedAt || existingRemote.createdAt || 0).getTime();

        if (localTime >= remoteTime) {
          apptMap.set(local.id, { ...existingRemote, ...local });
        } else {
          apptMap.set(local.id, { ...local, ...existingRemote });
        }
      }
    }

    return Array.from(apptMap.values()).sort((a, b) =>
      a.date === b.date ? a.timeSlot.localeCompare(b.timeSlot) : a.date.localeCompare(b.date),
    );
  }

  /**
   * Merges user profile details (mobile number, address, full name).
   */
  public static mergeProfile(local: AuthUser, remote: Partial<AuthUser>): AuthUser {
    const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
    const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();

    if (localTime >= remoteTime) {
      return {
        ...local,
        fullName: local.fullName || remote.fullName || '',
        mobileNumber: local.mobileNumber || remote.mobileNumber || '',
        address: local.address || remote.address || '',
        profileCompleted: Boolean(local.profileCompleted || remote.profileCompleted),
      };
    }

    return {
      ...local,
      fullName: remote.fullName || local.fullName || '',
      mobileNumber: remote.mobileNumber || local.mobileNumber || '',
      address: remote.address || local.address || '',
      profileCompleted: Boolean(remote.profileCompleted || local.profileCompleted),
    };
  }

  /**
   * Merges activity items, deduplicating and sorting newest first.
   */
  public static mergeActivity(local: ActivityItem[], remote: ActivityItem[]): ActivityItem[] {
    const map = new Map<string, ActivityItem>();

    for (const item of remote) {
      if (item && item.id) map.set(item.id, item);
    }

    for (const item of local) {
      if (item && item.id) map.set(item.id, item);
    }

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }
}
