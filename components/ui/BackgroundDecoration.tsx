import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { colors } from '@theme';

interface BackgroundDecorationProps {
  /** Reduced set of floating blobs behind content. */
  subtle?: boolean;
}

/**
 * Decorative brand background: soft color blobs + paw prints.
 * Purely visual; children rendered on top.
 */
export function BackgroundDecoration({ subtle = false }: BackgroundDecorationProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 390 844">
        {/* top-right blob */}
        <Circle
          cx="360"
          cy="70"
          r={subtle ? 130 : 170}
          fill={colors.primaryLighter}
          opacity="0.6"
        />
        {/* bottom-left blob */}
        <Circle
          cx="-30"
          cy="760"
          r={subtle ? 120 : 150}
          fill={colors.primaryLight}
          opacity="0.5"
        />
        {/* small accent blob */}
        <Circle cx="40" cy="180" r="46" fill={colors.accentLight} opacity="0.7" />

        {/* decorative paw prints */}
        <PawPrint x={318} y={300} scale={0.5} opacity={0.1} />
        <PawPrint x={30} y={430} scale={0.42} opacity={0.09} />
        <PawPrint x={300} y={560} scale={0.36} opacity={0.08} />
      </Svg>
    </View>
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
      <Path d="M 0 10 C -10 4, -14 -2, -12 -8 C -10 -12, -5 -12, -3 -9 C -1 -6, 1 -6, 3 -9 C 5 -12, 10 -12, 12 -8 C 14 -2, 10 4, 0 10 Z" />
    </G>
  );
}
