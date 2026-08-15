import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { Button } from './Button';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  message?: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  actionIcon,
  onAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.compact, shadows.sm]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={compact ? 22 : 26} color={colors.primaryDark} />
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button
            title={actionLabel}
            size={compact ? 'sm' : 'md'}
            leftIcon={actionIcon}
            onPress={onAction}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.10)',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  compact: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(10, 110, 100, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.heading3,
    fontSize: 16.5,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 15,
  },
  message: {
    ...typography.small,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 17,
  },
  action: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});
