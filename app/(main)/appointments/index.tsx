import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ClinicQueueScannerModal } from '@components/ui/ClinicQueueScannerModal';
import { QueueTicketModal } from '@components/ui/QueueTicketModal';
import { AppointmentsScreenSkeleton } from '@components/ui/Skeleton';
import { toast } from '@components/ui/Sonner';
import { networkService } from '@services/network';
import { normalizeAppointmentStatus } from '@services/data/types';
import type { Appointment, QueueTicketInfo } from '@services/data';

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
    // Keep slides full-width at all times. Scaling the active slide made card
    // edges bleed into the paging container and looked like overflow.
    const opacity = interpolate(scrollX.value, inputRange, [0.55, 1, 0.55], Extrapolation.CLAMP);
    return {
      width,
      opacity,
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
  const [scannerAppointment, setScannerAppointment] = useState<Appointment | null>(null);
  const [ticketModalData, setTicketModalData] = useState<{
    visible: boolean;
    appointment: Appointment | null;
    ticket: QueueTicketInfo | null;
  }>({ visible: false, appointment: null, ticket: null });
  const [refreshing, setRefreshing] = useState(false);

  const ownerId = clerkUser?.id || '';
  const updateAppointmentStatus = useDataStore((state) => state.updateAppointmentStatus);

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

  const handleCompleteVisit = useCallback(
    async (appointment: Appointment, ticket?: QueueTicketInfo | null) => {
      haptic.success();
      try {
        await updateAppointmentStatus(
          ownerId,
          appointment.id,
          'completed',
          ticket ?? appointment.queueTicket ?? undefined,
        );
        setTicketModalData({ visible: false, appointment: null, ticket: null });
        toast.success('Consultation Completed', {
          description: networkService.isOnline()
            ? `${appointment.petName}'s visit has been placed in History.`
            : `${appointment.petName}'s visit was saved locally and will sync when you reconnect.`,
        });
        // Switch tab to History
        setActiveTab('past');
        listRef.current?.scrollToIndex({ index: 1, animated: true });
      } catch (err: any) {
        toast.error('Could not update visit locally', { description: err?.message });
      }
    },
    [ownerId, updateAppointmentStatus],
  );

  const listRef = useRef<FlatList<AppointmentTab>>(null);
  const scrollX = useSharedValue(0);

  // 1. Get resident's real registered pets
  const userPets = storePets || [];

  // 2. Filter appointments (local-first with offline pending booking support)
  const { upcoming, past } = useMemo(() => {
    const today = todayISO();
    const validPetIds = new Set(userPets.map((p) => p.id));
    const validPetNames = new Set(userPets.map((p) => p.name?.toLowerCase().trim()));

    const apptPool = storeAppointments || [];

    // Ensure appointments belonging to the resident are safely included
    const filteredAppts = (apptPool as Appointment[]).filter((a) => {
      if (!a) return false;
      if (validPetIds.size === 0) return true;
      const matchesId = a.petId ? validPetIds.has(a.petId) : false;
      const matchesName = a.petName ? validPetNames.has(a.petName.toLowerCase().trim()) : false;
      return !a.petId || matchesId || matchesName || a.ownerId === clerkUser?.id;
    });

    const mappedAppts = filteredAppts.map((a) => ({
      ...a,
      status: normalizeAppointmentStatus(a.status),
    }));

    // Upcoming is strictly today/future and active. Missed and overdue visits
    // are historical outcomes and must only appear in History.
    const isClosedStatus = (a: Appointment) =>
      a.status === 'completed' ||
      a.status === 'cancelled' ||
      a.status === 'missed' ||
      a.status === 'overdue';

    const upcomingList = mappedAppts
      .filter((a) => !isClosedStatus(a) && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    const pastList = mappedAppts
      .filter((a) => isClosedStatus(a) || a.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));

    return { upcoming: upcomingList, past: pastList };
  }, [userPets, storeAppointments, clerkUser?.id]);

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
                    ? 'Your scheduled clinic visits and queuing tickets will appear here.'
                    : 'Completed or cancelled visits will appear here.'}
                </Text>
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
                    onScanPress={() => {
                      haptic.medium();
                      setScannerAppointment(appointment);
                    }}
                    onViewTicketPress={() => {
                      haptic.light();
                      setTicketModalData({
                        visible: true,
                        appointment,
                        ticket: appointment.queueTicket || null,
                      });
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

  if (loading && !loaded && upcoming.length === 0 && past.length === 0) {
    return (
      <AnimatedScreen animation="zoom">
        <AppointmentsScreenSkeleton />
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen animation="zoom">
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* 1. Header - Clean Full-Width Title matching Home/Messages/Profile */}
        <View style={styles.topHeader}>
          <View style={styles.titleCol}>
            <Text style={styles.heroTitle}>Appointments</Text>
            <Text style={styles.heroSubtitle}>
              Official clinic visit reservations & veterinary schedule
            </Text>
          </View>
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

        {/* Appointment Details & Delete Action */}
        <AppointmentDetailModal
          visible={Boolean(selectedAppointment)}
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onDeleted={() => setSelectedAppointment(null)}
        />

        {/* Clinic Queue QR Scanner Modal */}
        <ClinicQueueScannerModal
          visible={Boolean(scannerAppointment)}
          appointment={scannerAppointment}
          onClose={() => setScannerAppointment(null)}
          // Check-in success is confirmed by toast + the card's live "In Queue"
          // state. The ticket dialog is opened manually from the ticket icon.
          onSuccess={() => {}}
        />

        {/* Queue Ticket Modal — opened manually from the card ticket icon */}
        <QueueTicketModal
          visible={ticketModalData.visible}
          appointment={ticketModalData.appointment}
          ticket={ticketModalData.ticket}
          onClose={() =>
            setTicketModalData({
              visible: false,
              appointment: null,
              ticket: null,
            })
          }
          onCompleteVisit={() => {
            if (ticketModalData.appointment) {
              handleCompleteVisit(ticketModalData.appointment, ticketModalData.ticket);
            }
          }}
        />
      </SafeAreaView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 14,
  },
  titleCol: {
    gap: 3,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '400',
    lineHeight: 18,
  },
  switchWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
  },
  tabScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 90,
  },
  tabContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tabContextText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  // Empty State
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    gap: 6,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
  },
  cardList: {
    width: '100%',
    gap: 12,
  },
});
