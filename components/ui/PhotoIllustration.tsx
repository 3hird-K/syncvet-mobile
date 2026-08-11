import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { colors, radius, shadows } from '@theme';

interface PhotoIllustrationProps {
  source: ImageSourcePropType;
  size?: number;
  borderRadius?: number;
  accentColor?: string;
}

/**
 * Displays a hero photo with modern borderless presentation, ambient halo glow,
 * and high-end drop shadow for onboarding and feature screens.
 */
export function PhotoIllustration({
  source,
  size = 230,
  borderRadius = radius.xxl,
  accentColor = colors.primary,
}: PhotoIllustrationProps) {
  const haloSize = size + 20;

  return (
    <View style={[styles.outerContainer, { width: haloSize, height: haloSize }]}>
      {/* Background Soft Glow Ring */}
      <View
        style={[
          styles.ambientHalo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: accentColor,
          },
        ]}
      />

      {/* Main Image Container */}
      <View
        style={[
          styles.wrap,
          { width: size, height: size, borderRadius },
          shadows.lg,
        ]}
      >
        <Image
          source={source}
          style={styles.image}
          resizeMode="cover"
          accessibilityRole="image"
        />
        {/* Soft Inner Highlight */}
        <View style={[styles.innerBorder, { borderRadius }]} pointerEvents="none" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientHalo: {
    position: 'absolute',
    opacity: 0.14,
    transform: [{ scale: 1.08 }],
  },
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  innerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});

