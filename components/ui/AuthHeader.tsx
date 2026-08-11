import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@theme';
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
      {showLogo ? (
        <View style={styles.logo}>
          <Logo size={56} wordmarkSize={24} />
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
  logo: {
    marginBottom: spacing.xxl,
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
