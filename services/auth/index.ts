import { MockAuthService } from './mockAuthService';
import type { AuthService } from './AuthService';

export { AuthError } from './AuthService';
export type { AuthService } from './AuthService';
export * from './types';

let instance: AuthService | null = null;

/**
 * Single source of truth for the active auth backend.
 * Swap `MockAuthService` for a real HTTP-backed implementation here.
 */
export function getAuthService(): AuthService {
  if (!instance) {
    instance = new MockAuthService();
  }
  return instance;
}
