import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, typography } from '@theme';

interface LogoMarkProps {
  size?: number;
}

/** SyncVet logo mark: rounded tile with paw + heart, in brand teal. */
export function LogoMark({ size = 64 }: LogoMarkProps) {
  const pad = size * 0.08;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image" accessibilityLabel="SyncVet logo">
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} />
          <Stop offset="1" stopColor={colors.primaryStrong} />
        </LinearGradient>
      </Defs>

      {/* Tile */}
      <Path
        d={`M ${pad} ${pad} h ${100 - pad * 2} a ${14} ${14} 0 0 1 ${14} ${14} v ${72 - pad * 2} a ${14} ${14} 0 0 1 -${14} ${14} h ${-(100 - pad * 2)} a ${14} ${14} 0 0 1 -${14} -${14} v ${-(72 - pad * 2)} a ${14} ${14} 0 0 1 ${14} -${14} z`}
        fill="url(#grad)"
      />

      {/* Heart-paw: toes */}
      <Ellipse cx="38" cy="43" rx="6.2" ry="7" fill={colors.white} opacity="0.95" />
      <Ellipse cx="50" cy="37.5" rx="6.2" ry="7" fill={colors.white} opacity="0.95" />
      <Ellipse cx="62" cy="43" rx="6.2" ry="7" fill={colors.white} opacity="0.95" />
      <Ellipse cx="50" cy="50" rx="6.2" ry="7" fill={colors.white} opacity="0.95" />

      {/* Heart pad */}
      <Path
        d="M50 72 C 36 62, 31 54, 31 47.5 A 9.5 9.5 0 0 1 50 41 A 9.5 9.5 0 0 1 69 47.5 C 69 54, 64 62, 50 72 Z"
        fill={colors.white}
        opacity="0.95"
      />
      <Circle cx="50" cy="68.5" r="6" fill={colors.primary} opacity="0.25" />
    </Svg>
  );
}

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkSize?: number;
  dark?: boolean;
}

export function Logo({ size = 64, showWordmark = true, wordmarkSize = 26, dark = false }: LogoProps) {
  const textColor = dark ? colors.white : colors.textPrimary;
  return (
    <View style={styles.container}>
      <LogoMark size={size} />
      {showWordmark ? (
        <View style={styles.wordmarkWrap}>
          <Text style={[styles.wordmark, { fontSize: wordmarkSize, color: textColor }]}>
            Sync<Text style={styles.accent}>Vet</Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmarkWrap: {
    justifyContent: 'center',
  },
  wordmark: {
    ...typography.heading3,
    fontFamily: typography.font.extrabold,
    letterSpacing: -0.4,
  },
  accent: {
    color: colors.primary,
  },
});
