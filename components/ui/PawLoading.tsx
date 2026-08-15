import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { AnimatedBubbleBackground } from './AnimatedBubbleBackground';

export type PawLoadingMode = 'footprints' | 'walking' | 'pulse';
export type PawLoadingSize = 'sm' | 'md' | 'lg';

interface PawLoadingProps {
  mode?: PawLoadingMode;
  size?: PawLoadingSize;
  label?: string;
  color?: string;
  fullScreen?: boolean;
}

interface FootprintConfig {
  id: number;
  x: number;
  y: number;
  rotation: number;
  size: number;
  delay: number;
}

// Harmonious, gracefully curved walking paw path
const FOOTPRINTS: FootprintConfig[] = [
  { id: 1, x: -24, y: 70, rotation: -14, size: 22, delay: 0 },
  { id: 2, x: 24, y: 36, rotation: 14, size: 25, delay: 350 },
  { id: 3, x: -20, y: 0, rotation: -12, size: 28, delay: 700 },
  { id: 4, x: 20, y: -36, rotation: 12, size: 30, delay: 1050 },
];

function AnimatedPawStep({
  config,
  reducedMotion,
}: {
  config: FootprintConfig;
  reducedMotion: boolean | null;
}) {
  const opacity = useSharedValue(reducedMotion ? 0.75 : 0);
  const scale = useSharedValue(reducedMotion ? 1 : 0.6);

  useEffect(() => {
    if (reducedMotion) return;

    opacity.value = withRepeat(
      withSequence(
        withDelay(config.delay, withTiming(0.8, { duration: 360, easing: Easing.out(Easing.quad) })),
        withTiming(0.2, { duration: 550, easing: Easing.inOut(Easing.quad) }),
        withDelay(Math.max(0, 1400 - config.delay), withTiming(0, { duration: 250 })),
      ),
      -1,
      false,
    );

    scale.value = withRepeat(
      withSequence(
        withDelay(config.delay, withTiming(1.05, { duration: 360, easing: Easing.out(Easing.quad) })),
        withTiming(0.92, { duration: 550, easing: Easing.inOut(Easing.quad) }),
        withDelay(Math.max(0, 1400 - config.delay), withTiming(0.6, { duration: 250 })),
      ),
      -1,
      false,
    );
  }, [config.delay, opacity, scale, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: config.x },
      { translateY: config.y },
      { rotate: `${config.rotation}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.footprintWrap, animatedStyle]}>
      <Ionicons name="paw" size={config.size} color="rgba(10, 110, 100, 0.65)" />
    </Animated.View>
  );
}

/** Standard Footprints Loading Animation with Walking Steps & Pulse Ripple */
export function PawFootprintLoader({
  showProgress = true,
  label = 'Loading, please wait...',
}: {
  showProgress?: boolean;
  label?: string;
}) {
  const reducedMotion = useReducedMotion();

  const heroPulse = useSharedValue(1);
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.6);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.35);
  const ring3Scale = useSharedValue(1);
  const ring3Opacity = useSharedValue(0.2);
  const lineProgress = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion) {
      lineProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.cubic) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );

      heroPulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 850, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.0, { duration: 850, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );

      // Ring 1: Primary ripple
      ring1Scale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 1400, easing: Easing.out(Easing.cubic) }),
          withTiming(1.0, { duration: 0 }),
        ),
        -1,
        false,
      );
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1400, easing: Easing.out(Easing.cubic) }),
          withTiming(0.6, { duration: 0 }),
        ),
        -1,
        false,
      );

      // Ring 2: Secondary delayed ripple
      ring2Scale.value = withRepeat(
        withSequence(
          withDelay(400, withTiming(1.65, { duration: 1500, easing: Easing.out(Easing.cubic) })),
          withTiming(1.0, { duration: 0 }),
        ),
        -1,
        false,
      );
      ring2Opacity.value = withRepeat(
        withSequence(
          withDelay(400, withTiming(0, { duration: 1500, easing: Easing.out(Easing.cubic) })),
          withTiming(0.4, { duration: 0 }),
        ),
        -1,
        false,
      );

      // Ring 3: Soft tertiary ripple
      ring3Scale.value = withRepeat(
        withSequence(
          withDelay(800, withTiming(1.9, { duration: 1600, easing: Easing.out(Easing.cubic) })),
          withTiming(1.0, { duration: 0 }),
        ),
        -1,
        false,
      );
      ring3Opacity.value = withRepeat(
        withSequence(
          withDelay(800, withTiming(0, { duration: 1600, easing: Easing.out(Easing.cubic) })),
          withTiming(0.25, { duration: 0 }),
        ),
        -1,
        false,
      );
    } else {
      lineProgress.value = 1;
    }
  }, [heroPulse, ring1Scale, ring1Opacity, ring2Scale, ring2Opacity, ring3Scale, ring3Opacity, lineProgress, reducedMotion]);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroPulse.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));

  const progressLineStyle = useAnimatedStyle(() => ({
    width: `${lineProgress.value * 100}%`,
  }));

  return (
    <View style={styles.centerContainer}>
      {/* 1. Footprint Trail */}
      <View style={styles.footprintTrailContainer}>
        {FOOTPRINTS.map((config) => (
          <AnimatedPawStep
            key={config.id}
            config={config}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>

      {/* 2. Hero Center Badge with Multi-Layer Soft Ripple Rings */}
      <View style={styles.heroBadgeAnchor}>
        <Animated.View style={[styles.rippleRing, styles.rippleRingTertiary, ring3Style]} />
        <Animated.View style={[styles.rippleRing, styles.rippleRingOuter, ring2Style]} />
        <Animated.View style={[styles.rippleRing, styles.rippleRingInner, ring1Style]} />

        {/* Central Glassmorphic Badge */}
        <Animated.View style={[styles.heroPawBadge, heroStyle, shadows.md]}>
          <View style={styles.heroPawBadgeInner}>
            <Ionicons name="paw" size={40} color={colors.white} />
          </View>
        </Animated.View>
      </View>

      {/* 3. Modern Loading Status Label */}
      {label ? (
        <View style={styles.statusWrap}>
          <Text style={styles.statusLabel}>{label}</Text>
        </View>
      ) : null}

      {/* 4. Slim Floating Progress Track */}
      {showProgress ? (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, progressLineStyle]} />
        </View>
      ) : null}
    </View>
  );
}

/** Full-Screen Standard Paw Loading Overlay (In-Tree with seamless mint backdrop) */
export function PawLoadingOverlay({
  visible,
  showProgress = true,
  label,
}: {
  visible: boolean;
  showProgress?: boolean;
  label?: string;
}) {
  if (!visible) return null;

  return (
    <View style={styles.overlayRoot} pointerEvents="auto">
      {/* Harmonious Clean Ambient Mint Background */}
      <AnimatedBubbleBackground variant="splash" />
      <PawFootprintLoader showProgress={showProgress} label={label} />
    </View>
  );
}

const SIZES = {
  sm: { iconSize: 18, pawGap: 8, badgeSize: 40, labelSize: 11 },
  md: { iconSize: 26, pawGap: 14, badgeSize: 60, labelSize: 13 },
  lg: { iconSize: 36, pawGap: 20, badgeSize: 84, labelSize: 15 },
};

/** Individual animated paw in the horizontal walking sequence */
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

  const animStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const normalized = (p - start + 1) % 1;

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

  const badgeAnimStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    return {
      transform: [{ scale: pulse.value }],
    };
  });

  return (
    <View style={[styles.pulseWrap, { width: badgeSize * 2, height: badgeSize * 2 }]}>
      <Animated.View
        style={[
          styles.rippleRing,
          styles.rippleRingInner,
          { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, borderColor: color },
          ripple1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.heroPawBadge,
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
  mode = 'footprints',
  size = 'md',
  label,
  color = colors.primary,
  fullScreen = false,
}: PawLoadingProps) {
  const config = SIZES[size];

  if (mode === 'footprints') {
    return (
      <View style={[styles.container, fullScreen && styles.fullScreen]}>
        <PawFootprintLoader showProgress={false} label={label} />
      </View>
    );
  }

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
    backgroundColor: '#E6F5F2',
  },
  overlayRoot: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E6F5F2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  footprintTrailContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 280,
    zIndex: 1,
  },
  footprintWrap: {
    position: 'absolute',
  },
  heroBadgeAnchor: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    height: 150,
    position: 'relative',
    zIndex: 2,
  },
  rippleRing: {
    position: 'absolute',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#0A6E64',
  },
  rippleRingInner: {
    width: 106,
    height: 106,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
  },
  rippleRingOuter: {
    width: 134,
    height: 134,
    backgroundColor: 'rgba(0, 168, 150, 0.04)',
  },
  rippleRingTertiary: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(0, 168, 150, 0.02)',
  },
  heroPawBadge: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#0A6E64',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#05332E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  heroPawBadgeInner: {
    width: '100%',
    height: '100%',
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusWrap: {
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10, 110, 100, 0.08)',
    zIndex: 3,
  },
  statusLabel: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 12.5,
    fontFamily: typography.font.bold,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 54,
    width: 120,
    height: 4.5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10, 110, 100, 0.12)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: '#0A6E64',
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
  label: {
    ...typography.captionBold,
    color: colors.primaryDark,
    marginTop: spacing.md,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
