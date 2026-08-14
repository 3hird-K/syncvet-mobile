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
  badgeBg?: string;
  badgeColor?: string;
}

interface VisualChoiceCardsProps<T extends string> {
  options: VisualCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layout?: 'row' | 'stack';
}

export function VisualChoiceCards<T extends string>({
  options,
  value,
  onChange,
  layout = 'row',
}: VisualChoiceCardsProps<T>) {
  if (layout === 'stack') {
    return (
      <View style={styles.stackContainer}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <StackCardOption
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

  return (
    <View style={styles.rowContainer}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <RowCardOption
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

/** Vertical-centered card for 2-column side-by-side choices (e.g. Dog/Cat, Male/Female) */
function RowCardOption<T extends string>({
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

  const iconColor = active
    ? colors.primaryDark
    : option.badgeColor ?? colors.textSecondary;

  return (
    <Animated.View style={[styles.rowItem, animatedStyle]}>
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
          styles.rowCard,
          active && styles.cardActive,
          pressed && styles.cardPressed,
          shadows.sm,
        ]}
      >
        {active ? (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={11} color={colors.white} />
          </View>
        ) : null}

        {option.iconName ? (
          <View
            style={[
              styles.rowIconBadge,
              {
                backgroundColor: active
                  ? colors.primaryLight
                  : option.badgeBg ?? colors.surfaceMuted,
              },
            ]}
          >
            <Ionicons name={option.iconName} size={18} color={iconColor} />
          </View>
        ) : null}

        <View style={styles.rowTextWrap}>
          <Text
            style={[styles.rowTitle, active && styles.titleActive]}
            numberOfLines={1}
          >
            {option.title}
          </Text>
          {option.subtitle ? (
            <Text
              style={[styles.rowSubtitle, active && styles.subtitleActive]}
              numberOfLines={1}
            >
              {option.subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Full-width horizontal row card for 3+ item choices (e.g. Anti-Rabies, Spay/Neuter, Weight) */
function StackCardOption<T extends string>({
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

  const iconColor = active
    ? colors.primaryDark
    : option.badgeColor ?? colors.textSecondary;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={option.title}
        onPressIn={() => {
          scale.value = withSpring(reducedMotion ? 1 : 0.98, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
        }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.stackCard,
          active && styles.cardActive,
          pressed && styles.cardPressed,
          shadows.sm,
        ]}
      >
        {option.iconName ? (
          <View
            style={[
              styles.stackIconBadge,
              {
                backgroundColor: active
                  ? colors.primaryLight
                  : option.badgeBg ?? colors.surfaceMuted,
              },
            ]}
          >
            <Ionicons name={option.iconName} size={18} color={iconColor} />
          </View>
        ) : null}

        <View style={styles.stackTextWrap}>
          <Text style={[styles.stackTitle, active && styles.titleActive]}>
            {option.title}
          </Text>
          {option.subtitle ? (
            <Text style={[styles.stackSubtitle, active && styles.subtitleActive]}>
              {option.subtitle}
            </Text>
          ) : null}
        </View>

        {/* Radio Indicator */}
        <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
          {active ? <View style={styles.radioDot} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  rowItem: {
    flex: 1,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 44,
    position: 'relative',
    gap: 8,
  },
  rowIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  rowTitle: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  rowSubtitle: {
    ...typography.small,
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 0.5,
  },
  stackContainer: {
    gap: spacing.xs,
    width: '100%',
  },
  stackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 46,
    gap: 10,
  },
  stackIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackTextWrap: {
    flex: 1,
  },
  stackTitle: {
    ...typography.captionBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  stackSubtitle: {
    ...typography.small,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  radioCircleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FAF8',
  },
  cardPressed: {
    opacity: 0.9,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  titleActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  subtitleActive: {
    color: colors.primary,
  },
});
