import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface BubbleProps {
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  color?: string;
  duration?: number;
  moveY?: number;
  moveX?: number;
  showPaw?: boolean;
  imageSource?: ImageSourcePropType;
  imageOpacity?: number;
}

function FloatingBubble({
  size,
  top,
  left,
  right,
  bottom,
  color = 'rgba(15, 123, 110, 0.15)',
  duration = 3800,
  moveY = 18,
  moveX = 10,
  showPaw = true,
  imageSource,
  imageOpacity = 0.85,
}: BubbleProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-moveY, { duration, easing: Easing.inOut(Easing.quad) }),
        withTiming(moveY, { duration, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    translateX.value = withRepeat(
      withSequence(
        withTiming(moveX, { duration: duration * 1.3, easing: Easing.inOut(Easing.quad) }),
        withTiming(-moveX, { duration: duration * 1.3, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: duration * 1.1, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.92, { duration: duration * 1.1, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [duration, moveY, moveX, translateY, translateX, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  const iconSize = Math.round(size * 0.32);
  const imgSize = Math.round(size * 0.72);

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          left,
          right,
          bottom,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={{
            width: imgSize,
            height: imgSize,
            opacity: imageOpacity,
          }}
          resizeMode="contain"
        />
      ) : showPaw && size >= 65 ? (
        <Ionicons
          name="paw"
          size={iconSize}
          color="rgba(15, 123, 110, 0.22)"
        />
      ) : null}
    </Animated.View>
  );
}

interface AnimatedBubbleBackgroundProps {
  variant?: 'default' | 'splash';
}

export function AnimatedBubbleBackground({ variant = 'default' }: AnimatedBubbleBackgroundProps) {
  if (variant === 'splash') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Soft top-right ambient paw bubble */}
        <FloatingBubble
          size={240}
          top={-40}
          right={-50}
          color="rgba(15, 123, 110, 0.12)"
          duration={4400}
          moveY={20}
          moveX={-12}
          showPaw
        />
        {/* Soft top-left ambient paw bubble */}
        <FloatingBubble
          size={260}
          top={40}
          left={-70}
          color="rgba(245, 158, 11, 0.10)"
          duration={4800}
          moveY={18}
          moveX={14}
          showPaw
        />
        {/* Soft mid-right ambient bubble */}
        <FloatingBubble
          size={130}
          top={220}
          right={10}
          color="rgba(15, 123, 110, 0.14)"
          duration={3600}
          moveY={15}
          moveX={-10}
          showPaw
        />
        {/* Soft lower-left ambient paw bubble */}
        <FloatingBubble
          size={140}
          bottom={80}
          left={-25}
          color="rgba(0, 168, 150, 0.14)"
          duration={4100}
          moveY={18}
          moveX={10}
          showPaw
        />
        {/* Soft bottom-right ambient paw bubble */}
        <FloatingBubble
          size={180}
          bottom={-30}
          right={-35}
          color="rgba(15, 123, 110, 0.15)"
          duration={4500}
          moveY={22}
          moveX={-14}
          showPaw
        />
        {/* Soft bottom-center accent paw bubble */}
        <FloatingBubble
          size={95}
          bottom={140}
          right={30}
          color="rgba(245, 158, 11, 0.11)"
          duration={3700}
          moveY={14}
          moveX={-8}
          showPaw
        />
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Top large bubble */}
      <FloatingBubble
        size={240}
        top={-30}
        right={-40}
        color="rgba(15, 123, 110, 0.16)"
        duration={4200}
        moveY={22}
        moveX={-12}
      />
      {/* Hero central ambient bubble */}
      <FloatingBubble
        size={280}
        top={80}
        left={-60}
        color="rgba(245, 158, 11, 0.12)"
        duration={4800}
        moveY={18}
        moveX={16}
      />
      {/* Middle right floating bubble */}
      <FloatingBubble
        size={110}
        top={220}
        right={15}
        color="rgba(15, 123, 110, 0.18)"
        duration={3500}
        moveY={15}
        moveX={-10}
      />
      {/* Top left small accent bubble */}
      <FloatingBubble
        size={70}
        top={60}
        left={40}
        color="rgba(15, 123, 110, 0.2)"
        duration={3200}
        moveY={12}
        moveX={8}
      />
      {/* Mid-screen floating accent bubble */}
      <FloatingBubble
        size={90}
        top={320}
        left={30}
        color="rgba(15, 123, 110, 0.14)"
        duration={4000}
        moveY={20}
        moveX={-14}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
  },
});
