export type ValidationRule = {
  validate: (value: string) => boolean;
  message: string;
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^(\+?[0-9]{1,3})?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;

export const required =
  (message = 'This field is required.'): ValidationRule => ({
    validate: (value) => value.trim().length > 0,
    message,
  });

export const emailRule: ValidationRule = {
  validate: (value) => EMAIL_RE.test(value.trim()),
  message: 'Enter a valid email address.',
};

export const minLength =
  (min: number, message?: string): ValidationRule => ({
    validate: (value) => value.length >= min,
    message: message ?? `Must be at least ${min} characters.`,
  });

export const phoneRule: ValidationRule = {
  validate: (value) => PHONE_RE.test(value.trim()),
  message: 'Enter a valid mobile number.',
};

export const matchRule =
  (getMatch: () => string, message = 'Passwords do not match.'): ValidationRule => ({
    validate: (value) => value === getMatch(),
    message,
  });

export function runRules(
  value: string,
  rules: ValidationRule[],
): string | undefined {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }
  return undefined;
}

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) return 'weak';
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 5) return 'strong';
  if (score >= 4) return 'good';
  if (score >= 2) return 'fair';
  return 'weak';
}
