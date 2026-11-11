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
 * Uses a clean neutral tint with crisp pulse opacity (0.45 - 0.95).
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
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(pulse.value, [0, 1], [0.45, 0.95]);
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
 * Minimalist Single-Row Appointment Card Skeleton
 * Accurately mirrors AppointmentCard.tsx layout.
 */
export function AppointmentCardSkeleton() {
  return (
    <View style={styles.minimalApptCard}>
      {/* 1. Left Avatar */}
      <SkeletonCircle size={38} />

      {/* 2. Middle Info */}
      <View style={styles.flexCol}>
        <View style={styles.row}>
          <Skeleton width={70} height={14} borderRadius={4} />
          <Skeleton width={80} height={12} borderRadius={4} />
        </View>
        <Skeleton width={130} height={13} borderRadius={4} style={{ marginTop: 4 }} />
        <View style={[styles.row, { marginTop: 4 }]}>
          <Skeleton width={85} height={11} borderRadius={3} />
          <Skeleton width={65} height={11} borderRadius={3} />
        </View>
      </View>

      {/* 3. Right Status & Icon */}
      <View style={styles.apptActionCol}>
        <Skeleton width={60} height={20} borderRadius={radius.pill} />
        <Skeleton width={26} height={26} borderRadius={7} style={{ marginTop: 4 }} />
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
 * =========================================================================
 * Full Page Screen Skeletons for Every Tab
 * =========================================================================
 */

/**
 * Tab 1: Home Screen Skeleton
 * Accurately mirrors HomeHeader, HomePetsSection (stories),
 * HomeCareActionCards (2 cards), and HomeAnnouncementsSection (bulletins).
 */
export function HomeScreenSkeleton() {
  return (
    <Screen scroll padded={false}>
      <View style={styles.homeContainer}>
        {/* 1. Header: Avatar on left, Greeting in middle, Messenger circle on right */}
        <View style={styles.homeHeader}>
          <SkeletonCircle size={42} />
          <View style={styles.flexCol}>
            <Skeleton width={110} height={18} borderRadius={4} />
            <Skeleton width={85} height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <SkeletonCircle size={40} />
        </View>

        {/* 2. Pet Registry Stories Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.row}>
            <SkeletonCircle size={16} />
            <Skeleton width={105} height={13} borderRadius={radius.pill} />
          </View>
          <Skeleton width={50} height={12} borderRadius={4} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storyScrollContent}
        >
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.storyCardSkeleton, shadows.sm]}>
              <View style={styles.storyAvatarWrap}>
                <SkeletonCircle size={38} />
              </View>
              <View style={styles.storyBottomText}>
                <Skeleton width="80%" height={12} borderRadius={3} />
                <Skeleton width="60%" height={10} borderRadius={3} style={{ marginTop: 4 }} />
              </View>
            </View>
          ))}
        </ScrollView>

        {/* 3. Official Bulletins / Announcements Feed */}
        <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
          <Skeleton width={180} height={13} borderRadius={radius.pill} />
        </View>
        <View style={styles.fbPostWrapper}>
          <View style={styles.fbPostContainer}>
            <View style={styles.fbHeaderRow}>
              <SkeletonCircle size={40} />
              <View style={{ flex: 1, marginLeft: 10, gap: 6 }}>
                <Skeleton width="50%" height={14} borderRadius={4} />
                <Skeleton width="35%" height={11} borderRadius={4} />
              </View>
            </View>
            <View style={styles.fbTextWrap}>
              <Skeleton width="95%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="88%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="60%" height={13} borderRadius={4} />
            </View>
            <Skeleton width="100%" height={200} borderRadius={10} style={{ marginTop: 10 }} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

/**
 * Tab 2: Messages / Messenger Screen Skeleton
 * Accurately mirrors Chats header, CVO channel section, and full-width official chat threads.
 */
export function MessagesScreenSkeleton() {
  return (
    <View style={styles.messagesContainer}>
      {/* Top Header */}
      <View style={styles.messagesHeader}>
        <Skeleton width={85} height={28} borderRadius={4} />
        <Skeleton width={240} height={13.5} borderRadius={4} style={{ marginTop: 6 }} />
      </View>

      {/* Section Header */}
      <View style={styles.messagesSectionHeader}>
        <Skeleton width={140} height={12} borderRadius={radius.pill} />
      </View>

      {/* 2 Full-Width Official Channel Rows */}
      <View style={styles.messagesListFullWidth}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.channelRowSkeleton}>
            <View style={styles.channelAvatarSkeletonWrap}>
              <SkeletonCircle size={56} />
              <View style={styles.onlineBadgeSkeleton}>
                <SkeletonCircle size={14} />
              </View>
            </View>
            <View style={styles.channelContentSkeleton}>
              <View style={styles.rowBetween}>
                <Skeleton width="55%" height={16} borderRadius={4} />
                <Skeleton width={45} height={12} borderRadius={3} />
              </View>
              <Skeleton width="75%" height={13} borderRadius={4} style={{ marginTop: 6 }} />
              <Skeleton width="45%" height={11} borderRadius={3} style={{ marginTop: 5 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Chat Message List Skeleton Loader
 * Renders realistic shimmering message bubbles, intro card, and bottom input bar
 * while the conversation thread is loading.
 */
export function ChatMessageListSkeleton() {
  return (
    <View style={styles.chatSkeletonContainer}>
      {/* 1. Profile Intro Shimmer */}
      <View style={styles.chatIntroSkeleton}>
        <SkeletonCircle size={68} />
        <Skeleton width={160} height={18} borderRadius={4} style={{ marginTop: 10 }} />
        <Skeleton width={200} height={12} borderRadius={3} style={{ marginTop: 5 }} />
        <View style={styles.chatDatePillSkeleton}>
          <Skeleton width={70} height={18} borderRadius={radius.pill} />
        </View>
      </View>

      {/* 2. Realistic Message Stream */}
      <View style={styles.chatBubbleStream}>
        {/* Staff Message (Left) */}
        <View style={styles.staffBubbleRow}>
          <SkeletonCircle size={28} />
          <View style={styles.staffBubbleWrap}>
            <Skeleton width={210} height={46} borderRadius={18} />
          </View>
        </View>

        {/* Staff Follow-up (Left, tighter) */}
        <View style={[styles.staffBubbleRow, { marginTop: 4 }]}>
          <View style={{ width: 28 }} />
          <View style={styles.staffBubbleWrap}>
            <Skeleton width={160} height={34} borderRadius={18} />
          </View>
        </View>

        {/* Resident Message (Right) */}
        <View style={styles.residentBubbleRow}>
          <Skeleton width={190} height={42} borderRadius={18} />
        </View>

        {/* Resident Follow-up (Right) */}
        <View style={[styles.residentBubbleRow, { marginTop: 4 }]}>
          <Skeleton width={130} height={34} borderRadius={18} />
        </View>

        {/* Staff Message with Reply Quote (Left) */}
        <View style={[styles.staffBubbleRow, { marginTop: 10 }]}>
          <SkeletonCircle size={28} />
          <View style={styles.staffBubbleWrap}>
            <Skeleton width={240} height={66} borderRadius={18} />
          </View>
        </View>

        {/* Resident Confirmation Message (Right) */}
        <View style={[styles.residentBubbleRow, { marginTop: 10 }]}>
          <Skeleton width={175} height={38} borderRadius={18} />
        </View>
      </View>

      {/* 3. Bottom Input Bar Placeholder */}
      <View style={styles.chatInputBarSkeleton}>
        <SkeletonCircle size={36} />
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={38} borderRadius={radius.pill} />
        </View>
        <SkeletonCircle size={36} />
      </View>
    </View>
  );
}

/**
 * Tab 3: Pets Screen Skeleton
 * Accurately mirrors PetPassportView (Emerald curved top, tools row,
 * large avatar circle, tag ID, tab selector pills, anti-rabies status card).
 */
export function PetsScreenSkeleton() {
  return (
    <View style={styles.petsContainer}>
      {/* Curved Emerald Top Header matching PetPassportView */}
      <View style={styles.petPassportHeader}>
        {/* Top Tools Bar */}
        <View style={styles.petPassportToolsRow}>
          <SkeletonCircle size={32} />
          <View style={styles.row}>
            <SkeletonCircle size={32} />
            <SkeletonCircle size={32} />
            <SkeletonCircle size={32} />
            <SkeletonCircle size={32} />
          </View>
        </View>

        {/* Pet Identity Row */}
        <View style={styles.petIdentityRow}>
          <SkeletonCircle size={72} />
          <View style={[styles.flexCol, { marginLeft: 14 }]}>
            <Skeleton width={140} height={22} borderRadius={4} />
            <Skeleton width={100} height={13} borderRadius={4} style={{ marginTop: 5 }} />
            <Skeleton width={125} height={20} borderRadius={radius.pill} style={{ marginTop: 6 }} />
          </View>
        </View>

        {/* 4-Tab Bottom Selector Pills */}
        <View style={styles.passportTabRow}>
          <Skeleton width="23%" height={32} borderRadius={radius.pill} />
          <Skeleton width="23%" height={32} borderRadius={radius.pill} />
          <Skeleton width="23%" height={32} borderRadius={radius.pill} />
          <Skeleton width="23%" height={32} borderRadius={radius.pill} />
        </View>
      </View>

      {/* Body Content: Anti-Rabies Vaccination Card */}
      <View style={styles.petsBody}>
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Skeleton width={38} height={38} borderRadius={10} />
              <View style={{ gap: 4 }}>
                <Skeleton width={160} height={15} borderRadius={4} />
                <Skeleton width={180} height={11} borderRadius={4} />
              </View>
            </View>
            <Skeleton width={68} height={20} borderRadius={radius.pill} />
          </View>
          <View style={styles.vaxDatesGridSkeleton}>
            <View style={styles.vaxDateBox}>
              <Skeleton width={85} height={11} borderRadius={3} />
              <Skeleton width={100} height={13} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <View style={styles.vaxDateBox}>
              <Skeleton width={85} height={11} borderRadius={3} />
              <Skeleton width={100} height={13} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          </View>
        </View>

        {/* Switch Companion Row */}
        <View style={{ marginTop: 14 }}>
          <Skeleton width={150} height={12} borderRadius={radius.pill} style={{ marginBottom: 8 }} />
          <View style={styles.row}>
            <Skeleton width={130} height={44} borderRadius={radius.pill} />
            <Skeleton width={130} height={44} borderRadius={radius.pill} />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Tab 4: Appointments / Visits Screen Skeleton
 * Accurately mirrors Appointments title, 2-segment switch,
 * context status row, and minimalist appointment cards.
 */
export function AppointmentsScreenSkeleton() {
  return (
    <View style={styles.apptsContainer}>
      {/* Top Header without Book Visit Button */}
      <View style={styles.apptsHeader}>
        <View style={styles.flexCol}>
          <Skeleton width={160} height={28} borderRadius={4} />
          <Skeleton width={230} height={13.5} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Dual-Pill Capsule Switch */}
      <View style={[styles.switchSkeleton, shadows.sm]}>
        <Skeleton width="48%" height={38} borderRadius={radius.pill} />
        <Skeleton width="48%" height={38} borderRadius={radius.pill} />
      </View>

      {/* Context status bar */}
      <View style={styles.apptsContextRow}>
        <SkeletonCircle size={14} />
        <Skeleton width={190} height={12} borderRadius={3} />
      </View>

      {/* List of 3 Minimalist Appointment Cards */}
      <View style={{ gap: 10, marginTop: 8 }}>
        <AppointmentCardSkeleton />
        <AppointmentCardSkeleton />
        <AppointmentCardSkeleton />
      </View>
    </View>
  );
}

/**
 * Tab 5: Profile Screen Skeleton
 * Accurately mirrors Header with Edit/Logout pills, Resident Identity Card
 * with 62px avatar and address bar, 3-column stats row, and Information card.
 */
export function ProfileScreenSkeleton() {
  return (
    <Screen scroll padded={false}>
      <View style={styles.profileContainer}>
        {/* Top Header */}
        <View style={styles.profileHeader}>
          <Skeleton width={80} height={26} borderRadius={4} />
          <View style={styles.row}>
            <Skeleton width={90} height={30} borderRadius={radius.pill} />
            <Skeleton width={75} height={30} borderRadius={radius.pill} />
          </View>
        </View>

        {/* Modern Resident Identity Card */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.row}>
            <View style={styles.profileAvatarWrap}>
              <SkeletonCircle size={62} />
              <View style={styles.cameraBadgeSkeleton}>
                <SkeletonCircle size={18} />
              </View>
            </View>
            <View style={[styles.flexCol, { gap: 6, marginLeft: 4 }]}>
              <Skeleton width="60%" height={18} borderRadius={4} />
              <Skeleton width="75%" height={13} borderRadius={4} />
              <Skeleton width="45%" height={12} borderRadius={3} />
            </View>
          </View>
          {/* Address bar */}
          <View style={styles.profileAddressBar}>
            <SkeletonCircle size={14} />
            <Skeleton width="70%" height={12} borderRadius={3} />
          </View>
        </View>

        {/* 3-Column Stats Row */}
        <View style={styles.statsRowGrid}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.statBoxSkeleton, shadows.sm]}>
              <SkeletonCircle size={28} />
              <Skeleton width={24} height={16} borderRadius={3} style={{ marginTop: 6 }} />
              <Skeleton width={48} height={10} borderRadius={3} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>

        {/* Resident Account Information Card */}
        <View style={[styles.card, shadows.sm, { marginTop: 14 }]}>
          <Skeleton width={140} height={15} borderRadius={4} />
          <View style={{ gap: 12, marginTop: 10 }}>
            <View style={styles.rowBetween}>
              <Skeleton width={90} height={13} borderRadius={3} />
              <Skeleton width={120} height={13} borderRadius={3} />
            </View>
            <View style={styles.rowBetween}>
              <Skeleton width={80} height={13} borderRadius={3} />
              <Skeleton width={110} height={13} borderRadius={3} />
            </View>
            <View style={styles.rowBetween}>
              <Skeleton width={100} height={13} borderRadius={3} />
              <Skeleton width={140} height={13} borderRadius={3} />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

/**
 * Services Screen Skeleton
 */
export function ServicesScreenSkeleton() {
  return (
    <Screen scroll padded={false}>
      <View style={styles.servicesContainer}>
        {/* Top Header */}
        <View style={styles.servicesHeader}>
          <View style={styles.flexCol}>
            <Skeleton width={130} height={13} borderRadius={radius.pill} />
            <Skeleton width={160} height={24} borderRadius={4} style={{ marginTop: 5 }} />
            <Skeleton width={210} height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <Skeleton width={95} height={32} borderRadius={radius.pill} />
        </View>

        {/* Patient Avatar Stories */}
        <View style={styles.storiesRow}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.storyCol}>
              <SkeletonCircle size={52} />
              <Skeleton width={42} height={10} borderRadius={3} style={{ marginTop: 6 }} />
            </View>
          ))}
        </View>

        {/* Ordinance Banner */}
        <View style={[styles.card, shadows.sm, { backgroundColor: '#F0FAF7' }]}>
          <Skeleton width={150} height={15} borderRadius={radius.pill} />
          <Skeleton width="75%" height={15} borderRadius={4} style={{ marginTop: 6 }} />
          <Skeleton width="90%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>

        {/* Service Cards */}
        <View style={{ gap: 10, marginTop: 14 }}>
          <ServiceCardSkeleton />
          <ServiceCardSkeleton />
          <ServiceCardSkeleton />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: '#E2E8F0', // clean, crisp neutral slate-200
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  minimalApptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  apptActionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  /* Home Screen Styles */
  homeContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
  },
  storyScrollContent: {
    gap: 10,
    paddingRight: 16,
  },
  storyCardSkeleton: {
    width: 108,
    height: 168,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    padding: 10,
  },
  storyAvatarWrap: {
    alignSelf: 'flex-start',
  },
  storyBottomText: {
    gap: 2,
  },
  fbPostWrapper: {
    marginTop: 8,
  },
  fbPostContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fbHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fbTextWrap: {
    marginTop: 10,
  },

  /* Messages Screen Styles (Full-width edge-to-edge Messenger style) */
  messagesContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 48,
  },
  messagesHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  messagesSectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  messagesListFullWidth: {
    width: '100%',
  },
  channelRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  channelAvatarSkeletonWrap: {
    position: 'relative',
    marginRight: 14,
  },
  onlineBadgeSkeleton: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  channelContentSkeleton: {
    flex: 1,
  },

  /* Chat Message Conversation Skeleton Styles */
  chatSkeletonContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  chatIntroSkeleton: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  chatDatePillSkeleton: {
    marginTop: 14,
  },
  chatBubbleStream: {
    flex: 1,
    paddingHorizontal: 14,
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  staffBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  staffBubbleWrap: {
    maxWidth: '75%',
  },
  residentBubbleRow: {
    alignSelf: 'flex-end',
    maxWidth: '75%',
    marginBottom: 4,
  },
  chatInputBarSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },

  /* Pets Screen Styles */
  petsContainer: {
    flex: 1,
    backgroundColor: '#071E26',
  },
  petPassportHeader: {
    backgroundColor: '#042F2C',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 16,
  },
  petPassportToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  petIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passportTabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.pill,
    padding: 4,
  },
  petsBody: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  vaxDatesGridSkeleton: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  vaxDateBox: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    borderRadius: radius.md,
    padding: 10,
  },

  /* Appointments Screen Styles */
  apptsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 48,
    backgroundColor: colors.background,
  },
  apptsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  switchSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(7, 30, 38, 0.06)',
    borderRadius: radius.pill,
    padding: 4,
    height: 50,
    alignItems: 'center',
    marginBottom: 12,
  },
  apptsContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },

  /* Profile Screen Styles */
  profileContainer: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 40,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  profileAvatarWrap: {
    position: 'relative',
  },
  cameraBadgeSkeleton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  profileAddressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7, 30, 38, 0.03)',
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  statsRowGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statBoxSkeleton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  /* Services Screen Styles */
  servicesContainer: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 40,
  },
  servicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
