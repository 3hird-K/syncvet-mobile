export type UserRole =
  | 'resident'
  | 'pet_owner'
  | 'veterinarian'
  | 'administrator'
  | 'admin'
  | (string & {});

/**
 * Staff and administrative roles that must NOT access the resident mobile app.
 * Directs them to the web portal instead.
 */
export function isRestrictedStaffRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  return (
    normalized === 'veterinarian' ||
    normalized === 'administrator' ||
    normalized === 'admin' ||
    normalized === 'vet'
  );
}

export function formatRoleTitle(role?: string | null): string {
  if (!role) return 'Pet Owner';
  const normalized = role.trim().toLowerCase();
  if (normalized === 'veterinarian' || normalized === 'vet') return 'Veterinarian';
  if (normalized === 'administrator' || normalized === 'admin') return 'Administrator';
  if (normalized === 'pet_owner' || normalized === 'resident') return 'Pet Owner';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export type AuthProvider = 'google' | 'email';

export interface AuthUser {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  mobileNumber: string;
  address: string;
  photoUrl?: string;
  authProvider: AuthProvider;
  /** True once the owner has completed first-run registration. */
  profileCompleted: boolean;
  role: UserRole;
  rawUserMetaData?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

/** Profile returned by Google identity (mock in this phase). */
export interface GoogleProfile {
  id?: string;
  email: string;
  fullName: string;
  photoUrl?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface SignUpParams {
  fullName: string;
  email: string;
  mobileNumber?: string;
  password: string;
}

export interface AuthErrorShape {
  code: AuthErrorCode;
  message: string;
  field?: 'email' | 'password' | 'fullName' | 'mobileNumber';
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_EXISTS'
  | 'INVALID_EMAIL'
  | 'WEAK_PASSWORD'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';
