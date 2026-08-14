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
import { getFirstName, todayISO } from '@lib/format';
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

        {/* 2. Unified Pet Health Registry Overview Card */}
        <View style={[styles.overviewCard, shadows.sm]}>
          <View style={styles.overviewTop}>
            <View style={styles.overviewBadge}>
              <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
              <Text style={styles.overviewBadgeText}>Pet Health Registry</Text>
            </View>

            <View style={styles.verifiedPill}>
              <View style={styles.verifiedDot} />
              <Text style={styles.verifiedText}>CDO Resident</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Pressable
              onPress={() => {
                haptic.light();
                router.push('/pets' as never);
              }}
              style={styles.statCol}
            >
              <Text style={styles.statNum}>{allPets.length}</Text>
              <Text style={styles.statLbl}>My Pets</Text>
            </Pressable>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: colors.success }]}>
                {vaccinatedCount}/{allPets.length}
              </Text>
              <Text style={styles.statLbl}>Vaccinated</Text>
            </View>

            <View style={styles.statDivider} />

            <Pressable
              onPress={() => {
                haptic.light();
                router.push('/appointments' as never);
              }}
              style={styles.statCol}
            >
              <Text style={[styles.statNum, { color: upcomingAppointments.length > 0 ? colors.primary : colors.textPrimary }]}>
                {upcomingAppointments.length}
              </Text>
              <Text style={styles.statLbl}>Upcoming</Text>
            </Pressable>
          </View>

          {/* Clinic Hours & Quick Direct Hotline */}
          <Pressable
            onPress={handleCallCVO}
            style={styles.clinicHoursRow}
          >
            <View style={styles.clinicHoursLeft}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.clinicHoursText}>CVO Main Clinic Open · 8:00 AM – 5:00 PM</Text>
            </View>
            <Ionicons name="call-outline" size={13} color={colors.primary} />
          </Pressable>
        </View>

        {/* 3. My Pets 3D Cover Flow Carousel */}
        <View style={styles.section}>
          <SectionHeader
            title="My Pets"
            actionLabel={`See all (${allPets.length})`}
            onAction={() => router.push('/pets' as never)}
          />
          <PetCoverFlowCarousel
            pets={allPets}
            onSelectPet={() => {
              haptic.light();
              router.push('/pets' as never);
            }}
          />
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
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.06)',
    marginBottom: spacing.lg,
    gap: 14,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overviewBadgeText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  verifiedText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  statLbl: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(7, 30, 38, 0.08)',
  },
  clinicHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 168, 150, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  clinicHoursLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  clinicHoursText: {
    ...typography.small,
    color: colors.textPrimary,
    fontSize: 11.5,
    fontWeight: '600',
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
