import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useUser } from '@clerk/expo';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { todayISO } from '@lib/format';
import { haptic } from '@lib/haptics';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { AppointmentSwitch, AppointmentTab } from '@components/ui/AppointmentSwitch';
import { AppointmentCard } from '@components/ui/AppointmentCard';
import { AppointmentDetailModal } from '@components/ui/AppointmentDetailModal';
import { EmptyState } from '@components/ui/EmptyState';
import { AppointmentsScreenSkeleton } from '@components/ui/Skeleton';
import type { Appointment } from '@services/data';

const TAB_PAGES: AppointmentTab[] = ['upcoming', 'past'];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<AppointmentTab>);

interface SlideWrapperProps {
  children: React.ReactNode;
  index: number;
  scrollX: SharedValue<number>;
  width: number;
}

function SlideWrapper({ children, index, scrollX, width }: SlideWrapperProps) {
  const reducedMotion = useReducedMotion();
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { width };
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);
    const scale = interpolate(scrollX.value, inputRange, [0.96, 1, 0.96], Extrapolation.CLAMP);
    return {
      width,
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.slideContainer, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user: clerkUser } = useUser();
  const { loading, loaded } = useResidentData();
  const localAppointments = useDataStore((state) => state.appointments);
  const localPets = useDataStore((state) => state.pets);

  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const listRef = useRef<FlatList<AppointmentTab>>(null);
  const scrollX = useSharedValue(0);

  // 1. Get resident's real registered pets (Clerk metadata priority, fallback to local store)
  const userPets = useMemo(() => {
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];

    if (metaPets.length > 0) {
      return metaPets.map((p, idx) => ({
        id: p.id || `clerk-pet-${idx}`,
        name: p.name || 'My Pet',
        species: p.species || 'dog',
        breed: p.breed || '',
      }));
    }

    if (localPets && localPets.length > 0) {
      return localPets;
    }

    return [];
  }, [clerkUser?.unsafeMetadata, localPets]);

  // 2. Filter appointments to strictly belong to the user's active pets
  const { upcoming, past } = useMemo(() => {
    const today = todayISO();
    const validPetIds = new Set(userPets.map((p) => p.id));
    const validPetNames = new Set(userPets.map((p) => p.name?.toLowerCase().trim()));

    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaAppts = Array.isArray(metadata.appointments) ? metadata.appointments : [];
    const rawList = metaAppts.length > 0 ? metaAppts : localAppointments;

    // Filter to only include appointments for pets the user actually owns
    const filteredAppts = (rawList as Appointment[]).filter((a) => {
      if (!a) return false;
      const matchesId = a.petId ? validPetIds.has(a.petId) : false;
      const matchesName = a.petName ? validPetNames.has(a.petName.toLowerCase().trim()) : false;
      return matchesId || matchesName;
    });

    const upcomingList = filteredAppts
      .filter(
        (a) =>
          a.status !== 'cancelled' &&
          (a.date > today || (a.date === today && a.status !== 'completed')),
      )
      .sort((a, b) => `${a.date}${a.timeSlot}`.localeCompare(`${b.date}${b.timeSlot}`));

    const pastList = filteredAppts
      .filter((a) => a.date < today || a.status === 'completed' || a.status === 'cancelled')
      .sort((a, b) => `${b.date}${b.timeSlot}`.localeCompare(`${a.date}${a.timeSlot}`));

    return { upcoming: upcomingList, past: pastList };
  }, [userPets, clerkUser?.unsafeMetadata, localAppointments]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleTabChange = useCallback(
    (tab: AppointmentTab) => {
      setActiveTab(tab);
      const index = TAB_PAGES.indexOf(tab);
      if (index >= 0) {
        listRef.current?.scrollToIndex({ index, animated: true });
      }
    },
    [],
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const pageIndex = Math.round(offsetX / width);
      const nextTab = TAB_PAGES[pageIndex] || 'upcoming';
      if (nextTab !== activeTab) {
        haptic.light();
        setActiveTab(nextTab);
      }
    },
    [activeTab, width],
  );

  const renderTabSlide = useCallback(
    ({ item, index }: { item: AppointmentTab; index: number }) => {
      const isUpcoming = item === 'upcoming';
      const list = isUpcoming ? upcoming : past;

      return (
        <SlideWrapper index={index} scrollX={scrollX} width={width}>
          <ScrollView
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Context subtitle bar */}
            <View style={styles.tabContextRow}>
              <Ionicons
                name={isUpcoming ? 'shield-checkmark-outline' : 'archive-outline'}
                size={13}
                color={isUpcoming ? colors.primary : colors.textSecondary}
              />
              <Text style={styles.tabContextText}>
                {isUpcoming
                  ? `${upcoming.length} active ${upcoming.length === 1 ? 'booking' : 'bookings'} scheduled at City Vet`
                  : `${past.length} completed or archived ${past.length === 1 ? 'visit' : 'visits'}`}
              </Text>
            </View>

            {/* List or Empty State */}
            {list.length === 0 ? (
              <EmptyState
                icon={isUpcoming ? 'calendar-outline' : 'time-outline'}
                title={isUpcoming ? 'No upcoming appointments' : 'No past appointments'}
                message={
                  isUpcoming
                    ? 'Schedule a veterinary checkup or vaccine visit for your pet.'
                    : 'Completed or cancelled visits will appear here.'
                }
                actionLabel={isUpcoming ? 'Book a Service' : undefined}
                onAction={() => {
                  haptic.light();
                  router.push('/services' as never);
                }}
              />
            ) : (
              <View style={styles.cardList}>
                {list.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onPress={() => {
                      haptic.light();
                      setSelectedAppointment(appointment);
                    }}
                  />
                ))}
              </View>
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </SlideWrapper>
      );
    },
    [upcoming, past, scrollX, width, router],
  );

  if (loading && !loaded && userPets.length === 0) {
    return (
      <AnimatedScreen animation="zoom">
        <AppointmentsScreenSkeleton />
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen animation="zoom">
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* 1. Senior Executive Municipal Header */}
        <View style={styles.topHeader}>
          {/* Eyebrow badge */}
          <View style={styles.eyebrowBadge}>
            <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
            <Text style={styles.eyebrowText}>CITY VETERINARY OFFICE · CDO</Text>
          </View>

          {/* Title & Book Visit Button Row */}
          <View style={styles.headerTitleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.heroTitle}>Appointments</Text>
              <Text style={styles.heroSubtitle}>
                Official clinic visit reservations & veterinary schedule
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Book new visit"
              onPress={() => {
                haptic.light();
                router.push('/appointments/new' as never);
              }}
              hitSlop={6}
              style={({ pressed }) => [styles.bookHeaderBtn, pressed && styles.bookHeaderBtnPressed]}
            >
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={styles.bookHeaderBtnText}>Book Visit</Text>
            </Pressable>
          </View>
        </View>

        {/* 2. Dual-Pill Capsule Switch with Spring Physics & Icons */}
        <View style={styles.switchWrapper}>
          <AppointmentSwitch
            activeTab={activeTab}
            onChange={handleTabChange}
            upcomingCount={upcoming.length}
            pastCount={past.length}
          />
        </View>

        {/* 3. Horizontal Swipable Slide Pages (Upcoming <-> History) */}
        <AnimatedFlatList
          ref={listRef}
          data={TAB_PAGES}
          keyExtractor={(item) => item}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={renderTabSlide}
          style={styles.flatList}
        />

        {/* Appointment Details & Cancellation Modal */}
        <AppointmentDetailModal
          visible={Boolean(selectedAppointment)}
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onCancelled={() => setSelectedAppointment(null)}
        />
      </SafeAreaView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: 6,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
  },
  eyebrowText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    ...typography.heading1,
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 16,
  },
  bookHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8.5,
    borderRadius: radius.pill,
    ...shadows.sm,
  },
  bookHeaderBtnPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  bookHeaderBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12.5,
  },
  switchWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
  },
  tabScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  tabContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  tabContextText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  cardList: {
    gap: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});
