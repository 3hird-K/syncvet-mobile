import React, { useCallback, useMemo } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { getFirstName, todayISO, formatAge, ageFromBirthYear } from '@lib/format';
import { SERVICES } from '@lib/services';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { useResidentData } from '@hooks/useResidentData';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { Screen } from '@components/ui/Screen';
import { SectionHeader } from '@components/ui/SectionHeader';
import { PetCoverFlowCarousel } from '@components/ui/PetCoverFlowCarousel';
import { PopoutPetAvatar } from '@components/ui/PopoutPetAvatar';
import { ServiceCard } from '@components/ui/ServiceCard';
import { AppointmentCard } from '@components/ui/AppointmentCard';
import { ActivityRow } from '@components/ui/ActivityRow';
import { Avatar } from '@components/ui/Avatar';
import { HomeScreenSkeleton } from '@components/ui/Skeleton';
import type { Pet } from '@services/data';

const HOME_SERVICES = SERVICES.slice(0, 4);

export default function HomeScreen() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  const { loading, loaded } = useResidentData();

  const localPets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);
  const activity = useDataStore((state) => state.activity);

  const displayName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    user?.fullName ||
    'Resident';
  const displayPhoto = clerkUser?.imageUrl || user?.photoUrl;

  // Real data exclusively from Clerk user metadata
  const allPets: Pet[] = useMemo(() => {
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];

    return metaPets.map((p, idx) => ({
      id: p.id || `clerk-pet-${idx}`,
      ownerId: user?.id || clerkUser?.id || '',
      name: p.name || 'My Pet',
      species: p.species || 'dog',
      breed: p.breed || '',
      gender: p.gender || 'male',
      birthYear: p.birthYear,
      isVaccinated: Boolean(p.isVaccinated),
      isSpayedNeutered: Boolean(p.isSpayedNeutered),
      weightCategory: p.weightCategory || 'medium',
      notes: p.notes,
      avatarId: p.avatarId,
      photoUrl: p.photoUrl,
      createdAt: p.createdAt || new Date().toISOString(),
    }));
  }, [clerkUser?.unsafeMetadata, user?.id, clerkUser?.id]);

  const vaccinatedCount = useMemo(
    () => allPets.filter((p) => p.isVaccinated).length,
    [allPets],
  );

  const upcomingAppointments = useMemo(() => {
    const today = todayISO();
    const validPetIds = new Set(allPets.map((p) => p.id));
    const validPetNames = new Set(allPets.map((p) => p.name?.toLowerCase().trim()));

    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaAppts = Array.isArray(metadata.appointments) ? metadata.appointments : [];

    return metaAppts
      .filter((a) => {
        if (!a) return false;
        const matchesId = a.petId ? validPetIds.has(a.petId) : false;
        const matchesName = a.petName ? validPetNames.has(a.petName.toLowerCase().trim()) : false;
        return (
          (matchesId || matchesName) &&
          (a.status === 'pending' || a.status === 'confirmed') &&
          a.date >= today
        );
      })
      .sort((a, b) => (a.date === b.date ? a.timeSlot.localeCompare(b.timeSlot) : a.date.localeCompare(b.date)));
  }, [allPets, clerkUser?.unsafeMetadata]);

  const nextAppointment = upcomingAppointments[0];
  const recentActivity = useMemo(() => activity.slice(0, 4), [activity]);

  const goService = useCallback(
    (id: string) => {
      haptic.light();
      router.push(`/services/${id}` as never);
    },
    [router],
  );

  const handleCallCVO = () => {
    haptic.light();
    void Linking.openURL('tel:0888572260').catch(() => {});
  };

  if (loading && !loaded && allPets.length === 0) {
    return (
      <AnimatedScreen animation="zoom">
        <HomeScreenSkeleton />
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen animation="zoom">
      <Screen scroll>
        {/* 1. Senior Executive Municipal Top Header */}
        <Animated.View entering={FadeInDown.duration(240)} style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.eyebrowBadge}>
              <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
              <Text style={styles.eyebrowText}>CITY VETERINARY OFFICE · CDO</Text>
            </View>
            <Text style={styles.greetingHeading} numberOfLines={1}>
              Hello, {getFirstName(displayName)} 👋
            </Text>
            <Text style={styles.greetingSub}>
              {allPets.length > 0
                ? `${allPets.length} ${allPets.length === 1 ? 'Pet' : 'Pets'} Registered · Records Up-to-date`
                : 'Official Pet Health Registry & Clinic Portal'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Appointments"
              onPress={() => {
                haptic.light();
                router.push('/appointments' as never);
              }}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              hitSlop={6}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
              {upcomingAppointments.length > 0 ? <View style={styles.notifDot} /> : null}
            </Pressable>

            <Pressable
              onPress={() => {
                haptic.light();
                router.push('/profile' as never);
              }}
              style={styles.avatarWrap}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="View Profile"
            >
              <Avatar name={displayName} size={42} photoUrl={displayPhoto} />
            </Pressable>
          </View>
        </Animated.View>

        {/* 2. Centerpiece: Featured Pet Showcase / CoverFlow */}
        {allPets.length === 1 && (
          <Animated.View entering={FadeInDown.delay(60).duration(240)}>
            <Pressable
              style={({ pressed }) => [
                styles.singlePetHeroCard,
                shadows.md,
                pressed && styles.singlePetHeroCardPressed,
              ]}
              onPress={() => {
                haptic.light();
                router.push(`/pets/${allPets[0].id}` as never);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${allPets[0].name}’s Health Passport`}
            >
              <View style={styles.singlePetAvatarWrap}>
                <PopoutPetAvatar
                  avatarId={allPets[0].avatarId}
                  species={allPets[0].species}
                  photoUrl={allPets[0].photoUrl}
                  size={62}
                  scale={1.35}
                />
              </View>

              <View style={styles.singlePetInfoWrap}>
                <View style={styles.singlePetNameRow}>
                  <Text style={styles.singlePetNameText} numberOfLines={1}>
                    {allPets[0].name}
                  </Text>
                  <View
                    style={
                      allPets[0].isVaccinated
                        ? styles.singlePetVaxBadge
                        : styles.singlePetVaxBadgeWarning
                    }
                  >
                    <Ionicons
                      name={
                        allPets[0].isVaccinated
                          ? 'shield-checkmark'
                          : 'alert-circle'
                      }
                      size={10}
                      color={
                        allPets[0].isVaccinated
                          ? colors.success
                          : colors.warning
                      }
                    />
                    <Text
                      style={
                        allPets[0].isVaccinated
                          ? styles.singlePetVaxText
                          : styles.singlePetVaxTextWarning
                      }
                    >
                      {allPets[0].isVaccinated ? 'Protected' : 'Needs Shot'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.singlePetSubText} numberOfLines={1}>
                  {allPets[0].breed ||
                    (allPets[0].species?.toLowerCase() === 'dog' ? 'Canine' : 'Feline')}
                  {allPets[0].birthYear
                    ? ` · ${formatAge(ageFromBirthYear(allPets[0].birthYear))}`
                    : ''}
                </Text>

                <View style={styles.singlePetPassportLinkRow}>
                  <Text style={styles.singlePetPassportLinkText}>
                    View Digital Passport
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={12}
                    color={colors.primary}
                  />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {allPets.length > 1 && (
          <Animated.View entering={FadeInDown.delay(60).duration(240)} style={styles.topCarouselSection}>
            <PetCoverFlowCarousel
              pets={allPets}
              onSelectPet={(pet) => {
                haptic.light();
                if (pet?.id) {
                  router.push(`/pets/${pet.id}` as never);
                } else {
                  router.push('/pets' as never);
                }
              }}
            />
          </Animated.View>
        )}

        {allPets.length === 0 && (
          <Animated.View entering={FadeInDown.delay(60).duration(240)}>
            <View style={[styles.onboardingCard, shadows.sm]}>
              <View style={styles.onboardingIconCircle}>
                <Ionicons name="paw" size={28} color={colors.primary} />
              </View>
              <View style={styles.onboardingTextCol}>
                <Text style={styles.onboardingTitle}>Register Your Pet</Text>
                <Text style={styles.onboardingSub}>
                  Create your pet's official digital health passport & access municipal vaccines.
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  haptic.light();
                  router.push('/pets/add' as never);
                }}
                style={styles.onboardingBtn}
              >
                <Text style={styles.onboardingBtnText}>+ Register Pet</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* 3. Fast Quick Actions Hub (4 High-Utility Operations) */}
        <Animated.View entering={FadeInDown.delay(100).duration(240)} style={styles.quickActionsSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Book an appointment"
            onPress={() => {
              haptic.light();
              router.push('/appointments/new' as never);
            }}
            style={({ pressed }) => [
              styles.quickActionTile,
              pressed && styles.quickActionTilePressed,
            ]}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(0, 168, 150, 0.12)' }]}>
              <Ionicons name="calendar" size={17} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Book Visit</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a new pet"
            onPress={() => {
              haptic.light();
              router.push('/pets/add' as never);
            }}
            style={({ pressed }) => [
              styles.quickActionTile,
              pressed && styles.quickActionTilePressed,
            ]}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
              <Ionicons name="paw" size={17} color="#8B5CF6" />
            </View>
            <Text style={styles.quickActionLabel}>Add Pet</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Book anti-rabies vaccination"
            onPress={() => {
              haptic.light();
              router.push({
                pathname: '/appointments/new',
                params: { serviceId: 'vaccination' },
              } as never);
            }}
            style={({ pressed }) => [
              styles.quickActionTile,
              pressed && styles.quickActionTilePressed,
            ]}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="shield-checkmark" size={17} color={colors.success} />
            </View>
            <Text style={styles.quickActionLabel}>Vaccine</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Book spay or neuter kapon service"
            onPress={() => {
              haptic.light();
              router.push({
                pathname: '/appointments/new',
                params: { serviceId: 'spay-neuter' },
              } as never);
            }}
            style={({ pressed }) => [
              styles.quickActionTile,
              pressed && styles.quickActionTilePressed,
            ]}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
              <Ionicons name="medical" size={17} color="#2563EB" />
            </View>
            <Text style={styles.quickActionLabel}>Kapon</Text>
          </Pressable>
        </Animated.View>

        {/* 4. Unified Pet Health Registry Overview Card */}
        <Animated.View entering={FadeInDown.delay(140).duration(240)}>
          <View style={[styles.overviewCard, shadows.sm]}>
            {/* Header Row with Municipal Badge & Resident Pill */}
            <View style={styles.overviewTop}>
              <View style={styles.overviewBadge}>
                <View style={styles.overviewIconCircle}>
                  <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
                </View>
                <View style={styles.overviewTitleWrap}>
                  <Text style={styles.overviewBadgeText}>Pet Health Registry</Text>
                  <Text style={styles.overviewBadgeSub}>City Veterinary Office · CDO</Text>
                </View>
              </View>

              <View style={styles.verifiedPill}>
                <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                <Text style={styles.verifiedText}>CDO Resident</Text>
              </View>
            </View>

            {/* Elevated Micro-Stats Grid with Dedicated Icons */}
            <View style={styles.statsRow}>
              {/* Stat 1: Registered Pets */}
              <Pressable
                onPress={() => {
                  haptic.light();
                  router.push('/pets' as never);
                }}
                style={({ pressed }) => [styles.statBox, pressed && styles.statBoxPressed]}
                accessibilityRole="button"
                accessibilityLabel="View registered pets"
              >
                <View style={[styles.statIconBadge, { backgroundColor: 'rgba(0, 168, 150, 0.10)' }]}>
                  <Ionicons name="paw" size={13} color={colors.primary} />
                </View>
                <Text style={styles.statNum}>{allPets.length}</Text>
                <Text style={styles.statLbl}>My Pets</Text>
              </Pressable>

              {/* Stat 2: Vaccination Status */}
              <Pressable
                onPress={() => {
                  haptic.light();
                  router.push('/pets' as never);
                }}
                style={({ pressed }) => [styles.statBox, pressed && styles.statBoxPressed]}
                accessibilityRole="button"
                accessibilityLabel="View vaccination records"
              >
                <View style={[styles.statIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.10)' }]}>
                  <Ionicons name="shield-checkmark" size={13} color={colors.success} />
                </View>
                <Text
                  style={[
                    styles.statNum,
                    {
                      color:
                        vaccinatedCount === allPets.length && allPets.length > 0
                          ? colors.success
                          : colors.textPrimary,
                    },
                  ]}
                >
                  {vaccinatedCount}/{allPets.length}
                </Text>
                <Text style={styles.statLbl}>Vaccinated</Text>
              </Pressable>

              {/* Stat 3: Upcoming Visits */}
              <Pressable
                onPress={() => {
                  haptic.light();
                  router.push('/appointments' as never);
                }}
                style={({ pressed }) => [styles.statBox, pressed && styles.statBoxPressed]}
                accessibilityRole="button"
                accessibilityLabel="View appointments"
              >
                <View style={[styles.statIconBadge, { backgroundColor: 'rgba(14, 116, 144, 0.10)' }]}>
                  <Ionicons name="calendar" size={13} color={colors.info} />
                </View>
                <Text
                  style={[
                    styles.statNum,
                    {
                      color:
                        upcomingAppointments.length > 0
                          ? colors.primary
                          : colors.textPrimary,
                    },
                  ]}
                >
                  {upcomingAppointments.length}
                </Text>
                <Text style={styles.statLbl}>Upcoming</Text>
              </Pressable>
            </View>

            {/* Clinic Hours & Quick Direct Hotline Strip */}
            <View style={styles.clinicFooterStrip}>
              <View style={styles.clinicScheduleWrap}>
                <View style={styles.livePulseDot} />
                <Ionicons name="business-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.clinicHoursText} numberOfLines={1}>
                  Main Clinic · 8:00 AM – 5:00 PM
                </Text>
              </View>

              <Pressable
                onPress={handleCallCVO}
                style={({ pressed }) => [
                  styles.cvoCallChip,
                  pressed && styles.cvoCallChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Call City Veterinary Office"
              >
                <Ionicons name="call" size={11} color={colors.primary} />
                <Text style={styles.cvoCallChipText}>Call CVO</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* 5. Upcoming Visit / Preventive Care Banner */}
        <Animated.View entering={FadeInDown.delay(180).duration(240)} style={styles.section}>
          <SectionHeader
            title="Upcoming Visit"
            actionLabel={nextAppointment ? `View (${upcomingAppointments.length})` : undefined}
            onAction={nextAppointment ? () => router.push('/appointments' as never) : undefined}
          />
          {nextAppointment ? (
            <AppointmentCard
              appointment={nextAppointment}
              onPress={() => router.push('/appointments' as never)}
              showFooterAction
            />
          ) : (
            <View style={[styles.reminderCard, shadows.sm]}>
              <View style={styles.reminderLeft}>
                <View style={styles.reminderIconWrap}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                </View>
                <View style={styles.reminderTextWrap}>
                  <Text style={styles.reminderTitle}>Annual Anti-Rabies Protection</Text>
                  <Text style={styles.reminderSub}>
                    Free City Veterinary vaccines protect your family and pet.
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => goService('vaccination')}
                style={styles.reminderCtaBtn}
              >
                <Text style={styles.reminderCtaText}>Book Free Vaccine</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>

        {/* 6. City Veterinary Public Services Grid */}
        <Animated.View entering={FadeInDown.delay(220).duration(240)} style={styles.section}>
          <SectionHeader
            title="City Vet Services"
            actionLabel="See all"
            onAction={() => router.push('/services' as never)}
          />
          <View style={styles.servicesGrid}>
            {HOME_SERVICES.map((service) => (
              <View key={service.id} style={styles.serviceItem}>
                <ServiceCard
                  title={service.name}
                  subtitle={service.tagline}
                  icon={<Ionicons name={service.icon} size={22} color={service.color} />}
                  iconBackground={service.bg}
                  onPress={() => goService(service.id)}
                />
              </View>
            ))}
          </View>
        </Animated.View>

        {/* 7. City Veterinary Office Helpline */}
        <Animated.View entering={FadeInDown.delay(260).duration(240)} style={styles.section}>
          <View style={[styles.cvoContactCard, shadows.sm]}>
            <View style={styles.cvoContactTop}>
              <View style={styles.cvoLogoWrap}>
                <Ionicons name="call" size={18} color={colors.primary} />
              </View>
              <View style={styles.cvoTextWrap}>
                <Text style={styles.cvoTitle}>City Veterinary Office Helpline</Text>
                <Text style={styles.cvoSub}>Cagayan de Oro City · Animal Health Division</Text>
              </View>
            </View>
            <Pressable
              onPress={handleCallCVO}
              style={styles.cvoCallBtn}
            >
              <Ionicons name="call-outline" size={15} color={colors.white} />
              <Text style={styles.cvoCallBtnText}>Call (088) 857-2260</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* 8. Recent Activity */}
        {recentActivity.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(300).duration(240)} style={styles.section}>
            <SectionHeader title="Recent Activity" />
            <View style={[styles.activityCard, shadows.sm]}>
              {recentActivity.map((item, index) => (
                <ActivityRow
                  key={item.id}
                  title={item.title}
                  detail={item.detail}
                  date={item.date}
                  type={item.type}
                  isLast={index === recentActivity.length - 1}
                />
              ))}
            </View>
          </Animated.View>
        ) : null}

        <View style={styles.footerSpacing} />
      </Screen>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: 4,
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    gap: 3,
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
    marginBottom: 1,
  },
  eyebrowText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  greetingHeading: {
    ...typography.heading1,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  greetingSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  avatarWrap: {
    borderRadius: 21,
  },
  singlePetHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.16)',
    marginBottom: spacing.md,
    gap: 12,
  },
  singlePetHeroCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  singlePetAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  singlePetInfoWrap: {
    flex: 1,
    gap: 2,
  },
  singlePetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  singlePetNameText: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  singlePetVaxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  singlePetVaxText: {
    ...typography.captionBold,
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  singlePetVaxBadgeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  singlePetVaxTextWarning: {
    ...typography.captionBold,
    color: colors.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  singlePetSubText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  singlePetPassportLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  singlePetPassportLinkText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  topCarouselSection: {
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  onboardingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.16)',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  onboardingIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingTextCol: {
    alignItems: 'center',
    gap: 3,
  },
  onboardingTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  onboardingSub: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  onboardingBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  onboardingBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12.5,
  },
  quickActionsSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    ...shadows.sm,
  },
  quickActionTilePressed: {
    backgroundColor: '#F0F9F7',
    borderColor: 'rgba(0, 168, 150, 0.35)',
    transform: [{ scale: 0.94 }],
    opacity: 0.92,
  },
  quickActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    marginBottom: spacing.lg,
    gap: 11,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overviewIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTitleWrap: {
    gap: 1,
  },
  overviewBadgeText: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  overviewBadgeSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.14)',
  },
  verifiedText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FBFA',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.08)',
    gap: 2,
  },
  statBoxPressed: {
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
  },
  statIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statNum: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  statLbl: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '600',
  },
  clinicFooterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9F7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.12)',
  },
  clinicScheduleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  clinicHoursText: {
    ...typography.small,
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  cvoCallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.20)',
  },
  cvoCallChipPressed: {
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
  },
  cvoCallChipText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  section: {
    marginBottom: spacing.lg,
  },
  reminderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.18)',
    gap: 10,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderTextWrap: {
    flex: 1,
    gap: 2,
  },
  reminderTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  reminderSub: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 15,
  },
  reminderCtaBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8.5,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderCtaText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  serviceItem: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  cvoContactCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    gap: 10,
  },
  cvoContactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cvoLogoWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 168, 150, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cvoTextWrap: {
    flex: 1,
    gap: 1,
  },
  cvoTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  cvoSub: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  cvoCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  cvoCallBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    padding: spacing.md,
  },
  footerSpacing: {
    height: spacing.xxl,
  },
});
