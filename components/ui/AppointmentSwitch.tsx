import React, { useEffect } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';

export type AppointmentTab = 'upcoming' | 'past';

interface AppointmentSwitchProps {
  activeTab: AppointmentTab;
  onChange: (tab: AppointmentTab) => void;
  upcomingCount?: number;
  pastCount?: number;
}

export function AppointmentSwitch({
  activeTab,
  onChange,
  upcomingCount = 0,
  pastCount = 0,
}: AppointmentSwitchProps) {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const isUpcoming = activeTab === 'upcoming';
  const thumbOffset = useSharedValue(0);

  const thumbWidth = containerWidth > 0 ? (containerWidth - 8) / 2 : 0;

  useEffect(() => {
    if (thumbWidth > 0) {
      thumbOffset.value = withSpring(isUpcoming ? 0 : thumbWidth, {
        damping: 16,
        stiffness: 220,
        mass: 0.7,
      });
    }
  }, [isUpcoming, thumbWidth, thumbOffset]);

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbOffset.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setContainerWidth(w);
  };

  const handleSelect = (tab: AppointmentTab) => {
    if (tab !== activeTab) {
      haptic.light();
      onChange(tab);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.container}
        onLayout={handleLayout}
        accessibilityRole="tablist"
      >
        {/* Animated Sliding Pill Thumb */}
        {thumbWidth > 0 && (
          <Animated.View
            style={[
              styles.thumb,
              { width: thumbWidth },
              animatedThumbStyle,
              shadows.sm,
            ]}
          />
        )}

        {/* 1. UPCOMING TAB */}
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: isUpcoming }}
          onPress={() => handleSelect('upcoming')}
          style={styles.tabItem}
        >
          <View style={styles.tabContent}>
            <View
              style={[
                styles.iconBubble,
                isUpcoming && styles.iconBubbleActiveUpcoming,
              ]}
            >
              <Ionicons
                name={isUpcoming ? 'calendar' : 'calendar-outline'}
                size={16}
                color={isUpcoming ? colors.primary : colors.textSecondary}
              />
            </View>

            <Text
              style={[
                styles.tabLabel,
                isUpcoming ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              Upcoming
            </Text>

            <View
              style={[
                styles.badge,
                isUpcoming ? styles.badgeActiveUpcoming : styles.badgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isUpcoming
                    ? styles.badgeTextActiveUpcoming
                    : styles.badgeTextInactive,
                ]}
              >
                {upcomingCount}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* 2. PAST HISTORY TAB */}
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: !isUpcoming }}
          onPress={() => handleSelect('past')}
          style={styles.tabItem}
        >
          <View style={styles.tabContent}>
            <View
              style={[
                styles.iconBubble,
                !isUpcoming && styles.iconBubbleActivePast,
              ]}
            >
              <Ionicons
                name={!isUpcoming ? 'time' : 'time-outline'}
                size={16}
                color={!isUpcoming ? colors.primaryDark : colors.textSecondary}
              />
            </View>

            <Text
              style={[
                styles.tabLabel,
                !isUpcoming ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              History
            </Text>

            <View
              style={[
                styles.badge,
                !isUpcoming ? styles.badgeActivePast : styles.badgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  !isUpcoming
                    ? styles.badgeTextActivePast
                    : styles.badgeTextInactive,
                ]}
              >
                {pastCount}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 30, 38, 0.05)',
    borderRadius: radius.pill,
    padding: 4,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.16)',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  iconBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconBubbleActiveUpcoming: {
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
  },
  iconBubbleActivePast: {
    backgroundColor: 'rgba(7, 30, 38, 0.08)',
  },
  tabLabel: {
    ...typography.captionBold,
    fontSize: 13,
  },
  tabLabelActive: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActiveUpcoming: {
    backgroundColor: colors.primary,
  },
  badgeActivePast: {
    backgroundColor: colors.textSecondary,
  },
  badgeInactive: {
    backgroundColor: 'rgba(7, 30, 38, 0.08)',
  },
  badgeText: {
    ...typography.captionBold,
    fontSize: 10.5,
    fontWeight: '800',
  },
  badgeTextActiveUpcoming: {
    color: colors.white,
  },
  badgeTextActivePast: {
    color: colors.white,
  },
  badgeTextInactive: {
    color: colors.textSecondary,
  },
});
