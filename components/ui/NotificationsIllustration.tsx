import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors } from '@theme';

interface NotificationsIllustrationProps {
  size?: number;
}

/** Notification / appointment concept for onboarding slide 3. */
export function NotificationsIllustration({ size = 260 }: NotificationsIllustrationProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 260 260"
      accessibilityRole="image"
      accessibilityLabel="Appointment notifications illustration"
    >
      <Defs>
        <LinearGradient id="bg3" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primaryLighter} />
          <Stop offset="1" stopColor={colors.primaryLight} />
        </LinearGradient>
      </Defs>

      <Circle cx="130" cy="150" r="112" fill="url(#bg3)" opacity="0.6" />

      {/* small dog face peeking */}
      <G>
        <Ellipse cx="88" cy="96" rx="26" ry="24" fill="#FFFFFF" />
        <Path d="M 70 92 Q 58 84 66 70 Q 74 78 74 86 Z" fill={colors.primaryLight} />
        <Path d="M 106 92 Q 118 84 110 70 Q 102 78 102 86 Z" fill={colors.primaryLight} />
        <Circle cx="80" cy="90" r="3" fill={colors.textPrimary} />
        <Circle cx="96" cy="90" r="3" fill={colors.textPrimary} />
        <Ellipse cx="88" cy="102" rx="10" ry="7" fill={colors.primaryLighter} />
        <Circle cx="88" cy="98" r="3" fill={colors.textSecondary} />
        <Path d="M 83 108 Q 88 111 93 108" stroke={colors.textSecondary} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </G>

      {/* main notification card */}
      <G transform="rotate(3 150 150)">
        <Rect x="70" y="112" width="148" height="110" rx="18" fill="#FFFFFF" />
        <Rect x="70" y="112" width="148" height="110" rx="18" fill={colors.primary} opacity="0.05" />
        {/* icon bubble */}
        <Circle cx="96" cy="138" r="16" fill={colors.primaryLight} />
        <Path
          d="M 90 138 L 102 138 M 92 134 L 100 134 M 92 142 L 100 142"
          stroke={colors.primary}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <Circle cx="108" cy="126" r="7" fill={colors.accent} />
        {/* title + body */}
        <Rect x="120" y="128" width="84" height="8" rx="4" fill={colors.textPrimary} opacity="0.8" />
        <Rect x="120" y="142" width="88" height="6" rx="3" fill={colors.border} />
        <Rect x="120" y="152" width="64" height="6" rx="3" fill={colors.border} />
        {/* time */}
        <Rect x="120" y="166" width="40" height="6" rx="3" fill={colors.borderStrong} />
        {/* action */}
        <Rect x="96" y="188" width="96" height="22" rx="11" fill={colors.primary} />
        <Circle cx="118" cy="199" r="3" fill="#FFFFFF" />
        <Rect x="124" y="196" width="40" height="6" rx="3" fill="#FFFFFF" opacity="0.9" />
      </G>

      {/* second notification peeking */}
      <G transform="rotate(-6 196 88)">
        <Rect x="162" y="62" width="120" height="70" rx="16" fill="#FFFFFF" opacity="0.85" />
        <Circle cx="182" cy="86" r="12" fill={colors.accentLight} />
        <Path
          d="M 176 86 L 180 90 L 188 81"
          stroke={colors.accentDark}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Rect x="200" y="80" width="66" height="7" rx="3.5" fill={colors.textPrimary} opacity="0.7" />
        <Rect x="200" y="93" width="48" height="6" rx="3" fill={colors.border} />
      </G>
    </Svg>
  );
}
