import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography } from '@theme';

interface AvatarProps {
  name: string;
  size?: number;
  photoUrl?: string | ImageSourcePropType | null;
  photo?: string | ImageSourcePropType | null;
  icon?: 'paw' | 'person';
}

const AVATAR_PALETTE = [
  { bg: colors.primary, fg: '#FFFFFF' },
  { bg: '#0E7490', fg: '#FFFFFF' },
  { bg: '#7C3AED', fg: '#FFFFFF' },
  { bg: '#B45309', fg: '#FFFFFF' },
  { bg: '#BE185D', fg: '#FFFFFF' },
] as const;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Round avatar with photo, initials, or a neutral icon. Colors are derived
 * from the person/pet name so they stay stable across screens.
 */
export function Avatar({
  name,
  size = 48,
  photoUrl,
  photo,
  icon = 'person',
}: AvatarProps) {
  const rawSource = photoUrl ?? photo;
  const palette = AVATAR_PALETTE[hashString(name) % AVATAR_PALETTE.length];

  if (rawSource) {
    const imageSource = typeof rawSource === 'string' ? { uri: rawSource } : rawSource;
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="cover"
          accessibilityRole="image"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.bg,
        },
      ]}
    >
      {icon === 'paw' ? (
        <Ionicons
          name="paw"
          size={Math.round(size * 0.5)}
          color={palette.fg}
          style={styles.pawOffset}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            { fontSize: Math.round(size * 0.4), color: palette.fg },
          ]}
        >
          {initialsFor(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontFamily: typography.fontFamily,
    fontWeight: '700',
  },
  pawOffset: {
    marginTop: 4,
  },
});
