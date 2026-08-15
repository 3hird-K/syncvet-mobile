import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle, TextStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showPaw?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_STYLES = {
  primary: {
    bg: colors.primaryDark,
    pressedBg: '#085C54',
    text: colors.white,
    border: 'transparent',
  },
  secondary: {
    bg: 'rgba(10, 110, 100, 0.10)',
    pressedBg: 'rgba(10, 110, 100, 0.16)',
    text: colors.primaryDark,
    border: 'transparent',
  },
  outline: {
    bg: 'transparent',
    pressedBg: 'rgba(10, 110, 100, 0.06)',
    text: colors.primaryDark,
    border: 'rgba(10, 110, 100, 0.22)',
  },
  ghost: {
    bg: 'transparent',
    pressedBg: 'rgba(7, 30, 38, 0.05)',
    text: colors.primaryDark,
    border: 'transparent',
  },
  danger: {
    bg: colors.error,
    pressedBg: colors.errorDark,
    text: colors.white,
    border: 'transparent',
  },
} as const;

const SIZE_STYLES: Record<ButtonSize, { height: number; paddingH: number; text: TextStyle }> = {
  sm: {
    height: 36,
    paddingH: 14,
    text: {
      ...typography.captionBold,
      fontSize: 12,
      fontFamily: typography.font.bold,
    },
  },
  md: {
    height: 44,
    paddingH: 18,
    text: {
      ...typography.captionBold,
      fontSize: 13.5,
      fontFamily: typography.font.bold,
    },
  },
  lg: {
    height: 50,
    paddingH: 22,
    text: {
      ...typography.title,
      fontSize: 15,
      fontFamily: typography.font.bold,
    },
  },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  showPaw = false,
  accessibilityLabel,
  testID,
  style,
}: ButtonProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const bg = useSharedValue(0);

  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  const isDisabled = disabled || loading;

  const bgStyle = useAnimatedStyle(() => {
    const t = bg.value;
    return {
      backgroundColor: withTiming(
        t > 0.5 ? variantStyle.pressedBg : variantStyle.bg,
        { duration: reducedMotion ? 0 : 120 },
      ),
    };
  });

  const scaleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(scale.value, {
            damping: 18,
            stiffness: 300,
            mass: 0.6,
          }),
        },
      ],
    };
  });

  const handlePressIn = useCallback(() => {
    if (isDisabled) return;
    bg.value = 1;
    if (!reducedMotion) scale.value = 0.98;
  }, [isDisabled, reducedMotion, scale, bg]);

  const handlePressOut = useCallback(() => {
    bg.value = 0;
    scale.value = 1;
  }, [bg, scale]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.row}>
          <ActivityIndicator
            size="small"
            color={variantStyle.text}
            accessibilityElementsHidden
          />
        </View>
      );
    }
    return (
      <View style={styles.row}>
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
        <Text
          style={[
            sizeStyle.text,
            { color: variantStyle.text },
            isDisabled && styles.disabledText,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {rightIcon ? (
          <View style={styles.iconRight}>{rightIcon}</View>
        ) : showPaw ? (
          <View style={styles.iconRight}>
            <Ionicons name="paw" size={size === 'sm' ? 14 : 16} color={variantStyle.text} />
          </View>
        ) : null}
      </View>
    );
  }, [loading, leftIcon, rightIcon, showPaw, variantStyle.text, sizeStyle.text, isDisabled, title, size]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingH,
          borderRadius: radius.pill,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: variantStyle.border,
          opacity: isDisabled ? (variant === 'primary' || variant === 'danger' ? 0.55 : 0.4) : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
        pressed && styles.pressed,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius.pill,
            borderWidth: variant === 'outline' ? 1.5 : 0,
            borderColor: variantStyle.border,
          },
          bgStyle,
        ]}
      />
      <Animated.View style={[styles.content, scaleStyle]}>{content}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
  disabledText: {
    opacity: 0.8,
  },
});
