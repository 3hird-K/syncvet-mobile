import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, shadows, typography } from '@theme';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Pill segmented control with a sliding active thumb. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const [width, setWidth] = useState(0);
  const index = options.findIndex((o) => o.value === value);
  const itemWidth = Math.max((width - 8) / options.length, 0);
  const thumbX = useSharedValue(0);

  useEffect(() => {
    thumbX.value = withTiming(index * itemWidth, { duration: 240 });
  }, [index, itemWidth, thumbX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  return (
    <View
      style={styles.container}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      <Animated.View style={[styles.thumb, { width: itemWidth }, thumbStyle]} />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) onChange(option.value);
            }}
            style={styles.option}
          >
            <Text
              style={[styles.label, active ? styles.labelActive : styles.labelInactive]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 4,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  option: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.button,
  },
  labelActive: {
    color: colors.primaryDark,
  },
  labelInactive: {
    color: colors.textMuted,
  },
});
