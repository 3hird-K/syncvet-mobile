export type ValidationRule = {
  validate: (value: string) => boolean;
  message: string;
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PH_PHONE_RE = /^(09|\+639|639)\d{9}$/;

export function detectPhilippineTelco(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  let prefix = '';
  if (digits.startsWith('639') && digits.length >= 5) {
    prefix = '09' + digits.slice(3, 5);
  } else if (digits.startsWith('09') && digits.length >= 4) {
    prefix = digits.slice(0, 4);
  } else if (digits.startsWith('9') && digits.length >= 3) {
    prefix = '0' + digits.slice(0, 3);
  }

  if (!prefix) return null;

  const ditoPrefixes = ['0991', '0992', '0993', '0994', '0895', '0896', '0897', '0898'];
  const globePrefixes = [
    '0905', '0906', '0915', '0916', '0917', '0926', '0927', '0935', '0936', '0937',
    '0945', '0953', '0954', '0955', '0956', '0965', '0966', '0967', '0975', '0976',
    '0977', '0978', '0979', '0995', '0996', '0997'
  ];
  const smartPrefixes = [
    '0907', '0908', '0909', '0910', '0911', '0912', '0918', '0919', '0920', '0921',
    '0928', '0929', '0930', '0938', '0939', '0940', '0946', '0947', '0948', '0949',
    '0950', '0951', '0961', '0962', '0963', '0964', '0968', '0969', '0970', '0971',
    '0981', '0982', '0985', '0989', '0998', '0999'
  ];

  if (ditoPrefixes.includes(prefix)) return 'DITO Valid';
  if (globePrefixes.includes(prefix)) return 'Globe Valid';
  if (smartPrefixes.includes(prefix)) return 'Smart Valid';
  if (digits.length >= 10) return 'Valid Telco';
  return null;
}

export function formatPhilippinePhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
}

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
  validate: (value) => {
    const cleaned = value.replace(/[\s\-().]/g, '');
    return PH_PHONE_RE.test(cleaned);
  },
  message: 'Enter a valid 11-digit Philippine mobile number (e.g. 09171234567).',
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
