import { create } from 'zustand';

import { getAuthService, AuthError } from '@services/auth';
import { supabase } from '@lib/supabase';
import { withTimeout } from '@lib/asyncUtils';
import { buildCDOAddress } from '@lib/philippineAddresses';
import { networkService } from '@services/network';
import { syncEngine, syncQueue } from '@services/sync';
import { useDataStore } from './useDataStore';
import type {
  AuthUser,
  GoogleProfile,
  SignInParams,
  SignUpParams,
  UserRole,
} from '@services/auth';

type AuthStatus = 'idle' | 'restoring' | 'authenticated' | 'unauthenticated';

/** Incremented on every sign-out so an in-flight profile sync cannot restore a
 *  session that the user just ended. */
let sessionEpoch = 0;

interface AuthState {
  status: AuthStatus;
  authLoading: boolean;
  user: AuthUser | null;
  token: string | null;
  setAuthLoading: (loading: boolean) => void;
  restoreSession: () => Promise<void>;
  syncUserFromClerk: (clerkUser: any) => Promise<void>;
  googleSignIn: (profile: GoogleProfile) => Promise<void>;
  signIn: (params: SignInParams) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  saveOwnerProfile: (
    mobileNumber: string,
    address: string,
    fullName?: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>;
  completeResidentOnboarding: (payload: {
    email?: string;
    firstName: string;
    lastName: string;
    fullName?: string;
    mobileNumber: string;
    barangay: string;
    street: string;
    landmark?: string;
    smsNotificationsEnabled: boolean;
    smsConsentUpdatedAt?: string;
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
    emergencyContactPhone?: string;
    caredAnimals?: ('dogs' | 'cats')[];
    healthDeclarationAgreed: boolean;
    explicitUserId?: string;
  }) => Promise<void>;
  markRegistrationComplete: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  authLoading: false,
  user: null,
  token: null,

  setAuthLoading: (loading: boolean) => set({ authLoading: loading }),

  restoreSession: async () => {
    set({ status: 'restoring' });
    try {
      const session = await getAuthService().restoreSession();
      if (session) {
        set({
          status: 'authenticated',
          user: session.user,
          token: session.token,
        });
      } else {
        set({ status: 'unauthenticated', user: null, token: null });
      }
    } catch {
      set({ status: 'unauthenticated', user: null, token: null });
    }
  },

  syncUserFromClerk: async (clerkUser) => {
    if (!clerkUser) return;
    const epoch = sessionEpoch;
    const currentUser = get().user;

    // Only query Supabase when we actually have connectivity. A cold start while
    // offline must reuse the last locally cached profile instead of blocking the
    // router or mistaking a network failure for a deleted account.
    const isOnline = networkService.isOnline();
    let dbUser: any = null;
    let dbError: any = null;
    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', clerkUser.id)
          .maybeSingle();
        dbUser = data;
        dbError = error;
      } catch (err) {
        dbError = err;
      }
    }

    // If resident completed their registration previously, but row in public.users is gone:
    // This signifies the account was deleted in Supabase. Sign out immediately!
    if (isOnline && !dbError && !dbUser && currentUser?.profileCompleted) {
      console.warn('[useAuthStore] Resident profile was deleted from Supabase. Signing out.');
      await get().signOut();
      return;
    }

    const email =
      clerkUser.primaryEmailAddress?.emailAddress ||
      dbUser?.email ||
      currentUser?.email ||
      'resident@syncvet.app';

    const fullName =
      dbUser?.full_name ||
      clerkUser.fullName ||
      (clerkUser.firstName
        ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
        : '') ||
      currentUser?.fullName ||
      'Resident';

    const photoUrl = clerkUser.imageUrl || dbUser?.avatar_url || currentUser?.photoUrl;

    const dbMeta = (dbUser?.raw_user_meta_data as any) || {};

    const mobileNumber =
      dbUser?.phone_number ||
      dbMeta.phoneNumber ||
      dbMeta.mobileNumber ||
      clerkUser.primaryPhoneNumber?.phoneNumber ||
      currentUser?.mobileNumber ||
      '';

    const address =
      dbUser?.address ||
      dbMeta.address ||
      currentUser?.address ||
      '';

    // Supabase's profile_completed is authoritative. Some older rows keep the
    // phone/address only in raw_user_meta_data; requiring the plain columns
    // made completed residents look incomplete and briefly routed them through
    // registration before this flag won.
    const profileCompleted = Boolean(
      dbUser ? dbUser.profile_completed : currentUser?.profileCompleted && mobileNumber && address,
    );

    const role: UserRole =
      dbUser?.role ||
      (clerkUser.publicMetadata?.role as string) ||
      currentUser?.role ||
      'resident';

    const updatedUser: AuthUser = {
      id: clerkUser.id || currentUser?.id || `usr_${Date.now().toString(36)}`,
      fullName,
      firstName: dbUser?.first_name || clerkUser.firstName,
      lastName: dbUser?.last_name || clerkUser.lastName,
      email,
      mobileNumber,
      address,
      photoUrl,
      authProvider: (currentUser?.authProvider || 'google'),
      profileCompleted,
      role,
      rawUserMetaData: dbUser?.raw_user_meta_data || currentUser?.rawUserMetaData,
      createdAt: dbUser?.created_at || currentUser?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await getAuthService().updateUser(updatedUser);
    if (epoch !== sessionEpoch) return;
    set({
      status: 'authenticated',
      user: updatedUser,
      token: get().token || `token_${updatedUser.id}`,
    });
  },

  googleSignIn: async (profile) => {
    const session = await getAuthService().signInWithGoogle(profile);
    let user = session.user;

    // The local session cache can lag behind Supabase (older bundles saved
    // profileCompleted=false even after onboarding finished). Hydrate the
    // authoritative row BEFORE publishing the user so route guards never flash
    // the registration screens for an already-completed resident.
    if (networkService.isOnline()) {
      try {
        const { data: dbUser } = await withTimeout(
          async () =>
            supabase
              .from('users')
              .select('*')
              .eq('id', profile.id || user.id)
              .maybeSingle(),
          4000,
          'Profile hydration timed out',
        );

        if (dbUser) {
          const dbMeta = (dbUser.raw_user_meta_data as any) || {};
          const mobileNumber =
            dbUser.phone_number ||
            dbMeta.phoneNumber ||
            dbMeta.mobileNumber ||
            user.mobileNumber ||
            '';
          const address = dbUser.address || dbMeta.address || user.address || '';

          user = {
            ...user,
            fullName: dbUser.full_name || user.fullName,
            firstName: dbUser.first_name || user.firstName,
            lastName: dbUser.last_name || user.lastName,
            photoUrl: dbUser.avatar_url || user.photoUrl,
            mobileNumber,
            address,
            role: dbUser.role || user.role,
            rawUserMetaData:
              (dbUser.raw_user_meta_data as Record<string, any> | null) ||
              user.rawUserMetaData,
            profileCompleted: Boolean(dbUser.profile_completed),
          };
          await getAuthService().updateUser(user);
        }
      } catch (err) {
        console.warn('[useAuthStore] Google profile hydration note:', err);
      }
    }

    set({ status: 'authenticated', user, token: session.token });
  },

  signIn: async (params) => {
    const session = await getAuthService().signIn(params);
    set({ status: 'authenticated', user: session.user, token: session.token });
  },

  signUp: async (params) => {
    const session = await getAuthService().signUp(params);
    set({ status: 'authenticated', user: session.user, token: session.token });
  },

  saveOwnerProfile: async (mobileNumber, address, fullName, firstNameArg, lastNameArg) => {
    const user = get().user;
    if (!user) {
      throw new AuthError('UNKNOWN', 'No active session.');
    }
    const cleanMobile = mobileNumber.trim();
    const cleanAddress = address.trim();

    let cleanFirst = firstNameArg?.trim();
    let cleanLast = lastNameArg?.trim();
    let cleanName = fullName?.trim();

    if (!cleanFirst && !cleanLast && cleanName) {
      const parts = cleanName.split(' ');
      cleanFirst = parts[0] || cleanName;
      cleanLast = parts.slice(1).join(' ') || undefined;
    } else if (cleanFirst) {
      cleanName = cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst;
    } else if (!cleanName) {
      cleanName = user.fullName;
    }

    // Persist locally first. The durable queue delivers the change to Supabase
    // when connectivity returns, so profile edits work in airplane mode too.
    const updated: AuthUser = {
      ...user,
      fullName: cleanName,
      firstName: cleanFirst ?? user.firstName,
      lastName: cleanLast ?? user.lastName,
      mobileNumber: cleanMobile,
      address: cleanAddress,
      updatedAt: new Date().toISOString(),
    };
    await getAuthService().updateUser(updated);
    set({ user: updated });

    await syncQueue.enqueue(user.id, 'profile', user.id, 'UPDATE_PROFILE', {
      mobileNumber: cleanMobile,
      address: cleanAddress,
      fullName: cleanName,
      firstName: cleanFirst,
      lastName: cleanLast,
      profileCompleted: user.profileCompleted,
    });
    syncEngine.sync(user.id).catch(() => {});
  },

  completeResidentOnboarding: async (payload) => {
    const user = get().user;
    const targetUserId =
      payload.explicitUserId ||
      (user?.id?.startsWith('user_') ? user.id : undefined) ||
      user?.id;

    if (!targetUserId) {
      throw new AuthError('UNKNOWN', 'No active session.');
    }

    const cleanMobile = payload.mobileNumber.trim();
    const cleanAddress = buildCDOAddress(
      payload.street,
      payload.barangay,
      payload.landmark,
    );
    const cleanFirst = payload.firstName.trim();
    const cleanLast = payload.lastName.trim();
    const cleanName = (payload.fullName || `${cleanFirst} ${cleanLast}`).trim() || user?.fullName || 'Resident';

    const petTypes = (payload.caredAnimals || ['dogs']).map((a) =>
      a === 'dogs' ? 'Dogs' : 'Cats',
    );

    const cleanRelation =
      payload.emergencyContactRelationship === 'Spouse / Partner'
        ? 'Spouse'
        : (payload.emergencyContactRelationship?.trim() || 'Spouse');

    const metadata = {
      address: cleanAddress,
      barangay: payload.barangay.trim(),
      landmark: payload.landmark?.trim() || '',
      petTypes,
      roleTitle: 'Pet Owner',
      smsConsent: payload.smsNotificationsEnabled,
      smsConsentUpdatedAt:
        payload.smsConsentUpdatedAt || new Date().toISOString(),
      accountType: 'pet_owner',
      phoneNumber: cleanMobile,
      mobileNumber: cleanMobile,
      streetAddress: payload.street.trim(),
      profileCompleted: true,
      emergencyContactName: payload.emergencyContactName?.trim() || '',
      emergencyContactPhone: payload.emergencyContactPhone?.trim() || '',
      emergencyContactRelation: cleanRelation,
    };

    // Online sessions get an immediate best-effort write so the profile is
    // available to other devices right away. Offline sessions skip it entirely;
    // the durable queue below is the single source of truth in both cases.
    if (networkService.isOnline()) {
      const now = new Date().toISOString();
      const { data: savedRows, error: saveError } = await supabase
        .from('users')
        .upsert(
          {
            id: targetUserId,
            email: payload.email?.trim() || user?.email || `${targetUserId}@resident.syncvet.app`,
            phone_number: cleanMobile,
            address: cleanAddress,
            full_name: cleanName,
            first_name: cleanFirst || null,
            last_name: cleanLast || null,
            avatar_url: user?.photoUrl || null,
            role: 'Pet Owner',
            profile_completed: true,
            raw_user_meta_data: metadata,
            updated_at: now,
          },
          { onConflict: 'id' },
        )
        .select('id');

      if (saveError) {
        throw new AuthError('UNKNOWN', `Could not save profile: ${saveError.message}`);
      }
      if (!savedRows || savedRows.length === 0) {
        throw new AuthError('UNKNOWN', 'Profile was not saved to the database.');
      }
    }

    const updated: AuthUser = {
      ...(user || {
        id: targetUserId,
        email: `${targetUserId}@resident.syncvet.app`,
        authProvider: 'google',
        role: 'resident',
        createdAt: new Date().toISOString(),
      }),
      id: targetUserId,
      fullName: cleanName,
      firstName: cleanFirst,
      lastName: cleanLast,
      mobileNumber: cleanMobile,
      address: cleanAddress,
      profileCompleted: true,
      role: 'resident',
      rawUserMetaData: metadata,
      updatedAt: new Date().toISOString(),
    };
    await getAuthService().updateUser(updated);
    set({ user: updated });

    // Queue the complete onboarding payload. If the app was offline, this is
    // applied by SyncEngine as soon as connectivity returns.
    await syncQueue.enqueue(targetUserId, 'profile', targetUserId, 'UPDATE_PROFILE', {
      email: updated.email,
      firstName: cleanFirst,
      lastName: cleanLast,
      fullName: cleanName,
      mobileNumber: cleanMobile,
      address: cleanAddress,
      profileCompleted: true,
      avatarUrl: user?.photoUrl,
      role: 'Pet Owner',
      metadata,
    });
    syncEngine.sync(targetUserId).catch(() => {});
  },

  markRegistrationComplete: async () => {
    const user = get().user;
    if (!user || user.profileCompleted) return;

    const updated: AuthUser = {
      ...user,
      profileCompleted: true,
      updatedAt: new Date().toISOString(),
    };
    await getAuthService().updateUser(updated);
    set({ user: updated });

    // The completion flag is part of the same durable profile queue as edits,
    // so a pet registration finished offline still syncs its profile state.
    await syncQueue.enqueue(user.id, 'profile', user.id, 'UPDATE_PROFILE', {
      profileCompleted: true,
    });
    syncEngine.sync(user.id).catch(() => {});
  },

  signOut: async () => {
    sessionEpoch += 1;
    // Clear in-memory auth synchronously so the (main) navigator unmounts (and
    // the tab bar disappears) immediately. Storage cleanup follows with a hard
    // deadline so an unavailable keychain cannot strand the sign-out flow.
    useDataStore.getState().reset();
    set({ status: 'unauthenticated', user: null, token: null, authLoading: false });

    try {
      await withTimeout(
        () => getAuthService().signOut(),
        2000,
        'Local session cleanup timed out',
      );
    } catch (error) {
      console.warn('[useAuthStore] Local session cleanup note:', error);
    }
  },
}));
