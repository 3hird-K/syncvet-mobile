import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors, spacing, typography } from '@theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface InfoRowProps {
  label: string;
  value: string;
  icon?: IoniconName;
  valueColor?: string;
}

export function InfoRow({ label, value, icon, valueColor }: InfoRowProps) {
  return (
    <View style={styles.row}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={16} color={colors.primaryDark} />
        </View>
      ) : null}
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  value: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    flex: 1.4,
    textAlign: 'right',
  },
});
