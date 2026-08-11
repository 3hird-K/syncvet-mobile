import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors, radius, spacing, typography } from '@theme';
import type { ActivityType } from '@services/data';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const ACTIVITY_META: Record<
  ActivityType,
  { icon: IoniconName; color: string; bg: string }
> = {
  booking: { icon: 'calendar-outline', color: colors.info, bg: colors.infoLight },
  confirmed: { icon: 'checkmark-circle-outline', color: colors.primaryDark, bg: colors.primaryLight },
  completed: { icon: 'checkmark-done-outline', color: colors.successDark, bg: colors.successLight },
  registration: { icon: 'document-text-outline', color: colors.accentDark, bg: colors.accentLight },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface ActivityRowProps {
  title: string;
  detail?: string;
  date: string;
  type: ActivityType;
  isLast?: boolean;
}

export function ActivityRow({ title, detail, date, type, isLast }: ActivityRowProps) {
  const meta = ACTIVITY_META[type];
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.icon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={16} color={meta.color} />
        </View>
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        <Text style={styles.time}>{relativeTime(date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    alignItems: 'center',
    width: 32,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  detail: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  time: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 4,
  },
});
