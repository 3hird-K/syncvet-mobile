import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '../database.types';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ufkhazeuphhirffopeim.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_qda13c10uDZglpSEH5bFtw_RZYc7Jd1';

type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

/**
 * Configure the active Clerk token provider.
 * When set, every outgoing request to Supabase dynamically attaches the active
 * Clerk JWT in the `Authorization: Bearer <token>` header, authenticating
 * requests against Supabase's Clerk Third-Party Auth integration.
 */
export function setSupabaseTokenProvider(provider: TokenProvider | null) {
  tokenProvider = provider;
}

export async function getClerkSupabaseToken(): Promise<string | null> {
  if (!tokenProvider) return null;
  try {
    return await tokenProvider();
  } catch (error) {
    console.warn('Failed to retrieve Clerk token for Supabase:', error);
    return null;
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  accessToken: async () => {
    return await getClerkSupabaseToken();
  },
  global: {
    fetch: async (url, options = {}) => {
      const headers = new Headers(options.headers);
      const token = await getClerkSupabaseToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(url, {
        ...options,
        headers,
      });
    },
  },
});

