import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { colors, radius, shadows } from '@theme';

interface PhotoIllustrationProps {
  source: ImageSourcePropType;
  size?: number;
  borderRadius?: number;
}

/**
 * Displays a photo in the brand's rounded-card style with a subtle inner
 * ring, used in place of SVG illustrations for hero/onboarding art.
 */
export function PhotoIllustration({
  source,
  size = 220,
  borderRadius = radius.xxl,
}: PhotoIllustrationProps) {
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius },
        shadows.md,
      ]}
    >
      <Image
        source={source}
        style={styles.image}
        resizeMode="cover"
        accessibilityRole="image"
      />
      <View style={[styles.ring, { borderRadius }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: colors.white,
    opacity: 0.85,
  },
});
