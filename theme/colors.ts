export const colors = {
  primary: '#0F7B6E',
  primaryDark: '#0A6E64',
  primaryStrong: '#085B53',
  primaryLight: '#E6F5F2',
  primaryLighter: '#F0FAF8',

  accent: '#F59E0B',
  accentDark: '#B45309',
  accentLight: '#FEF3E2',

  success: '#16A34A',
  successDark: '#15803D',
  successLight: '#E8F7EE',

  warning: '#D97706',
  warningDark: '#B45309',
  warningLight: '#FEF6E7',

  error: '#DC2626',
  errorDark: '#B91C1C',
  errorLight: '#FDEBEB',

  info: '#2563EB',
  infoLight: '#EAF0FE',

  background: '#F7FAF9',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF5F2',
  surfacePressed: '#E4EFEC',

  textPrimary: '#10201D',
  textSecondary: '#3E4F4B',
  textMuted: '#6B7F7A',
  textDisabled: '#A6B8B3',

  border: '#DDE9E5',
  borderStrong: '#C2D6D1',

  white: '#FFFFFF',
  black: '#000000',

  overlay: 'rgba(16, 32, 29, 0.55)',
  scrim: 'rgba(16, 32, 29, 0.35)',
} as const;

export type ColorName = keyof typeof colors;
