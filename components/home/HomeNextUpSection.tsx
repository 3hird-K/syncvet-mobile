import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { SectionHeader } from '@components/ui/SectionHeader';
import { AppointmentCard } from '@components/ui/AppointmentCard';
import type { Appointment } from '@services/data';

interface HomeNextUpSectionProps {
  nextAppointment?: Appointment | null;
  totalAppointmentsCount: number;
}

export function HomeNextUpSection({
  nextAppointment,
  totalAppointmentsCount,
}: HomeNextUpSectionProps) {
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(260)} style={styles.section}>
      <SectionHeader
        title="Clinic Appointments"
        icon={<Ionicons name="calendar-outline" size={17} color={colors.primaryDark} />}
        actionLabel="View All"
        onAction={() => {
          haptic.light();
          router.push('/appointments' as never);
        }}
      />

      {nextAppointment ? (
        <AppointmentCard
          appointment={nextAppointment}
          onPress={() => {
            haptic.light();
            router.push('/appointments' as never);
          }}
          showFooterAction
        />
      ) : (
        <View style={[styles.preventiveCard, shadows.sm]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.cardTitle}>Preventive Care & Vaccines</Text>
              <Text style={styles.cardSub}>
                No upcoming visits scheduled. Keep your pets protected with municipal clinic services.
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Book a visit"
            onPress={() => {
              haptic.light();
              router.push('/appointments/new' as never);
            }}
            style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
          >
            <Ionicons name="calendar-outline" size={15} color={colors.white} />
            <Text style={styles.ctaBtnText}>Schedule a Visit</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  preventiveCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.12)',
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10, 110, 100, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...typography.title,
    fontSize: 15,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
  },
  cardSub: {
    ...typography.small,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    paddingVertical: 10,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  ctaBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  ctaBtnText: {
    ...typography.captionBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
});
