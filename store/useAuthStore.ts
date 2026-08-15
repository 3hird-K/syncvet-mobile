import { create } from 'zustand';

import { getAuthService, AuthError } from '@services/auth';
import type {
  AuthUser,
  GoogleProfile,
  SignInParams,
  SignUpParams,
} from '@services/auth';

type AuthStatus = 'idle' | 'restoring' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  authLoading: boolean;
  user: AuthUser | null;
  token: string | null;
  setAuthLoading: (loading: boolean) => void;
  restoreSession: () => Promise<void>;
  googleSignIn: (profile: GoogleProfile) => Promise<void>;
  signIn: (params: SignInParams) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  saveOwnerProfile: (mobileNumber: string, address: string) => Promise<void>;
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

  saveOwnerProfile: async (mobileNumber, address) => {
    const user = get().user;
    if (!user) {
      throw new AuthError('UNKNOWN', 'No active session.');
    }
    const updated: AuthUser = {
      ...user,
      mobileNumber: mobileNumber.trim(),
      address: address.trim(),
    };
    await getAuthService().updateUser(updated);
    set({ user: updated });
  },

  markRegistrationComplete: async () => {
    const user = get().user;
    if (!user || user.profileCompleted) return;
    const updated: AuthUser = { ...user, profileCompleted: true };
    await getAuthService().updateUser(updated);
    set({ user: updated });
  },

  signOut: async () => {
    try {
      await getAuthService().signOut();
    } finally {
      set({ status: 'unauthenticated', user: null, token: null });
    }
  },
}));
