import React, { forwardRef, useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type {
  BlurEvent,
  FocusEvent,
  TextInputProps,
} from 'react-native';
import type { ReactNode } from 'react';

import { colors, radius, spacing, typography } from '@theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
  required?: boolean;
  containerStyle?: object;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    helper,
    leftIcon,
    rightIcon,
    onRightIconPress,
    required,
    containerStyle,
    onFocus,
    onBlur,
    style,
    editable = true,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const focusProgress = useSharedValue(0);

  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;
  const borderColorAnim = useAnimatedStyle(() => {
    return {
      borderColor: withTiming(borderColor, { duration: reducedMotion ? 0 : 200 }),
    };
  });

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      setFocused(true);
      focusProgress.value = 1;
      onFocus?.(e);
    },
    [onFocus, focusProgress],
  );

  const handleBlur = useCallback(
    (e: BlurEvent) => {
      setFocused(false);
      focusProgress.value = 0;
      onBlur?.(e);
    },
    [onBlur, focusProgress],
  );

  const labelAnim = useAnimatedStyle(() => {
    return {
      color: withTiming(
        error ? colors.error : focusProgress.value > 0.5 ? colors.primary : colors.textSecondary,
        { duration: reducedMotion ? 0 : 200 },
      ),
    };
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Animated.Text
          style={[styles.label, labelAnim]}
          accessibilityRole="header"
        >
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Animated.Text>
      ) : null}

      <Animated.View
        style={[
          styles.field,
          borderColorAnim,
          { backgroundColor: editable ? colors.surface : colors.surfaceMuted },
          error && styles.fieldError,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={colors.textDisabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          {...rest}
        />

        {rightIcon ? (
          <Pressable
            accessibilityRole={onRightIconPress ? 'button' : undefined}
            accessibilityLabel={onRightIconPress ? 'Toggle' : undefined}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={8}
            style={styles.rightIcon}
          >
            {rightIcon}
          </Pressable>
        ) : null}
      </Animated.View>

      {error ? (
        <View style={styles.helperRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={[styles.helper, styles.errorText]} accessibilityRole="alert">
            {error}
          </Text>
        </View>
      ) : helper ? (
        <View style={styles.helperRow}>
          <Text style={styles.helper}>{helper}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },
  required: {
    color: colors.error,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  fieldError: {
    backgroundColor: colors.errorLight,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    includeFontPadding: false,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  helper: {
    ...typography.small,
    color: colors.textMuted,
    flexShrink: 1,
  },
  errorText: {
    color: colors.error,
  },
});
