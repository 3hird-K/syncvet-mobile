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

const FOOTPRINTS: FootprintConfig[] = [
  { id: 1, x: -28, y: 72, rotation: -16, size: 24, delay: 0 },
  { id: 2, x: 28, y: 36, rotation: 16, size: 27, delay: 350 },
  { id: 3, x: -26, y: -4, rotation: -16, size: 30, delay: 700 },
  { id: 4, x: 26, y: -44, rotation: 16, size: 33, delay: 1050 },
];

function AnimatedPawStep({
  config,
  reducedMotion,
}: {
  config: FootprintConfig;
  reducedMotion: boolean | null;
}) {
  const opacity = useSharedValue(reducedMotion ? 0.8 : 0);
  const scale = useSharedValue(reducedMotion ? 1 : 0.6);

  useEffect(() => {
    if (reducedMotion) return;

    opacity.value = withRepeat(
      withSequence(
        withDelay(config.delay, withTiming(0.85, { duration: 380, easing: Easing.ease })),
        withTiming(0.18, { duration: 600, easing: Easing.ease }),
        withDelay(Math.max(0, 1400 - config.delay), withTiming(0, { duration: 250 })),
      ),
      -1,
      false,
    );

    scale.value = withRepeat(
      withSequence(
        withDelay(config.delay, withTiming(1.08, { duration: 380, easing: Easing.ease })),
        withTiming(0.92, { duration: 600, easing: Easing.ease }),
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
      <Ionicons name="paw" size={config.size} color={colors.primary} />
    </Animated.View>
  );
}

/** Standard Footprints Loading Animation with Walking Steps & Pulse Ripple */
export function PawFootprintLoader({ showProgress = true }: { showProgress?: boolean }) {
  const reducedMotion = useReducedMotion();

  const heroPulse = useSharedValue(1);
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.6);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.4);
  const lineProgress = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion) {
      lineProgress.value = withTiming(1, {
        duration: 2300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      heroPulse.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 900, easing: Easing.ease }),
          withTiming(1.0, { duration: 900, easing: Easing.ease }),
        ),
        -1,
        true,
      );

      ring1Scale.value = withRepeat(
        withSequence(
          withTiming(1.45, { duration: 1300, easing: Easing.ease }),
          withTiming(1.0, { duration: 0 }),
        ),
        -1,
        false,
      );
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1300, easing: Easing.ease }),
          withTiming(0.65, { duration: 0 }),
        ),
        -1,
        false,
      );

      ring2Scale.value = withRepeat(
        withSequence(
          withDelay(450, withTiming(1.65, { duration: 1400, easing: Easing.ease })),
          withTiming(1.0, { duration: 0 }),
        ),
        -1,
        false,
      );
      ring2Opacity.value = withRepeat(
        withSequence(
          withDelay(450, withTiming(0, { duration: 1400, easing: Easing.ease })),
          withTiming(0.45, { duration: 0 }),
        ),
        -1,
        false,
      );
    } else {
      lineProgress.value = 1;
    }
  }, [heroPulse, ring1Scale, ring1Opacity, ring2Scale, ring2Opacity, lineProgress, reducedMotion]);

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

  const progressLineStyle = useAnimatedStyle(() => ({
    width: `${lineProgress.value * 100}%`,
  }));

  return (
    <View style={styles.centerContainer}>
      <View style={styles.footprintTrailContainer}>
        {FOOTPRINTS.map((config) => (
          <AnimatedPawStep
            key={config.id}
            config={config}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>

      <View style={styles.heroBadgeAnchor}>
        <Animated.View style={[styles.rippleRing, styles.rippleRingOuter, ring2Style]} />
        <Animated.View style={[styles.rippleRing, styles.rippleRingInner, ring1Style]} />

        <Animated.View style={[styles.heroPawBadge, heroStyle, shadows.lg]}>
          <Ionicons name="paw" size={46} color={colors.white} />
        </Animated.View>
      </View>

      {showProgress ? (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, progressLineStyle]} />
        </View>
      ) : null}
    </View>
  );
}

/** Full-Screen Standard Paw Loading Overlay / Modal */
export function PawLoadingOverlay({
  visible,
  showProgress = true,
}: {
  visible: boolean;
  showProgress?: boolean;
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlayRoot}>
        <AnimatedBubbleBackground variant="default" />
        <PawFootprintLoader showProgress={showProgress} />
      </View>
    </Modal>
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
        <PawFootprintLoader showProgress={false} />
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
    backgroundColor: colors.background,
  },
  overlayRoot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 220,
    height: 320,
  },
  footprintWrap: {
    position: 'absolute',
  },
  heroBadgeAnchor: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  rippleRingInner: {
    width: 110,
    height: 110,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
  },
  rippleRingOuter: {
    width: 136,
    height: 136,
    backgroundColor: 'rgba(0, 168, 150, 0.04)',
  },
  heroPawBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: colors.surface,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 50,
    width: 110,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(7, 30, 38, 0.07)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
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
