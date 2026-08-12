import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';

export interface VisualCardOption<T extends string> {
  value: T;
  title: string;
  subtitle?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  emoji?: string;
  badgeBg?: string;
}

interface VisualChoiceCardsProps<T extends string> {
  options: VisualCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function VisualChoiceCards<T extends string>({
  options,
  value,
  onChange,
}: VisualChoiceCardsProps<T>) {
  return (
    <View style={styles.grid}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <CardOption
            key={option.value}
            option={option}
            active={active}
            onPress={() => {
              haptic.light();
              onChange(option.value);
            }}
          />
        );
      })}
    </View>
  );
}

function CardOption<T extends string>({
  option,
  active,
  onPress,
}: {
  option: VisualCardOption<T>;
  active: boolean;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const defaultBadgeBg = active ? colors.primary : colors.surfaceMuted;

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={option.title}
        onPressIn={() => {
          scale.value = withSpring(reducedMotion ? 1 : 0.96, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
        }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          active && styles.cardActive,
          pressed && styles.cardPressed,
          shadows.sm,
        ]}
      >
        {/* Active Checkmark Badge */}
        {active ? (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={13} color={colors.white} />
          </View>
        ) : null}

        {/* Option Icon / Emoji Badge */}
        <View style={[styles.iconBadge, { backgroundColor: option.badgeBg ?? defaultBadgeBg }]}>
          {option.emoji ? (
            <Text style={styles.emoji}>{option.emoji}</Text>
          ) : option.iconName ? (
            <Ionicons
              name={option.iconName}
              size={24}
              color={active ? colors.white : colors.primary}
            />
          ) : null}
        </View>

        {/* Text Content */}
        <View style={styles.textWrap}>
          <Text style={[styles.title, active && styles.titleActive]}>{option.title}</Text>
          {option.subtitle ? (
            <Text style={[styles.subtitle, active && styles.subtitleActive]}>
              {option.subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
    minHeight: 74,
    gap: spacing.md,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardPressed: {
    opacity: 0.9,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.captionBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  titleActive: {
    color: colors.primaryDark,
  },
  subtitle: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  subtitleActive: {
    color: colors.primary,
  },
});
