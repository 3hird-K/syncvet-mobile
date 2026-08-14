import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle, type DimensionValue, ScrollView } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, shadows, spacing } from '@theme';
import { Screen } from './Screen';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Base shimmering / pulsing atomic skeleton component.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(pulse.value, [0, 1], [0.35, 0.85]);
    return { opacity };
  });

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCircle({ size = 44, style }: { size?: number; style?: ViewStyle }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}

export function SkeletonText({
  lines = 1,
  width = '100%',
  height = 14,
  gap = 6,
  style,
}: {
  lines?: number;
  width?: DimensionValue;
  height?: number;
  gap?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          height={height}
          width={idx === lines - 1 && lines > 1 ? '65%' : width}
          borderRadius={4}
        />
      ))}
    </View>
  );
}

/**
 * Dashboard & Stats Card Skeleton
 */
export function DashboardCardSkeleton() {
  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.row}>
        <SkeletonCircle size={36} />
        <View style={styles.flexCol}>
          <Skeleton width="55%" height={15} borderRadius={4} />
          <Skeleton width="85%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      </View>

      <View style={styles.innerBox}>
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Skeleton width={24} height={18} borderRadius={4} />
            <Skeleton width={32} height={10} borderRadius={3} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.statCol}>
            <Skeleton width={24} height={18} borderRadius={4} />
            <Skeleton width={32} height={10} borderRadius={3} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.statCol}>
            <Skeleton width={24} height={18} borderRadius={4} />
            <Skeleton width={32} height={10} borderRadius={3} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.statCol}>
            <Skeleton width={24} height={18} borderRadius={4} />
            <Skeleton width={32} height={10} borderRadius={3} style={{ marginTop: 4 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Pet Passport Card Skeleton
 */
export function PetCardSkeleton() {
  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.row}>
        <SkeletonCircle size={48} />
        <View style={styles.flexCol}>
          <View style={styles.rowBetween}>
            <Skeleton width="45%" height={16} borderRadius={4} />
            <Skeleton width={50} height={18} borderRadius={radius.pill} />
          </View>
          <Skeleton width="60%" height={12} borderRadius={4} style={{ marginTop: 5 }} />
        </View>
      </View>

      <View style={styles.chipsRow}>
        <Skeleton width={130} height={22} borderRadius={radius.pill} />
        <Skeleton width={60} height={22} borderRadius={radius.pill} />
        <Skeleton width={75} height={22} borderRadius={radius.pill} />
      </View>

      <View style={styles.footerRow}>
        <Skeleton width={85} height={24} borderRadius={radius.pill} />
        <Skeleton width={90} height={14} borderRadius={4} />
      </View>
    </View>
  );
}

/**
 * Appointment Card Skeleton
 */
export function AppointmentCardSkeleton() {
  return (
    <View style={[styles.compactCard, shadows.sm]}>
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          <SkeletonCircle size={40} />
          <View style={styles.flexCol}>
            <Skeleton width={90} height={15} borderRadius={4} />
            <Skeleton width={120} height={11} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
        <Skeleton width={65} height={20} borderRadius={radius.pill} />
      </View>

      <View style={styles.metaBarSkeleton}>
        <Skeleton width="38%" height={14} borderRadius={4} />
        <Skeleton width="42%" height={14} borderRadius={4} />
      </View>

      <View style={styles.footerRow}>
        <Skeleton width={120} height={12} borderRadius={3} />
        <Skeleton width={45} height={12} borderRadius={3} />
      </View>
    </View>
  );
}

/**
 * Service Item Card Skeleton
 */
export function ServiceCardSkeleton() {
  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          <SkeletonCircle size={42} />
          <Skeleton width={120} height={16} borderRadius={4} />
        </View>
        <Skeleton width={80} height={20} borderRadius={radius.pill} />
      </View>

      <Skeleton width="85%" height={13} borderRadius={4} style={{ marginTop: 6 }} />
      <Skeleton width="100%" height={12} borderRadius={4} style={{ marginTop: 4 }} />

      <View style={styles.footerRow}>
        <Skeleton width={110} height={13} borderRadius={3} />
        <Skeleton width={70} height={14} borderRadius={3} />
      </View>
    </View>
  );
}

/**
 * Full Page Screen Skeletons
 */

export function HomeScreenSkeleton() {
  return (
    <Screen scroll>
      {/* Top Header Shimmer */}
      <View style={styles.screenHeader}>
        <View style={styles.flexCol}>
          <Skeleton width={110} height={14} borderRadius={radius.pill} />
          <Skeleton width={170} height={24} borderRadius={4} style={{ marginTop: 6 }} />
          <Skeleton width={140} height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <SkeletonCircle size={44} />
      </View>

      {/* Quick Services Grid */}
      <View style={styles.quickServicesGrid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.quickServiceTile, shadows.sm]}>
            <SkeletonCircle size={32} />
            <Skeleton width="70%" height={12} borderRadius={3} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* Coverflow Pet Carousel Placeholder */}
      <View style={[styles.carouselPlaceholder, shadows.sm]}>
        <SkeletonCircle size={80} />
        <Skeleton width={120} height={18} borderRadius={4} style={{ marginTop: 10 }} />
        <Skeleton width={80} height={12} borderRadius={4} style={{ marginTop: 4 }} />
      </View>

      {/* Next Appointment Card Placeholder */}
      <View style={{ marginTop: 12 }}>
        <AppointmentCardSkeleton />
      </View>
    </Screen>
  );
}

export function PetsScreenSkeleton() {
  return (
    <Screen scroll>
      <View style={styles.screenHeader}>
        <View style={styles.flexCol}>
          <Skeleton width={140} height={13} borderRadius={radius.pill} />
          <Skeleton width={160} height={24} borderRadius={4} style={{ marginTop: 6 }} />
          <Skeleton width={190} height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <Skeleton width={95} height={32} borderRadius={radius.pill} />
      </View>

      <DashboardCardSkeleton />

      {/* Search Bar Shimmer */}
      <View style={[styles.searchBarSkeleton, shadows.sm]}>
        <Skeleton width="60%" height={16} borderRadius={4} />
      </View>

      <View style={{ gap: 12, marginTop: 12 }}>
        <PetCardSkeleton />
        <PetCardSkeleton />
      </View>
    </Screen>
  );
}

export function AppointmentsScreenSkeleton() {
  return (
    <Screen scroll>
      <View style={styles.screenHeader}>
        <View style={styles.flexCol}>
          <Skeleton width={140} height={13} borderRadius={radius.pill} />
          <Skeleton width={180} height={24} borderRadius={4} style={{ marginTop: 6 }} />
          <Skeleton width={200} height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <Skeleton width={95} height={32} borderRadius={radius.pill} />
      </View>

      {/* Switch Shimmer */}
      <View style={[styles.switchSkeleton, shadows.sm]}>
        <Skeleton width="48%" height={38} borderRadius={radius.pill} />
        <Skeleton width="48%" height={38} borderRadius={radius.pill} />
      </View>

      <View style={{ gap: 12, marginTop: 14 }}>
        <AppointmentCardSkeleton />
        <AppointmentCardSkeleton />
        <AppointmentCardSkeleton />
      </View>
    </Screen>
  );
}

export function ServicesScreenSkeleton() {
  return (
    <Screen scroll>
      <View style={styles.screenHeader}>
        <View style={styles.flexCol}>
          <Skeleton width={140} height={13} borderRadius={radius.pill} />
          <Skeleton width={150} height={24} borderRadius={4} style={{ marginTop: 6 }} />
          <Skeleton width={210} height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <Skeleton width={95} height={32} borderRadius={radius.pill} />
      </View>

      {/* Patient Avatar Stories Shimmer */}
      <View style={styles.storiesRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.storyCol}>
            <SkeletonCircle size={52} />
            <Skeleton width={42} height={10} borderRadius={3} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      {/* Ordinance Banner Shimmer */}
      <View style={[styles.card, shadows.sm, { backgroundColor: '#F0FAF7', borderColor: 'rgba(0, 168, 150, 0.15)' }]}>
        <Skeleton width={160} height={16} borderRadius={radius.pill} />
        <Skeleton width="75%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
        <Skeleton width="90%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
      </View>

      <View style={{ gap: 12, marginTop: 14 }}>
        <ServiceCardSkeleton />
        <ServiceCardSkeleton />
        <ServiceCardSkeleton />
      </View>
    </Screen>
  );
}

export function ProfileScreenSkeleton() {
  return (
    <Screen scroll>
      <View style={styles.screenHeader}>
        <View style={styles.flexCol}>
          <Skeleton width={100} height={24} borderRadius={4} />
          <Skeleton width={180} height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <Skeleton width={60} height={28} borderRadius={radius.pill} />
      </View>

      {/* Resident ID Card Shimmer */}
      <View style={[styles.card, shadows.sm]}>
        <View style={styles.row}>
          <SkeletonCircle size={60} />
          <View style={styles.flexCol}>
            <Skeleton width="60%" height={18} borderRadius={4} />
            <Skeleton width="80%" height={12} borderRadius={4} style={{ marginTop: 5 }} />
            <Skeleton width="45%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
      </View>

      {/* Registered Pets Card */}
      <View style={[styles.card, shadows.sm, { marginTop: 12 }]}>
        <Skeleton width={120} height={16} borderRadius={4} />
        <View style={{ gap: 8, marginTop: 8 }}>
          <View style={styles.row}>
            <SkeletonCircle size={40} />
            <View style={styles.flexCol}>
              <Skeleton width="50%" height={14} borderRadius={4} />
              <Skeleton width="70%" height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: 'rgba(7, 30, 38, 0.08)',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 10,
  },
  compactCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 8,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flexCol: {
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  innerBox: {
    backgroundColor: 'rgba(7, 30, 38, 0.025)',
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    alignItems: 'center',
  },
  metaBarSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(7, 30, 38, 0.025)',
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(7, 30, 38, 0.04)',
  },
  quickServicesGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickServiceTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
  },
  carouselPlaceholder: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
  },
  searchBarSkeleton: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.07)',
  },
  switchSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(7, 30, 38, 0.05)',
    borderRadius: radius.pill,
    padding: 4,
    height: 52,
    alignItems: 'center',
  },
  storiesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  storyCol: {
    alignItems: 'center',
  },
});
