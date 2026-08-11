import type { AuthErrorCode } from './types';
import type {
  AuthSession,
  AuthUser,
  GoogleProfile,
  SignInParams,
  SignUpParams,
} from './types';

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly field?: 'email' | 'password' | 'fullName' | 'mobileNumber';

  constructor(
    code: AuthErrorCode,
    message: string,
    field?: 'email' | 'password' | 'fullName' | 'mobileNumber',
  ) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.field = field;
  }
}

export interface AuthService {
  restoreSession(): Promise<AuthSession | null>;
  signInWithGoogle(profile: GoogleProfile): Promise<AuthSession>;
  signIn(params: SignInParams): Promise<AuthSession>;
  signUp(params: SignUpParams): Promise<AuthSession>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updateUser(user: AuthUser): Promise<void>;
}
