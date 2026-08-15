import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
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
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { AppointmentSwitch, AppointmentTab } from '@components/ui/AppointmentSwitch';
import { AppointmentCard } from '@components/ui/AppointmentCard';
import { AppointmentDetailModal } from '@components/ui/AppointmentDetailModal';
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
  const {
    pets: storePets,
    appointments: storeAppointments,
    loading,
    loaded,
    syncNow,
  } = useResidentData();

  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    haptic.light();
    setRefreshing(true);
    try {
      await syncNow();
    } catch (e) {
      console.log('Appointments refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [syncNow]);

  const listRef = useRef<FlatList<AppointmentTab>>(null);
  const scrollX = useSharedValue(0);

  // 1. Get resident's real registered pets
  const userPets = useMemo(() => {
    if (storePets && storePets.length > 0) {
      return storePets;
    }
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];

    return metaPets.map((p, idx) => ({
      id: p.id || `clerk-pet-${idx}`,
      name: p.name || 'My Pet',
      species: p.species || 'dog',
      breed: p.breed || '',
    }));
  }, [storePets, clerkUser?.unsafeMetadata]);

  // 2. Filter appointments (local-first with offline pending booking support)
  const { upcoming, past } = useMemo(() => {
    const today = todayISO();
    const validPetIds = new Set(userPets.map((p) => p.id));
    const validPetNames = new Set(userPets.map((p) => p.name?.toLowerCase().trim()));

    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaAppts = Array.isArray(metadata.appointments) ? metadata.appointments : [];
    const apptPool =
      storeAppointments && storeAppointments.length > 0
        ? storeAppointments
        : (metaAppts as Appointment[]);

    // Filter to only include appointments for pets the user owns
    const filteredAppts = (apptPool as Appointment[]).filter((a) => {
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
  }, [userPets, storeAppointments, clerkUser?.unsafeMetadata]);

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
            bounces={true}
            alwaysBounceVertical={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary, colors.primaryDark]}
                progressBackgroundColor={colors.surface}
              />
            }
          >
            {/* Context status bar */}
            <View style={styles.tabContextRow}>
              <Ionicons
                name={isUpcoming ? 'shield-checkmark-outline' : 'archive-outline'}
                size={13}
                color={isUpcoming ? colors.primaryDark : colors.textMuted}
              />
              <Text style={styles.tabContextText}>
                {isUpcoming
                  ? `${upcoming.length} active ${upcoming.length === 1 ? 'booking' : 'bookings'} scheduled at City Vet`
                  : `${past.length} completed or archived ${past.length === 1 ? 'visit' : 'visits'}`}
              </Text>
            </View>

            {/* List or Refined Homepage-Style Empty State Card */}
            {list.length === 0 ? (
              <View style={[styles.emptyCard, shadows.sm]}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons
                    name={isUpcoming ? 'calendar-outline' : 'time-outline'}
                    size={26}
                    color={colors.primaryDark}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  {isUpcoming ? 'No upcoming appointments' : 'No past appointments'}
                </Text>

                <Text style={styles.emptySub}>
                  {isUpcoming
                    ? 'Schedule a veterinary checkup or vaccine visit for your pet.'
                    : 'Completed or cancelled visits will appear here.'}
                </Text>

                {isUpcoming && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Schedule a visit"
                    onPress={() => {
                      haptic.light();
                      router.push('/appointments/new' as never);
                    }}
                    style={({ pressed }) => [
                      styles.scheduleBtn,
                      pressed && styles.scheduleBtnPressed,
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={15} color={colors.white} />
                    <Text style={styles.scheduleBtnText}>Schedule a Visit</Text>
                  </Pressable>
                )}
              </View>
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
          </ScrollView>
        </SlideWrapper>
      );
    },
    [upcoming, past, scrollX, width, router, refreshing, handleRefresh],
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
        {/* 1. Header - Title on Left & "+ Book Visit" Pill on Right */}
        <View style={styles.topHeader}>
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
            style={({ pressed }) => [
              styles.bookHeaderBtn,
              pressed && styles.bookHeaderBtnPressed,
            ]}
          >
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.bookHeaderBtnText}>Book Visit</Text>
          </Pressable>
        </View>

        {/* 2. Dual-Pill Capsule Switch with Smooth Physics */}
        <View style={styles.switchWrapper}>
          <AppointmentSwitch
            activeTab={activeTab}
            onChange={handleTabChange}
            upcomingCount={upcoming.length}
            pastCount={past.length}
          />
        </View>

        {/* 3. Horizontal Swipeable Slide Pages (Upcoming <-> History) */}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    marginBottom: spacing.md,
    gap: 12,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 22,
    fontFamily: typography.font.bold,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  bookHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 7.5,
    borderRadius: radius.pill,
    ...shadows.sm,
  },
  bookHeaderBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  bookHeaderBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12.5,
    fontFamily: typography.font.bold,
  },
  switchWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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
    paddingBottom: 85,
  },
  tabContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  tabContextText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
  },
  // Empty State
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.10)',
    gap: 6,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(10, 110, 100, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    ...typography.heading3,
    fontSize: 16,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.small,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
    marginBottom: 6,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    alignSelf: 'stretch',
  },
  scheduleBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  scheduleBtnText: {
    ...typography.captionBold,
    fontSize: 13,
    fontFamily: typography.font.bold,
    color: colors.white,
  },
  cardList: {
    gap: spacing.md,
  },
});
