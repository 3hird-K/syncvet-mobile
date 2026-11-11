import { useCallback, useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePathname, useRouter } from 'expo-router';
import { colors, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';

export interface BottomTabBarProps {
  state: any;
  descriptors: any;
  navigation?: any;
  emitter?: any;
  navigateToTab?: (routeKey: string) => void;
  insets?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface TabRouteConfig {
  name: string;
  label: string;
  inactiveIcon: string;
  activeIcon: string;
  iconFamily?: 'Ionicons' | 'MaterialCommunityIcons';
}

const TAB_CONFIGS: Record<string, TabRouteConfig> = {
  index: {
    name: 'index',
    label: 'Home',
    inactiveIcon: 'home-outline',
    activeIcon: 'home',
    iconFamily: 'Ionicons',
  },
  messages: {
    name: 'messages',
    label: 'Messenger',
    inactiveIcon: 'facebook-messenger',
    activeIcon: 'facebook-messenger',
    iconFamily: 'MaterialCommunityIcons',
  },
  services: {
    name: 'messages',
    label: 'Messenger',
    inactiveIcon: 'facebook-messenger',
    activeIcon: 'facebook-messenger',
    iconFamily: 'MaterialCommunityIcons',
  },
  pets: {
    name: 'pets',
    label: 'Pets',
    inactiveIcon: 'paw-outline',
    activeIcon: 'paw',
    iconFamily: 'Ionicons',
  },
  appointments: {
    name: 'appointments',
    label: 'Visits', // Underlying route: appointments, Display: Visits
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

const TAB_ROOT_PATHS: Record<string, string> = {
  index: '/',
  messages: '/messages',
  services: '/messages',
  pets: '/pets',
  appointments: '/appointments',
  profile: '/profile',
};

export type MeltingBallTabBarProps = BottomTabBarProps;

const BADGE_SIZE = 52;
const DOCK_HEIGHT = 64;
const CORNER_RADIUS = 28;
const DIP_WIDTH = 76;
const DIP_DEPTH = 38;

/**
 * Calculates a single continuous SVG path for the navbar background
 * with a deeply sunken, organic curved cradle centered at cx.
 */
function getNavbarSvgPath(
  w: number,
  h: number,
  cx: number,
  r = CORNER_RADIUS,
  dipWidth = DIP_WIDTH,
  dipDepth = DIP_DEPTH,
): string {
  'worklet';
  const halfW = dipWidth / 2;
  // Clamp dip shoulders inside the navbar top bounds
  const leftDip = Math.max(r, cx - halfW);
  const rightDip = Math.min(w - r, cx + halfW);
  const actualCx = (leftDip + rightDip) / 2;
  const currentHalf = (rightDip - leftDip) / 2;

  // Steep, deep organic cubic bezier control points
  const cp1X = leftDip + currentHalf * 0.32;
  const cp2X = actualCx - currentHalf * 0.44;
  const cp3X = actualCx + currentHalf * 0.44;
  const cp4X = rightDip - currentHalf * 0.32;

  return [
    `M ${r},0`,
    `L ${leftDip},0`,
    `C ${cp1X},0 ${cp2X},${dipDepth} ${actualCx},${dipDepth}`,
    `C ${cp3X},${dipDepth} ${cp4X},0 ${rightDip},0`,
    `L ${w - r},0`,
    `A ${r},${r} 0 0,1 ${w},${r}`,
    `L ${w},${h - r}`,
    `A ${r},${r} 0 0,1 ${w - r},${h}`,
    `L ${r},${h}`,
    `A ${r},${r} 0 0,1 0,${h - r}`,
    `L 0,${r}`,
    `A ${r},${r} 0 0,1 ${r},0`,
    `Z`,
  ].join(' ');
}

/**
 * Single Tab Item Component:
 * - Inactive: Icon centered in navbar; label hidden.
 * - Active: Icon rises into the floating circular badge; label rises into the navbar.
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
    if (tabWidth <= 0) return 0;
    const currentPos = badgeX.value / tabWidth;
    const diff = Math.abs(currentPos - index);
    if (diff >= 1) return 0;
    // Smooth cosine curve for seamless fluid transition
    return 0.5 * (1 + Math.cos(Math.PI * diff));
  });

  const pressScale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.92, { mass: 0.3, damping: 12, stiffness: 200 });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, { mass: 0.4, damping: 14, stiffness: 180 });
  }, [pressScale]);

  // Icon translates upward into the deeply sunken floating circle
  const animatedIconWrapperStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [0, -14]);
    const scale = interpolate(progress.value, [0, 1], [1, 1.06]);

    return {
      transform: [
        { translateY },
        { scale: scale * pressScale.value },
      ],
    };
  });

  // Crossfade active (white) and inactive (muted) icon glyphs
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

  // Label translates upward directly below the curved dip and fades in
  const animatedLabelStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [14, 0]);
    const opacity = interpolate(progress.value, [0, 0.35, 1], [0, 0.15, 1]);

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
        <Animated.View style={[styles.iconContainer, animatedIconWrapperStyle as any]}>
          {/* Active (White) Icon */}
          <Animated.View style={[styles.iconAbsolute, animatedActiveIconStyle as any]}>
            {config.iconFamily === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons name={config.activeIcon as any} size={23} color={colors.white} />
            ) : (
              <Ionicons name={config.activeIcon as any} size={22} color={colors.white} />
            )}
          </Animated.View>

          {/* Inactive (Muted) Icon */}
          <Animated.View style={[styles.iconAbsolute, animatedInactiveIconStyle as any]}>
            {config.iconFamily === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons name={config.inactiveIcon as any} size={23} color={colors.textMuted} />
            ) : (
              <Ionicons name={config.inactiveIcon as any} size={22} color={colors.textMuted} />
            )}
          </Animated.View>
        </Animated.View>

        {/* Animated Rising Label */}
        <Animated.Text
          numberOfLines={1}
          style={[styles.tabLabel, animatedLabelStyle as any]}
        >
          {config.label}
        </Animated.Text>
      </View>
    </Pressable>
  );
}

/**
 * Signature Curved Cradle Bottom Tab Bar for SyncVet:
 * - Seamless SVG navbar body with an organic curved dip around the active tab.
 * - Active circular badge nestled in the dip with active white icon.
 * - Active label revealed cleanly inside the navbar below the cradle.
 * - 100% fluid, responsive layout across all device widths.
 */
export function MeltingBallTabBar(props: MeltingBallTabBarProps) {
  const {
    state,
    descriptors,
    navigation,
    emitter,
    navigateToTab,
    insets,
  } = props;
  const router = useRouter();
  const pathname = usePathname();
  const { width: windowWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  // Responsive dock geometry based on screen width
  const horizontalMargin = Math.max(16, Math.min(24, Math.round(windowWidth * 0.045)));
  const barWidth = windowWidth - horizontalMargin * 2;
  const tabCount = Math.max(state.routes.length, 1);
  const tabWidth = barWidth / tabCount;

  // Badge X position is the single source of truth for horizontal motion
  const badgeX = useSharedValue(state.index * tabWidth);

  // Automatically hide tab bar when keyboard is visible
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Recursively find current focused route name across nested stacks
  const getNestedRouteName = (route: any): string => {
    if (route?.state?.routes && typeof route?.state?.index === 'number') {
      const child = route.state.routes[route.state.index];
      return getNestedRouteName(child);
    }
    return route?.name ?? '';
  };

  const activeRoute = state.routes[state.index];
  const activeDescriptor = descriptors[activeRoute?.key];
  const tabBarStyle = activeDescriptor?.options?.tabBarStyle as any;
  const isExplicitlyHidden = tabBarStyle?.display === 'none';

  const currentChildName = getNestedRouteName(activeRoute);
  // Full-screen wizards, sub-creation flows, and chat conversations should not show the bottom dock
  const isChatConversation = pathname ? (pathname.startsWith('/messages/') && pathname !== '/messages') : false;
  const isFullScreenFlow =
    currentChildName === 'add' ||
    currentChildName === 'new' ||
    (activeRoute?.name === 'messages' && currentChildName !== 'index') ||
    isChatConversation;

  // Synchronize badgeX on tab changes or screen resize
  useEffect(() => {
    const targetX = state.index * tabWidth;

    if (reducedMotion) {
      badgeX.value = withTiming(targetX, { duration: 180 });
      return;
    }

    // Coordinated ~500ms smooth spring physics
    badgeX.value = withSpring(targetX, {
      mass: 0.55,
      damping: 14,
      stiffness: 140,
      overshootClamping: false,
    });
  }, [state.index, tabWidth, reducedMotion, badgeX]);

  // Animated SVG Path for the seamless curved navbar contour
  const animatedSvgProps = useAnimatedProps(() => {
    'worklet';
    const cx = badgeX.value + tabWidth / 2;
    const d = getNavbarSvgPath(barWidth, DOCK_HEIGHT, cx, CORNER_RADIUS, DIP_WIDTH, DIP_DEPTH);
    return { d };
  });

  // Floating circular badge animated translation
  const animatedBadgeStyle = useAnimatedStyle(() => {
    const cx = badgeX.value + tabWidth / 2;
    return {
      transform: [{ translateX: cx - BADGE_SIZE / 2 }],
    };
  });

  const safeInsets = useSafeAreaInsets();
  const bottomInset = Math.max(insets?.bottom ?? safeInsets.bottom, 12);

  if (isKeyboardVisible || isExplicitlyHidden || isFullScreenFlow) {
    return null;
  }

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
      {/* 1. Seamless Curved Navbar SVG Background with Ambient Shadow */}
      <View style={[styles.svgBackgroundWrapper, shadows.lg]}>
        <Svg width={barWidth} height={DOCK_HEIGHT} viewBox={`0 0 ${barWidth} ${DOCK_HEIGHT}`}>
          <AnimatedPath
            animatedProps={animatedSvgProps as any}
            fill={colors.surface}
            stroke="rgba(10, 110, 100, 0.10)"
            strokeWidth={1.5}
          />
        </Svg>
      </View>

      {/* 2. Floating Circular Active Badge (Layer 2) */}
      <Animated.View
        style={[
          styles.floatingBadge,
          animatedBadgeStyle as any,
        ]}
        pointerEvents="none"
      />

      {/* 3. Interactive Tab Buttons Row (Layer 3 - Highest Z-Index) */}
      <View style={[styles.tabsRow, { width: barWidth, height: DOCK_HEIGHT }]}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const onPress = () => {
            haptic.light();
            const event = navigation?.emit
              ? navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              : emitter?.emit?.({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

            if (event?.defaultPrevented) return;

            if (!isFocused) {
              if (navigation?.navigate) {
                navigation.navigate(route.name, route.params);
              } else if (navigateToTab) {
                navigateToTab(route.key);
              } else {
                router.navigate(route.name as never);
              }
            } else {
              // If already focused on this tab (e.g. inside a subscreen like /pets/[id]), return to root of this tab
              const rootPath = TAB_ROOT_PATHS[route.name];
              if (rootPath) {
                router.navigate(rootPath as never);
              }
            }
          };

          const onLongPress = () => {
            haptic.medium();
            if (navigation?.emit) {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            } else if (emitter?.emit) {
              emitter.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            }
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
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
  },
  svgBackgroundWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    // Multi-layer ambient drop shadow
    ...Platform.select({
      ios: {
        shadowColor: '#071E26',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  floatingBadge: {
    position: 'absolute',
    top: -8,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
    // Luminous organic teal badge glow
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  tabButton: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
  },
  tabContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 30,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  iconAbsolute: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  tabLabel: {
    position: 'absolute',
    bottom: 4,
    fontFamily: typography.font.bold,
    fontSize: 10.5,
    color: colors.primaryDark,
    letterSpacing: -0.15,
    textAlign: 'center',
    zIndex: 35,
  },
});
