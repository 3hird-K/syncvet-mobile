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
        damping: 18,
        stiffness: 240,
        mass: 0.6,
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
        {/* Animated Sliding White Capsule Thumb */}
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
            <Ionicons
              name={isUpcoming ? 'calendar' : 'calendar-outline'}
              size={16}
              color={isUpcoming ? colors.primaryDark : colors.textMuted}
            />

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
                styles.countPill,
                isUpcoming ? styles.countPillActive : styles.countPillInactive,
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  isUpcoming ? styles.countTextActive : styles.countTextInactive,
                ]}
              >
                {upcomingCount}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* 2. HISTORY TAB */}
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: !isUpcoming }}
          onPress={() => handleSelect('past')}
          style={styles.tabItem}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name={!isUpcoming ? 'time' : 'time-outline'}
              size={16}
              color={!isUpcoming ? colors.primaryDark : colors.textMuted}
            />

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
                styles.countPill,
                !isUpcoming ? styles.countPillActive : styles.countPillInactive,
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  !isUpcoming ? styles.countTextActive : styles.countTextInactive,
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
    height: 46,
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
    borderColor: 'rgba(10, 110, 100, 0.10)',
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
    gap: 6,
  },
  tabLabel: {
    ...typography.captionBold,
    fontSize: 13,
    fontFamily: typography.font.bold,
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  tabLabelInactive: {
    color: colors.textMuted,
  },
  countPill: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillActive: {
    backgroundColor: 'rgba(10, 110, 100, 0.12)',
  },
  countPillInactive: {
    backgroundColor: 'rgba(7, 30, 38, 0.06)',
  },
  countText: {
    ...typography.captionBold,
    fontSize: 10.5,
    fontFamily: typography.font.bold,
  },
  countTextActive: {
    color: colors.primaryDark,
  },
  countTextInactive: {
    color: colors.textMuted,
  },
});
