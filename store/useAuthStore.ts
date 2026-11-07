import { create } from 'zustand';

import { getAuthService, AuthError } from '@services/auth';
import { supabase } from '@lib/supabase';
import { useDataStore } from './useDataStore';
import type {
  AuthUser,
  GoogleProfile,
  SignInParams,
  SignUpParams,
  UserRole,
} from '@services/auth';

type AuthStatus = 'idle' | 'restoring' | 'authenticated' | 'unauthenticated';

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
    firstName: string;
    lastName: string;
    fullName?: string;
    mobileNumber: string;
    barangay: string;
    street: string;
    landmark?: string;
    smsNotificationsEnabled: boolean;
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
    const currentUser = get().user;

    // Fetch live resident record from Supabase public.users
    let dbUser: any = null;
    let dbError: any = null;
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

    // If resident completed their registration previously, but row in public.users is gone:
    // This signifies the account was deleted in Supabase. Sign out immediately!
    if (!dbError && !dbUser && currentUser?.profileCompleted) {
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

    const mobileNumber =
      dbUser?.phone_number ||
      clerkUser.primaryPhoneNumber?.phoneNumber ||
      currentUser?.mobileNumber ||
      '';

    const address = dbUser?.address || currentUser?.address || '';

    const profileCompleted = Boolean(
      dbUser?.profile_completed ?? currentUser?.profileCompleted,
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
    set({
      status: 'authenticated',
      user: updatedUser,
      token: get().token || `token_${updatedUser.id}`,
    });
  },

  googleSignIn: async (profile) => {
    const session = await getAuthService().signInWithGoogle(profile);
    set({ status: 'authenticated', user: session.user, token: session.token });
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

    // Persist directly to Supabase public.users
    try {
      await supabase
        .from('users')
        .update({
          phone_number: cleanMobile,
          address: cleanAddress,
          full_name: cleanName,
          first_name: cleanFirst || null,
          last_name: cleanLast || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch (err: any) {
      console.warn('Supabase saveOwnerProfile note:', err?.message);
    }

    const updated: AuthUser = {
      ...user,
      fullName: cleanName,
      mobileNumber: cleanMobile,
      address: cleanAddress,
      updatedAt: new Date().toISOString(),
    };
    await getAuthService().updateUser(updated);
    set({ user: updated });
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
    const cleanAddress = `${payload.street.trim()}, ${payload.barangay.trim()}, Cagayan de Oro City, Misamis Oriental`;
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
      accountType: 'pet_owner',
      phoneNumber: cleanMobile,
      mobileNumber: cleanMobile,
      streetAddress: payload.street.trim(),
      profileCompleted: true,
      emergencyContactName: payload.emergencyContactName?.trim() || '',
      emergencyContactPhone: payload.emergencyContactPhone?.trim() || '',
      emergencyContactRelation: cleanRelation,
    };

    try {
      const now = new Date().toISOString();
      const { data: updatedRows } = await supabase
        .from('users')
        .update({
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
        })
        .eq('id', targetUserId)
        .select();

      if (!updatedRows || updatedRows.length === 0) {
        await supabase
          .from('users')
          .upsert(
            {
              id: targetUserId,
              email: user?.email || `${targetUserId}@resident.syncvet.app`,
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
          );
      }
    } catch (err: any) {
      console.warn('[useAuthStore] completeResidentOnboarding error:', err?.message);
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
  },

  markRegistrationComplete: async () => {
    const user = get().user;
    if (!user || user.profileCompleted) return;

    // Persist directly to Supabase public.users
    try {
      await supabase
        .from('users')
        .update({
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch (err: any) {
      console.warn('Supabase markRegistrationComplete note:', err?.message);
    }

    const updated: AuthUser = {
      ...user,
      profileCompleted: true,
      updatedAt: new Date().toISOString(),
    };
    await getAuthService().updateUser(updated);
    set({ user: updated });
  },

  signOut: async () => {
    try {
      await getAuthService().signOut();
    } finally {
      useDataStore.getState().reset();
      set({ status: 'unauthenticated', user: null, token: null });
    }
  },
}));
