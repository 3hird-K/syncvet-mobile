import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { colors, radius, spacing, typography } from '@theme';

export type PawLoadingMode = 'walking' | 'pulse';
export type PawLoadingSize = 'sm' | 'md' | 'lg';

interface PawLoadingProps {
  mode?: PawLoadingMode;
  size?: PawLoadingSize;
  label?: string;
  color?: string;
  fullScreen?: boolean;
}

const SIZES = {
  sm: { iconSize: 18, pawGap: 8, badgeSize: 40, labelSize: 11 },
  md: { iconSize: 26, pawGap: 14, badgeSize: 60, labelSize: 13 },
  lg: { iconSize: 36, pawGap: 20, badgeSize: 84, labelSize: 15 },
};

/** Individual animated paw in the walking sequence */
function WalkingPaw({
  index,
  total,
  iconSize,
  progress,
  color,
  rotation,
}: {
  index: number;
  total: number;
  iconSize: number;
  progress: SharedValue<number>;
  color: string;
  rotation: number;
}) {
  const step = 1 / total;
  const start = index * step;
  const peak = start + step * 0.4;
  const end = start + step * 0.8;

  const animStyle = useAnimatedStyle(() => {
    const p = progress.value;

    // Calculate looped phase offset
    const normalized = (p - start + 1) % 1;

    // Scale and opacity interpolation for stepping bounce
    const scale = interpolate(
      normalized,
      [0, 0.25, 0.5, 0.8, 1],
      [0.65, 1.25, 1.0, 0.75, 0.65],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      normalized,
      [0, 0.25, 0.5, 0.8, 1],
      [0.25, 1.0, 0.85, 0.35, 0.25],
      Extrapolation.CLAMP,
    );

    const translateY = interpolate(
      normalized,
      [0, 0.25, 0.5, 0.8, 1],
      [4, -8, 0, 3, 4],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }, { translateY }, { rotate: `${rotation}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.pawItem, animStyle]}>
      <Ionicons name="paw" size={iconSize} color={color} />
    </Animated.View>
  );
}

/** Walking Paws Loader Animation */
function WalkingPaws({
  iconSize,
  pawGap,
  color,
}: {
  iconSize: number;
  pawGap: number;
  color: string;
}) {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress, reducedMotion]);

  // 4 stepping paws with natural walk rotation angles
  const paws = [
    { key: 0, rot: -14 },
    { key: 1, rot: 14 },
    { key: 2, rot: -12 },
    { key: 3, rot: 12 },
  ];

  return (
    <View style={[styles.walkingRow, { gap: pawGap }]}>
      {paws.map((p, idx) => (
        <WalkingPaw
          key={p.key}
          index={idx}
          total={paws.length}
          iconSize={iconSize}
          progress={progress}
          color={color}
          rotation={p.rot}
        />
      ))}
    </View>
  );
}

/** Pulsing Central Paw with Ripple Radiance Rings */
function PulsingPaw({
  badgeSize,
  iconSize,
  color,
}: {
  badgeSize: number;
  iconSize: number;
  color: string;
}) {
  const ripple = useSharedValue(0);
  const pulse = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      ripple.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }),
        -1,
        false,
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    }
  }, [ripple, pulse, reducedMotion]);

  const ripple1Style = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    return {
      transform: [
        {
          scale: interpolate(ripple.value, [0, 1], [0.8, 1.8], Extrapolation.CLAMP),
        },
      ],
      opacity: interpolate(ripple.value, [0, 0.4, 1], [0.6, 0.3, 0], Extrapolation.CLAMP),
    };
  });

  const ripple2Style = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    const offsetRipple = (ripple.value + 0.5) % 1;
    return {
      transform: [
        {
          scale: interpolate(offsetRipple, [0, 1], [0.8, 1.8], Extrapolation.CLAMP),
        },
      ],
      opacity: interpolate(offsetRipple, [0, 0.4, 1], [0.6, 0.3, 0], Extrapolation.CLAMP),
    };
  });

  const badgeAnimStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    return {
      transform: [{ scale: pulse.value }],
    };
  });

  return (
    <View style={[styles.pulseWrap, { width: badgeSize * 2, height: badgeSize * 2 }]}>
      {/* Ripple Rings */}
      <Animated.View
        style={[
          styles.rippleRing,
          { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, borderColor: color },
          ripple1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.rippleRing,
          { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, borderColor: color },
          ripple2Style,
        ]}
      />

      {/* Main Center Paw Badge */}
      <Animated.View
        style={[
          styles.pulseBadge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: colors.primary,
          },
          badgeAnimStyle,
        ]}
      >
        <Ionicons name="paw" size={iconSize} color={colors.white} />
      </Animated.View>
    </View>
  );
}

export function PawLoading({
  mode = 'walking',
  size = 'md',
  label,
  color = colors.primary,
  fullScreen = false,
}: PawLoadingProps) {
  const config = SIZES[size];

  return (
    <View
      style={[styles.container, fullScreen && styles.fullScreen]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
    >
      {mode === 'walking' ? (
        <WalkingPaws
          iconSize={config.iconSize}
          pawGap={config.pawGap}
          color={color}
        />
      ) : (
        <PulsingPaw
          badgeSize={config.badgeSize}
          iconSize={config.iconSize}
          color={color}
        />
      )}

      {label ? (
        <Text style={[styles.label, { fontSize: config.labelSize }]}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  walkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  pawItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    borderWidth: 2.5,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
  },
  pulseBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#005D51',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    ...typography.captionBold,
    color: colors.primaryDark,
    marginTop: spacing.md,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
