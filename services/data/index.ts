import { MockDataService } from './mockDataService';
import type { DataService } from './DataService';

export * from './types';

let instance: DataService | null = null;

/**
 * Single source of truth for the active data backend.
 * Swap `MockDataService` for a real Supabase-backed implementation here.
 */
export function getDataService(): DataService {
  if (!instance) {
    instance = new MockDataService();
  }
  return instance;
}
