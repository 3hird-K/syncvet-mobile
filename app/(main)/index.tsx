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
import { PetCard } from '@components/ui/PetCard';
import { PetCoverFlowCarousel } from '@components/ui/PetCoverFlowCarousel';
import { PopoutPetAvatar } from '@components/ui/PopoutPetAvatar';
import { ServiceCard } from '@components/ui/ServiceCard';
import { AppointmentCard } from '@components/ui/AppointmentCard';
import { ActivityRow } from '@components/ui/ActivityRow';
import { Avatar } from '@components/ui/Avatar';
import type { Pet } from '@services/data';

const HOME_SERVICES = SERVICES.slice(0, 4);

export default function HomeScreen() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const user = useAuthStore((state) => state.user);
  useResidentData();

  const localPets = useDataStore((state) => state.pets);
  const appointments = useDataStore((state) => state.appointments);
  const activity = useDataStore((state) => state.activity);

  const displayName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    user?.fullName ||
    'Resident';
  const displayPhoto = clerkUser?.imageUrl || user?.photoUrl;

  // Seamless merge of Clerk metadata pets and local store pets
  const allPets: Pet[] = useMemo(() => {
    const metadata = (clerkUser?.unsafeMetadata || {}) as Record<string, any>;
    const metaPets = Array.isArray(metadata.pets) ? metadata.pets : [];

    if (metaPets.length > 0) {
      return metaPets.map((p, idx) => ({
        id: p.id || `clerk-pet-${idx}`,
        ownerId: user?.id || '',
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
    }

    if (localPets && localPets.length > 0) {
      return localPets;
    }

    return [];
  }, [clerkUser?.unsafeMetadata, localPets, user?.id]);

  const vaccinatedCount = useMemo(
    () => allPets.filter((p) => p.isVaccinated).length,
    [allPets],
  );

  const upcomingAppointments = useMemo(() => {
    const today = todayISO();
    return appointments
      .filter((a) => (a.status === 'pending' || a.status === 'confirmed') && a.date >= today)
      .sort((a, b) => (a.date === b.date ? a.timeSlot.localeCompare(b.timeSlot) : a.date.localeCompare(b.date)));
  }, [appointments]);

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

  return (
    <AnimatedScreen animation="fade">
      <Screen scroll>
        {/* 1. Senior Designer Clean Hero Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.locationTagRow}>
              <Ionicons name="location" size={13} color={colors.primary} />
              <Text style={styles.locationTagText}>Cagayan de Oro City</Text>
            </View>
            <Text style={styles.greetingHeading} numberOfLines={1}>
              Hello, {getFirstName(displayName)} 👋
            </Text>
            <Text style={styles.greetingSub}>City Veterinary Services & Passport</Text>
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
              <Ionicons name="notifications-outline" size={19} color={colors.textPrimary} />
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
        </View>

        {/* If owner has exactly 1 pet: Showcase their featured Pet Health Passport card above the registry */}
        {allPets.length === 1 && (
          <Pressable
            style={({ pressed }) => [
              styles.singlePetHeroCard,
              shadows.sm,
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
                size={58}
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
                  (allPets[0].species?.toLowerCase() === 'dog' ? 'Dog' : 'Cat')}
                {allPets[0].birthYear
                  ? ` · ${formatAge(ageFromBirthYear(allPets[0].birthYear))}`
                  : ''}
              </Text>

              <View style={styles.singlePetPassportLinkRow}>
                <Text style={styles.singlePetPassportLinkText}>
                  Digital Health Passport
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={13}
                  color={colors.primary}
                />
              </View>
            </View>
          </Pressable>
        )}

        {allPets.length > 1 && (
          <View style={styles.topCarouselSection}>
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
          </View>
        )}

        {/* 2. Unified Pet Health Registry Overview Card */}
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
              <View style={[styles.statIconBadge, { backgroundColor: 'rgba(0, 168, 150, 0.12)' }]}>
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
              <View style={[styles.statIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
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
              <View style={[styles.statIconBadge, { backgroundColor: 'rgba(14, 116, 144, 0.12)' }]}>
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

        {/* 4. Upcoming Visit / Preventive Care Banner */}
        <View style={styles.section}>
          <SectionHeader
            title="Upcoming Visit"
            actionLabel={nextAppointment ? 'Manage' : undefined}
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
                  <Ionicons name="medical" size={20} color={colors.primary} />
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
        </View>

        {/* 5. City Veterinary Public Services Grid */}
        <View style={styles.section}>
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
        </View>

        {/* 6. City Veterinary Office Helpline */}
        <View style={styles.section}>
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
        </View>

        {/* 7. Recent Activity */}
        {recentActivity.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Recent Activity" />
            <View style={styles.activityCard}>
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
          </View>
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
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  locationTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  locationTagText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  greetingHeading: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '700',
  },
  greetingSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    backgroundColor: colors.accent,
  },
  avatarWrap: {
    borderRadius: 21,
  },
  singlePetHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.16)',
    marginBottom: spacing.md,
    gap: 12,
  },
  singlePetHeroCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
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
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    marginBottom: spacing.lg,
    gap: 12,
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
    paddingVertical: 9,
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
    fontSize: 16.5,
    fontWeight: '800',
  },
  statLbl: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
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
  petRow: {
    gap: 12,
    paddingRight: spacing.md,
    overflow: 'visible',
  },
  petCardWrap: {
    width: 170,
  },
  addPetCard: {
    width: 130,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 168, 150, 0.35)',
    backgroundColor: 'rgba(0, 168, 150, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
    paddingHorizontal: 8,
  },
  addPetPressed: {
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
  },
  addPetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPetTitle: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  addPetSub: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10.5,
  },
  upcomingCardWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    overflow: 'hidden',
  },
  viewSlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(7, 30, 38, 0.05)',
    backgroundColor: 'rgba(0, 168, 150, 0.03)',
  },
  viewSlipBtnPressed: {
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
  },
  viewSlipText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
  },
  reminderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.18)',
    gap: 12,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    paddingVertical: 9,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderCtaText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12.5,
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
    padding: 14,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
