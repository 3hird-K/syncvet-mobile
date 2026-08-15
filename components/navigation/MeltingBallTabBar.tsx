import React, { useCallback, useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors, radius, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface TabRouteConfig {
  name: string;
  label: string;
  inactiveIcon: IoniconName;
  activeIcon: IoniconName;
}

const TAB_CONFIGS: Record<string, TabRouteConfig> = {
  index: {
    name: 'index',
    label: 'Home',
    inactiveIcon: 'home-outline',
    activeIcon: 'home',
  },
  services: {
    name: 'services',
    label: 'Services',
    inactiveIcon: 'grid-outline',
    activeIcon: 'grid',
  },
  pets: {
    name: 'pets',
    label: 'Pets',
    inactiveIcon: 'paw-outline',
    activeIcon: 'paw',
  },
  appointments: {
    name: 'appointments',
    label: 'Visits', // Changed from "Appointments" to "Visits"
    inactiveIcon: 'calendar-outline',
    activeIcon: 'calendar',
  },
  profile: {
    name: 'profile',
    label: 'Profile',
    inactiveIcon: 'person-outline',
    activeIcon: 'person',
  },
};

export type MeltingBallTabBarProps = BottomTabBarProps;

const CUTOUT_WIDTH = 84;
const CUTOUT_HEIGHT = 26;
const BADGE_SIZE = 52;

/**
 * Single Tab Item Component:
 * - When inactive: Icon is centered in navbar; label is hidden (opacity: 0, translated down).
 * - When active: Icon rises into the floating circular badge; label rises into the space previously occupied by the icon.
 */
function TabItem({
  route,
  index,
  tabWidth,
  badgeX,
  onPress,
  onLongPress,
}: {
  route: { key: string; name: string };
  index: number;
  tabWidth: number;
  badgeX: SharedValue<number>;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const config = TAB_CONFIGS[route.name] || {
    name: route.name,
    label: route.name,
    inactiveIcon: 'ellipse-outline',
    activeIcon: 'ellipse',
  };

  // Continuous proximity progress: 1 when badge is on this tab, 0 when far away
  const progress = useDerivedValue(() => {
    const currentPos = badgeX.value / tabWidth;
    const diff = Math.abs(currentPos - index);
    if (diff >= 1) return 0;
    // Smooth cosine interpolation for organic, fluid motion
    return 0.5 * (1 + Math.cos(Math.PI * diff));
  });

  const pressScale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.92, { mass: 0.3, damping: 12, stiffness: 200 });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, { mass: 0.4, damping: 14, stiffness: 180 });
  }, [pressScale]);

  // Icon translates upward into the elevated circular badge
  const animatedIconWrapperStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [0, -32]);
    const scale = interpolate(progress.value, [0, 1], [1, 1.08]);

    return {
      transform: [
        { translateY },
        { scale: scale * pressScale.value },
      ],
    };
  });

  // Crossfade between active (white) and inactive (muted) icon glyphs
  const animatedActiveIconStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
    };
  });

  const animatedInactiveIconStyle = useAnimatedStyle(() => {
    return {
      opacity: 1 - progress.value,
    };
  });

  // Label translates upward into the navbar space and fades in
  const animatedLabelStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [14, 0]);
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0, 0.1, 1]);

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={`${config.label} tab`}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tabButton, { width: tabWidth }]}
    >
      <View style={styles.tabContent}>
        {/* Animated Rising Icon */}
        <Animated.View style={[styles.iconContainer, animatedIconWrapperStyle]}>
          {/* Active (White) Icon */}
          <Animated.View style={[styles.iconAbsolute, animatedActiveIconStyle]}>
            <Ionicons name={config.activeIcon} size={22} color={colors.white} />
          </Animated.View>

          {/* Inactive (Muted) Icon */}
          <Animated.View style={[styles.iconAbsolute, animatedInactiveIconStyle]}>
            <Ionicons name={config.inactiveIcon} size={22} color={colors.textMuted} />
          </Animated.View>
        </Animated.View>

        {/* Animated Rising Label */}
        <Animated.Text
          numberOfLines={1}
          style={[styles.tabLabel, animatedLabelStyle]}
        >
          {config.label}
        </Animated.Text>
      </View>
    </Pressable>
  );
}

/**
 * Refined SyncVet Bottom Navigation Bar.
 *
 * Implements a floating circular badge with a curved negative-space notch cutout:
 * - Inactive: Icon centered in navbar, label hidden.
 * - Active: Icon rises into the elevated circular badge, label reveals below it inside the navbar.
 * - Transition: The circular badge and curved cutout move synchronously on the X-axis while
 *   the outgoing icon/label descend and the incoming icon/label ascend simultaneously.
 */
export function MeltingBallTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: MeltingBallTabBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  // Dock geometry
  const horizontalMargin = 16;
  const barWidth = windowWidth - horizontalMargin * 2;
  const tabCount = Math.max(state.routes.length, 1);
  const tabWidth = barWidth / tabCount;

  // Badge X position is the single source of truth for all horizontal and vertical sync
  const badgeX = useSharedValue(state.index * tabWidth);

  // Synchronize badgeX on state.index changes
  useEffect(() => {
    const targetX = state.index * tabWidth;

    if (reducedMotion) {
      badgeX.value = withTiming(targetX, { duration: 200 });
      return;
    }

    // Coordinated ~550ms smooth fluid spring
    badgeX.value = withSpring(targetX, {
      mass: 0.58,
      damping: 14,
      stiffness: 135,
      overshootClamping: false,
    });
  }, [state.index, tabWidth, reducedMotion, badgeX]);

  // Animated style for the floating circular badge and negative-space cutout
  const animatedBadgeCutoutStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: badgeX.value }],
    };
  });

  const bottomInset = Math.max(insets.bottom, 12);

  // Center offset for the cutout notch and badge inside each tab column
  const cutoutLeft = (tabWidth - CUTOUT_WIDTH) / 2;
  const badgeLeft = (tabWidth - BADGE_SIZE) / 2;

  return (
    <View
      style={[
        styles.dockWrapper,
        {
          bottom: bottomInset,
          marginHorizontal: horizontalMargin,
          width: barWidth,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* 1. Main Navbar Surface Background */}
      <View style={[styles.floatingDock, shadows.lg]}>
        {/* Animated Cutout Notch + Floating Circular Badge Unit */}
        <Animated.View
          style={[
            styles.animatedBadgeCutoutContainer,
            animatedBadgeCutoutStyle,
          ]}
          pointerEvents="none"
        >
          {/* A. Curved Negative-Space Cutout (SVG Notch) */}
          <View style={[styles.cutoutWrapper, { left: cutoutLeft }]}>
            <Svg width={CUTOUT_WIDTH} height={CUTOUT_HEIGHT} viewBox="0 0 84 26">
              {/* Negative-space cutout fill (matches screen background #F7FAF9) */}
              <Path
                d="M 0,0 C 18,0 24,24 42,24 C 60,24 66,0 84,0 L 84,26 L 0,26 Z"
                fill={colors.background}
              />
              {/* Subtle curved rim border matching dock border */}
              <Path
                d="M 0,0.5 C 18,0.5 24,24 42,24 C 60,24 66,0.5 84,0.5"
                fill="none"
                stroke="rgba(10, 110, 100, 0.12)"
                strokeWidth={1.5}
              />
            </Svg>
          </View>

          {/* B. Elevated Floating Circular Badge */}
          <View style={[styles.floatingBadge, { left: badgeLeft }]}>
            <View style={styles.badgeGloss} />
          </View>
        </Animated.View>

        {/* 2. Interactive Tab Buttons Row */}
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            const onPress = () => {
              haptic.light();
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              haptic.medium();
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabItem
                key={route.key}
                route={route}
                index={index}
                tabWidth={tabWidth}
                badgeX={badgeX}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
  },
  floatingDock: {
    height: 64,
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(10, 110, 100, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    // Ambient elevation
    ...Platform.select({
      ios: {
        shadowColor: '#071E26',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 22,
      },
      android: {
        elevation: 10,
      },
      default: {},
    }),
  },
  animatedBadgeCutoutContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  cutoutWrapper: {
    position: 'absolute',
    top: -1,
    width: CUTOUT_WIDTH,
    height: CUTOUT_HEIGHT,
  },
  floatingBadge: {
    position: 'absolute',
    top: -24,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Luminous organic teal badge glow
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  badgeGloss: {
    position: 'absolute',
    top: 2,
    left: '20%',
    right: '20%',
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  tabButton: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAbsolute: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    position: 'absolute',
    bottom: 10,
    fontFamily: typography.font.bold,
    fontSize: 11,
    color: colors.primaryDark,
    letterSpacing: -0.15,
    textAlign: 'center',
  },
});
