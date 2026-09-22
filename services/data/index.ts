import { SupabaseDataService } from './supabaseDataService';
import { MockDataService } from './mockDataService';
import type { DataService } from './DataService';

export * from './types';
export { SupabaseDataService } from './supabaseDataService';

let instance: DataService | null = null;

/**
 * Single source of truth for the active data backend.
 * Uses real Supabase-backed implementation with offline fallback.
 */
export function getDataService(): DataService {
  if (!instance) {
    instance = new SupabaseDataService();
  }
  return instance;
}
