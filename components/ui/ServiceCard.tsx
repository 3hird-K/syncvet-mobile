import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { colors, radius, shadows, spacing, typography } from '@theme';

interface ServiceCardProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconBackground?: string;
  onPress?: () => void;
}

export function ServiceCard({
  title,
  subtitle,
  icon,
  iconBackground = colors.primaryLight,
  onPress,
}: ServiceCardProps) {
  const content = (
    <>
      <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
        {icon}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.container, shadows.sm]}>{content}</View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        shadows.sm,
        pressed && styles.pressed,
      ]}
    >
      {content}
      <View style={styles.arrowWrap}>
        <Ionicons name="arrow-forward" size={14} color={colors.primaryDark} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    minHeight: 130,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.98 }],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
  },
  arrowWrap: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.md,
  },
});
