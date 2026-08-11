import React from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors } from '@theme';

interface RegistrationIllustrationProps {
  size?: number;
}

/** Mobile appointment / registration concept for onboarding slide 2. */
export function RegistrationIllustration({ size = 260 }: RegistrationIllustrationProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 260 260"
      accessibilityRole="image"
      accessibilityLabel="Mobile registration illustration"
    >
      <Defs>
        <LinearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primaryLighter} />
          <Stop offset="1" stopColor={colors.primaryLight} />
        </LinearGradient>
        <LinearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={colors.primaryLighter} />
        </LinearGradient>
      </Defs>

      <Circle cx="130" cy="150" r="112" fill="url(#bg2)" opacity="0.6" />

      {/* floating card behind */}
      <G transform="rotate(-8 118 142)">
        <Rect x="66" y="98" width="150" height="104" rx="16" fill="#FFFFFF" opacity="0.55" />
      </G>

      {/* phone */}
      <G transform="rotate(6 130 140)">
        <Rect x="88" y="58" width="84" height="168" rx="20" fill={colors.primaryDark} />
        <Rect x="95" y="65" width="70" height="154" rx="14" fill="url(#screen)" />
        {/* notch */}
        <Rect x="116" y="70" width="28" height="6" rx="3" fill={colors.primaryDark} />
        {/* status bar */}
        <Circle cx="103" cy="76" r="3" fill={colors.primary} />
        <Circle cx="157" cy="76" r="3" fill={colors.accent} />
        {/* app card */}
        <Rect x="102" y="88" width="56" height="10" rx="5" fill={colors.primary} opacity="0.25" />
        <Rect x="102" y="106" width="56" height="44" rx="9" fill="#FFFFFF" stroke={colors.primaryLight} strokeWidth="1" />
        <Circle cx="114" cy="118" r="6" fill={colors.primaryLight} />
        <Path d="M 112 118 h 4 M 114 116 v 4" stroke={colors.primary} strokeWidth="1.6" strokeLinecap="round" />
        <Rect x="124" y="113" width="26" height="4" rx="2" fill={colors.textDisabled} />
        <Rect x="124" y="121" width="20" height="4" rx="2" fill={colors.border} />
        <Rect x="102" y="158" width="56" height="10" rx="5" fill={colors.primary} opacity="0.7" />
        <Rect x="102" y="176" width="56" height="10" rx="5" fill={colors.primaryLight} />
      </G>

      {/* calendar chip */}
      <G transform="rotate(-6 196 186)">
        <Rect x="172" y="156" width="48" height="58" rx="10" fill="#FFFFFF" />
        <Rect x="172" y="156" width="48" height="16" rx="10" fill={colors.accent} />
        <Rect x="180" y="150" width="4" height="12" rx="2" fill={colors.accentDark} />
        <Rect x="208" y="150" width="4" height="12" rx="2" fill={colors.accentDark} />
        <Circle cx="186" cy="182" r="4" fill={colors.primaryLight} />
        <Circle cx="196" cy="182" r="4" fill={colors.primaryLight} />
        <Circle cx="206" cy="182" r="4" fill={colors.primaryLight} />
      </G>

      {/* check chip */}
      <G>
        <Circle cx="66" cy="196" r="22" fill="#FFFFFF" />
        <Circle cx="66" cy="196" r="22" fill={colors.primary} opacity="0.08" />
        <Path
          d="M 56 196 L 63 203 L 77 189"
          stroke={colors.primary}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    </Svg>
  );
}
