import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { colors } from '@theme';

interface PetIllustrationProps {
  size?: number;
  /** Render variant used across the flow. */
  variant?: 'dog' | 'dogWithBadge' | 'registration' | 'notifications';
}

/**
 * Friendly, non-childish dog illustration used across the first-run flow.
 * Drawn entirely in code so it stays crisp on every screen size.
 */
export function PetIllustration({
  size = 260,
  variant = 'dog',
}: PetIllustrationProps) {
  const dog = (
    <G>
      {/* tail */}
      <Path
        d="M 205 128 C 232 108, 236 128, 222 148"
        stroke={colors.primaryLight}
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
      />
      {/* body */}
      <Ellipse cx="150" cy="162" rx="62" ry="52" fill={colors.primaryLighter} />
      <Path
        d="M 96 168 Q 150 228 204 168 L 192 208 Q 150 224 108 208 Z"
        fill="#FFFFFF"
      />
      {/* belly */}
      <Ellipse cx="150" cy="176" rx="34" ry="34" fill="#FFFFFF" />
      {/* front legs */}
      <Path
        d="M 122 202 L 116 236 A 12 12 0 0 0 140 236 L 138 200"
        fill={colors.primaryLighter}
      />
      <Path
        d="M 162 202 L 158 236 A 12 12 0 0 0 182 236 L 178 200"
        fill={colors.primaryLighter}
      />
      {/* ears */}
      <Path
        d="M 96 78 Q 74 88 86 116 Q 104 100 106 86 Z"
        fill={colors.primary}
        opacity="0.35"
      />
      <Path
        d="M 128 70 Q 138 46 160 60 Q 162 84 140 88 Z"
        fill={colors.primary}
        opacity="0.35"
      />
      {/* head */}
      <Ellipse cx="124" cy="98" rx="46" ry="42" fill="#FFFFFF" />
      {/* muzzle */}
      <Ellipse cx="126" cy="112" rx="26" ry="20" fill={colors.primaryLighter} />
      {/* nose */}
      <Ellipse cx="126" cy="104" rx="7" ry="5" fill={colors.textSecondary} />
      {/* eyes */}
      <Circle cx="106" cy="90" r="5" fill={colors.textPrimary} />
      <Circle cx="142" cy="90" r="5" fill={colors.textPrimary} />
      <Circle cx="107.6" cy="88.6" r="1.7" fill="#FFFFFF" />
      <Circle cx="143.6" cy="88.6" r="1.7" fill="#FFFFFF" />
      {/* mouth */}
      <Path
        d="M 116 116 Q 126 124 136 116"
        stroke={colors.textSecondary}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* collar */}
      <Path
        d="M 92 132 Q 126 150 158 130"
        stroke={colors.accent}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="126" cy="141" r="7" fill={colors.accent} stroke="#FFFFFF" strokeWidth="2" />
    </G>
  );

  const badge = (
    <G>
      <Circle cx="176" cy="70" r="30" fill="#FFFFFF" />
      <Circle cx="176" cy="70" r="30" fill={colors.primary} opacity="0.08" />
      <Path
        d="M 176 50 L 183.4 62.5 L 197 64.4 L 187.5 73.6 L 189.8 87 L 176 80.4 L 162.2 87 L 164.5 73.6 L 155 64.4 L 168.6 62.5 Z"
        fill={colors.accent}
      />
    </G>
  );

  const heart = (
    <G>
      <Path
        d="M 176 108 C 168 96, 150 100, 150 114 C 150 128, 166 136, 176 142 C 186 136, 202 128, 202 114 C 202 100, 184 96, 176 108 Z"
        fill={colors.error}
        opacity="0.14"
      />
    </G>
  );

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 260 260"
      accessibilityRole="image"
      accessibilityLabel="Friendly dog illustration"
    >
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primaryLighter} />
          <Stop offset="1" stopColor={colors.primaryLight} />
        </LinearGradient>
      </Defs>

      {/* soft backdrop */}
      <Circle cx="130" cy="150" r="112" fill="url(#bg)" opacity="0.6" />

      {/* decorative paw prints */}
      <PawPrint x={58} y={42} scale={0.55} opacity={0.14} />
      <PawPrint x={200} y={206} scale={0.5} opacity={0.12} />

      {dog}
      {variant === 'dogWithBadge' || variant === 'registration' ? badge : null}
      {variant === 'notifications' ? heart : null}
    </Svg>
  );
}

function PawPrint({
  x,
  y,
  scale,
  opacity,
}: {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}) {
  return (
    <G
      fill={colors.primary}
      opacity={opacity}
      transform={`translate(${x} ${y}) scale(${scale})`}
    >
      <Ellipse cx="0" cy="-12" rx="5" ry="6" />
      <Ellipse cx="-9" cy="-4" rx="5" ry="6" />
      <Ellipse cx="9" cy="-4" rx="5" ry="6" />
      <Path
        d="M 0 10 C -10 4, -14 -2, -12 -8 C -10 -12, -5 -12, -3 -9 C -1 -6, 1 -6, 3 -9 C 5 -12, 10 -12, 12 -8 C 14 -2, 10 4, 0 10 Z"
      />
    </G>
  );
}
