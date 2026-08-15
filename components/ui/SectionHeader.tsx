import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';

interface SectionHeaderProps {
  title: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({
  title,
  icon,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={() => {
            haptic.light();
            onAction();
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primaryDark} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    fontSize: 16,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  actionPressed: {
    opacity: 0.65,
  },
  actionText: {
    ...typography.captionBold,
    fontSize: 13.5,
    fontFamily: typography.font.bold,
    color: colors.primaryDark,
  },
});
