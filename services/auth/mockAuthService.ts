import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { AuthError } from './AuthService';
import type { AuthService } from './AuthService';
import type {
  AuthSession,
  AuthUser,
  GoogleProfile,
  SignInParams,
  SignUpParams,
} from './types';

const SESSION_KEY = 'syncvet.session';
const USERS_KEY = 'syncvet.mockUsers';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type StoredSession = { token: string; user: AuthUser };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return Promise.resolve(localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  }
  return SecureStore.getItemAsync(key);
}

function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
      return Promise.resolve();
    } catch {
      return Promise.resolve();
    }
  }
  return SecureStore.setItemAsync(key, value);
}

function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
      return Promise.resolve();
    } catch {
      return Promise.resolve();
    }
  }
  return SecureStore.deleteItemAsync(key);
}

async function getMockUsers(): Promise<Record<string, AuthUser>> {
  const raw = await secureGet(USERS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, AuthUser>;
  } catch {
    return {};
  }
}

async function saveMockUsers(users: Record<string, AuthUser>): Promise<void> {
  await secureSet(USERS_KEY, JSON.stringify(users));
}

/**
 * Mock implementation of the AuthService used for this phase of the app.
 * Every method mirrors the production contract (latency, error shapes,
 * session persistence) so the real backend can be swapped in later without
 * touching the UI.
 */
export class MockAuthService implements AuthService {
  async restoreSession(): Promise<AuthSession | null> {
    const raw = await secureGet(SESSION_KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as StoredSession;
      if (!session?.token || !session?.user) return null;
      return { token: session.token, user: session.user };
    } catch {
      return null;
    }
  }

  async signInWithGoogle(profile: GoogleProfile): Promise<AuthSession> {
    await delay(900);
    const users = await getMockUsers();
    const email = normalizeEmail(profile.email);

    // Existing user/profile check: known Google email signs straight in,
    // otherwise a resident record is provisioned from the Google profile.
    const existing = users[email];
    if (existing) {
      return this.createSession(existing);
    }

    const user: AuthUser = {
      id: `usr_${Date.now().toString(36)}`,
      fullName: profile.fullName.trim() || 'Resident',
      email,
      mobileNumber: '',
      address: '',
      photoUrl: profile.photoUrl,
      authProvider: 'google',
      profileCompleted: false,
      role: 'resident',
      createdAt: new Date().toISOString(),
    };

    users[email] = user;
    await saveMockUsers(users);

    return this.createSession(user);
  }

  async signIn(params: SignInParams): Promise<AuthSession> {
    await delay(1200);
    const users = await getMockUsers();
    const email = normalizeEmail(params.email);
    const user = users[email];

    if (!user) {
      throw new AuthError(
        'INVALID_CREDENTIALS',
        'The email or password you entered is incorrect.',
        'email',
      );
    }

    if (!params.password) {
      throw new AuthError(
        'INVALID_CREDENTIALS',
        'The email or password you entered is incorrect.',
        'password',
      );
    }

    return this.createSession(user);
  }

  async signUp(params: SignUpParams): Promise<AuthSession> {
    await delay(1600);
    const users = await getMockUsers();
    const email = normalizeEmail(params.email);

    if (users[email]) {
      throw new AuthError(
        'EMAIL_EXISTS',
        'An account with this email already exists. Try signing in instead.',
        'email',
      );
    }

    if (params.password.length < 8) {
      throw new AuthError(
        'WEAK_PASSWORD',
        'Password must be at least 8 characters.',
        'password',
      );
    }

    const user: AuthUser = {
      id: `usr_${Date.now().toString(36)}`,
      fullName: params.fullName.trim(),
      email,
      mobileNumber: params.mobileNumber?.trim() || '',
      address: '',
      authProvider: 'email',
      profileCompleted: false,
      role: 'resident',
      createdAt: new Date().toISOString(),
    };

    users[email] = user;
    await saveMockUsers(users);

    return this.createSession(user);
  }

  async signOut(): Promise<void> {
    await secureDelete(SESSION_KEY);
  }

  async requestPasswordReset(email: string): Promise<void> {
    await delay(1100);
    const users = await getMockUsers();
    const normalized = normalizeEmail(email);
    if (!users[normalized]) {
      // Do not reveal whether an account exists; still resolve silently.
    }
  }

  async updateUser(user: AuthUser): Promise<void> {
    const users = await getMockUsers();
    users[user.email] = user;
    await saveMockUsers(users);
    const session = await this.restoreSession();
    if (session) {
      await secureSet(
        SESSION_KEY,
        JSON.stringify({ token: session.token, user }),
      );
    }
  }

  private async createSession(user: AuthUser): Promise<AuthSession> {
    const session: StoredSession = {
      token: `mock_token_${user.id}_${Date.now().toString(36)}`,
      user,
    };
    await secureSet(SESSION_KEY, JSON.stringify(session));
    return { token: session.token, user: session.user };
  }
}
