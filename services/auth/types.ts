export type UserRole = 'resident';

export type AuthProvider = 'google' | 'email';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  address: string;
  photoUrl?: string;
  authProvider: AuthProvider;
  /** True once the owner has completed first-run registration (mobile + address + first pet). */
  profileCompleted: boolean;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

/** Profile returned by Google identity (mock in this phase). */
export interface GoogleProfile {
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
