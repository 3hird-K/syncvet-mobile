import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, shadows } from '@theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AnimatedSyncVetWordmarkProps {
  width?: number;
  onAnimationComplete?: () => void;
}

interface LetterDef {
  char: string;
  key: string;
  delay: number;
}

const LETTERS: LetterDef[] = [
  { char: 's', key: 's', delay: 100 },
  { char: 'y', key: 'y', delay: 240 },
  { char: 'n', key: 'n', delay: 380 },
  { char: 'c', key: 'c', delay: 520 },
  { char: 'v', key: 'v', delay: 660 },
  { char: 'e', key: 'e', delay: 800 },
  { char: 't', key: 't', delay: 940 },
];

function AnimatedLetter({
  char,
  delay,
  reducedMotion,
}: {
  char: string;
  delay: number;
  reducedMotion: boolean | null;
}) {
  const progress = useSharedValue(reducedMotion ? 1 : 0);
  const strokeFlow = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;

    progress.value = withDelay(
      delay,
      withSpring(1, { damping: 13, stiffness: 190 }),
    );

    strokeFlow.value = withDelay(
      delay,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
    );
  }, [delay, reducedMotion, progress, strokeFlow]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 0.7, 1]),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.6, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [6, 0]) },
      { rotateZ: `${interpolate(progress.value, [0, 1], [-8, 0])}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.letterBox, animatedStyle]}>
      {/* 1. White Sticker Halo Backdrop Layers */}
      <Text style={[styles.letterText, styles.letterHalo1]}>{char}</Text>
      <Text style={[styles.letterText, styles.letterHalo2]}>{char}</Text>
      <Text style={[styles.letterText, styles.letterHalo3]}>{char}</Text>
      <Text style={[styles.letterText, styles.letterHalo4]}>{char}</Text>
      <Text style={[styles.letterText, styles.letterHalo5]}>{char}</Text>

      {/* 2. Main High-Gloss Brand Teal Character */}
      <Text style={[styles.letterText, styles.letterFill]}>{char}</Text>
    </Animated.View>
  );
}

export function AnimatedSyncVetWordmark({
  width = 330,
  onAnimationComplete,
}: AnimatedSyncVetWordmarkProps) {
  const reducedMotion = useReducedMotion();

  const swashProgress = useSharedValue(reducedMotion ? 1 : 0);
  const stickerGlow = useSharedValue(reducedMotion ? 1 : 0);
  const overallScale = useSharedValue(reducedMotion ? 1 : 0.96);

  useEffect(() => {
    if (reducedMotion) {
      onAnimationComplete?.();
      return;
    }

    // Step 8: Underline Swash draws across smoothly right after 't' (t = 1100ms)
    swashProgress.value = withDelay(
      1100,
      withTiming(1, {
        duration: 380,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );

    // Step 9: White Sticker Glow & depth pop (t = 1250ms)
    stickerGlow.value = withDelay(
      1250,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );

    // Step 10: Settle celebration bounce
    overallScale.value = withDelay(
      1400,
      withSequence(
        withTiming(1.035, { duration: 200, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 14, stiffness: 220 }),
      ),
    );

    const timer = setTimeout(() => {
      onAnimationComplete?.();
    }, 1950);

    return () => clearTimeout(timer);
  }, [reducedMotion]);

  const rootStyle = useAnimatedStyle(() => ({
    transform: [{ scale: overallScale.value }],
  }));

  const swashStyle = useAnimatedStyle(() => ({
    opacity: swashProgress.value,
    transform: [
      { scaleX: interpolate(swashProgress.value, [0, 1], [0.15, 1]) },
      { translateX: interpolate(swashProgress.value, [0, 1], [-30, 0]) },
    ],
  }));

  const stickerCardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stickerGlow.value, [0, 1], [0.35, 1]),
    transform: [
      { scale: interpolate(stickerGlow.value, [0, 1], [0.94, 1]) },
    ],
  }));

  return (
    <Animated.View style={[styles.rootContainer, { width }, rootStyle]}>
      {/* 1. Sticker Badge Halo Outer Background */}
      <Animated.View style={[styles.stickerPill, shadows.md, stickerCardStyle]}>
        <View style={styles.stickerInnerBorder} />
      </Animated.View>

      {/* 2. Connected Handwriting Character Row */}
      <View style={styles.wordRow}>
        {LETTERS.map((item) => (
          <AnimatedLetter
            key={item.key}
            char={item.char}
            delay={item.delay}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>

      {/* 3. Dynamic Underline Flourish Swash */}
      <Animated.View style={[styles.swashContainer, swashStyle]}>
        <Svg width={240} height={28} viewBox="0 0 240 28">
          <Defs>
            <LinearGradient id="swashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#08544D" />
              <Stop offset="60%" stopColor="#0A6E64" />
              <Stop offset="100%" stopColor="#00A896" />
            </LinearGradient>
          </Defs>
          {/* White Sticker Underline Buffer */}
          <Path
            d="M 12 16 C 50 13, 120 12, 180 14 C 205 15, 230 18, 238 20 C 242 21, 236 17, 224 14 C 180 6, 120 4, 60 7 C 35 8, 15 11, 4 14 C 0 15, 5 17, 12 16 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth={6}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Main Brand Flourish Stroke */}
          <Path
            d="M 12 16 C 50 13, 120 12, 180 14 C 205 15, 230 18, 238 20 C 242 21, 236 17, 224 14 C 180 6, 120 4, 60 7 C 35 8, 15 11, 4 14 C 0 15, 5 17, 12 16 Z"
            fill="url(#swashGrad)"
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  stickerPill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: '#48BDB0',
    shadowColor: '#05332E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  stickerInnerBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 33,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  letterBox: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -2.2, // Connects cursive brush ligatures naturally
  },
  letterText: {
    fontFamily: 'Pacifico_400Regular',
    fontSize: 48,
    color: '#0A6E64',
    textAlign: 'center',
    includeFontPadding: false,
  },
  letterFill: {
    color: '#0A6E64',
    textShadowColor: 'rgba(5, 51, 46, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
    zIndex: 3,
  },
  // Multi-directional white halo borders for crisp sticker effect
  letterHalo1: {
    position: 'absolute',
    color: '#FFFFFF',
    transform: [{ translateX: -2.5 }, { translateY: -2.5 }],
    zIndex: 1,
  },
  letterHalo2: {
    position: 'absolute',
    color: '#FFFFFF',
    transform: [{ translateX: 2.5 }, { translateY: -2.5 }],
    zIndex: 1,
  },
  letterHalo3: {
    position: 'absolute',
    color: '#FFFFFF',
    transform: [{ translateX: -2.5 }, { translateY: 2.5 }],
    zIndex: 1,
  },
  letterHalo4: {
    position: 'absolute',
    color: '#FFFFFF',
    transform: [{ translateX: 2.5 }, { translateY: 2.5 }],
    zIndex: 1,
  },
  letterHalo5: {
    position: 'absolute',
    color: '#FFFFFF',
    transform: [{ translateY: 3 }],
    zIndex: 1,
  },
  swashContainer: {
    marginTop: -8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
});
