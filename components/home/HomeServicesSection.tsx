import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, spacing } from '@theme';
import { SERVICES } from '@lib/services';
import { haptic } from '@lib/haptics';
import { SectionHeader } from '@components/ui/SectionHeader';
import { ServiceCard } from '@components/ui/ServiceCard';

const HOME_SERVICES = SERVICES.slice(0, 4);

export function HomeServicesSection() {
  const router = useRouter();

  // Group into pairs of 2 for a guaranteed 2-column grid
  const rows = [
    [HOME_SERVICES[0], HOME_SERVICES[1]],
    [HOME_SERVICES[2], HOME_SERVICES[3]],
  ];

  return (
    <Animated.View entering={FadeInDown.delay(180).duration(260)} style={styles.section}>
      <SectionHeader
        title="Veterinary Services"
        icon={<Ionicons name="grid-outline" size={17} color={colors.primaryDark} />}
        actionLabel="View All"
        onAction={() => {
          haptic.light();
          router.push('/services' as never);
        }}
      />

      <View style={styles.grid}>
        {rows.map((row, rowIdx) => (
          <View key={`row-${rowIdx}`} style={styles.row}>
            {row.map(
              (service) =>
                service && (
                  <View key={service.id} style={styles.col}>
                    <ServiceCard
                      title={service.name}
                      subtitle={service.tagline}
                      icon={<Ionicons name={service.icon} size={22} color={service.color} />}
                      iconBackground={service.bg}
                      onPress={() => {
                        haptic.light();
                        router.push(`/services/${service.id}` as never);
                      }}
                    />
                  </View>
                ),
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  col: {
    flex: 1,
  },
});
