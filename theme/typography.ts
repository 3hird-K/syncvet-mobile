import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';

const font = {
  family: 'PlusJakartaSans',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

const lineHeightMultiplier = Platform.OS === 'ios' ? 1.15 : 1.25;

export const typography = {
  fontFamily: font.family,
  font: font,

  display: {
    fontFamily: font.extrabold,
    fontSize: 40,
    lineHeight: Math.round(40 * 1.15),
    letterSpacing: -0.5,
  } as TextStyle,
  heading1: {
    fontFamily: font.extrabold,
    fontSize: 32,
    lineHeight: Math.round(32 * lineHeightMultiplier),
    letterSpacing: -0.3,
  } as TextStyle,
  heading2: {
    fontFamily: font.bold,
    fontSize: 26,
    lineHeight: Math.round(26 * lineHeightMultiplier),
    letterSpacing: -0.2,
  } as TextStyle,
  heading3: {
    fontFamily: font.bold,
    fontSize: 22,
    lineHeight: Math.round(22 * lineHeightMultiplier),
  } as TextStyle,
  title: {
    fontFamily: font.semibold,
    fontSize: 18,
    lineHeight: Math.round(18 * lineHeightMultiplier),
  } as TextStyle,
  body: {
    fontFamily: font.regular,
    fontSize: 16,
    lineHeight: Math.round(16 * lineHeightMultiplier * 1.5),
  } as TextStyle,
  bodyMedium: {
    fontFamily: font.medium,
    fontSize: 16,
    lineHeight: Math.round(16 * lineHeightMultiplier * 1.5),
  } as TextStyle,
  bodyLarge: {
    fontFamily: font.regular,
    fontSize: 18,
    lineHeight: Math.round(18 * lineHeightMultiplier * 1.5),
  } as TextStyle,
  caption: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: Math.round(14 * lineHeightMultiplier * 1.4),
  } as TextStyle,
  captionMedium: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: Math.round(14 * lineHeightMultiplier * 1.4),
  } as TextStyle,
  captionBold: {
    fontFamily: font.semibold,
    fontSize: 14,
    lineHeight: Math.round(14 * lineHeightMultiplier * 1.4),
  } as TextStyle,
  small: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: Math.round(12 * lineHeightMultiplier * 1.4),
  } as TextStyle,
  smallBold: {
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: Math.round(12 * lineHeightMultiplier * 1.4),
  } as TextStyle,
  label: {
    fontFamily: font.semibold,
    fontSize: 13,
    lineHeight: Math.round(13 * lineHeightMultiplier * 1.4),
    letterSpacing: 0.2,
  } as TextStyle,
  button: {
    fontFamily: font.bold,
    fontSize: 16,
    lineHeight: Math.round(16 * lineHeightMultiplier),
  } as TextStyle,
} as const;
