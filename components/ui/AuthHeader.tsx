import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@theme';
import { Logo } from './Logo';

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
}

/** Consistent header for all auth screens. */
export function AuthHeader({ title, subtitle, showLogo = true }: AuthHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.subtitleTagWrap}>
        <Ionicons name="paw" size={13} color={colors.primary} />
        <Text style={styles.subtitleTag}>CITY VETERINARY CARE</Text>
      </View>

      {showLogo ? (
        <View style={styles.logo}>
          <Logo size={48} wordmarkSize={22} />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  subtitleTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  subtitleTag: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  logo: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
