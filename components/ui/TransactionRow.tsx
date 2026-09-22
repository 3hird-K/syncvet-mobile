import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors, radius, spacing, typography } from '@theme';
import type { TransactionStatus, TransactionType } from '@services/data';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TRANSACTION_META: Record<
  TransactionType,
  { icon: IoniconName; color: string; bg: string; label: string }
> = {
  registration: {
    icon: 'ribbon-outline',
    color: '#059669', // Emerald/Gov Green
    bg: '#ECFDF5',
    label: 'Pet Registry',
  },
  booking: {
    icon: 'calendar-outline',
    color: '#0284C7', // Sky Blue
    bg: '#F0F9FF',
    label: 'Service Filing',
  },
  confirmed: {
    icon: 'shield-checkmark-outline',
    color: '#2563EB', // Official Blue
    bg: '#EFF6FF',
    label: 'Approved Schedule',
  },
  completed: {
    icon: 'checkmark-done-circle-outline',
    color: '#16A34A',
    bg: '#DCFCE7',
    label: 'Fulfilled',
  },
  cancellation: {
    icon: 'close-circle-outline',
    color: '#DC2626',
    bg: '#FEF2F2',
    label: 'Cancelled',
  },
};

const STATUS_BADGE: Record<
  TransactionStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'PENDING', color: '#D97706', bg: '#FEF3C7' },
  approved: { label: 'APPROVED', color: '#2563EB', bg: '#EFF6FF' },
  completed: { label: 'RECORDED', color: '#059669', bg: '#ECFDF5' },
  cancelled: { label: 'VOID', color: '#DC2626', bg: '#FEF2F2' },
};

function formatGovDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

interface TransactionRowProps {
  transactionNo?: string;
  title: string;
  detail?: string;
  date: string;
  type: TransactionType;
  status?: TransactionStatus;
  isLast?: boolean;
}

export function TransactionRow({
  transactionNo,
  title,
  detail,
  date,
  type,
  status = 'completed',
  isLast,
}: TransactionRowProps) {
  const meta = TRANSACTION_META[type] || TRANSACTION_META.booking;
  const badge = STATUS_BADGE[status] || STATUS_BADGE.completed;

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.icon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={17} color={meta.color} />
        </View>
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          {transactionNo ? (
            <Text style={styles.txnNo}>{transactionNo}</Text>
          ) : (
            <Text style={styles.txnTypeLabel}>{meta.label}</Text>
          )}
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        <Text style={styles.date}>{formatGovDate(date)}</Text>
      </View>
    </View>
  );
}

// Backward compatibility alias
export const ActivityRow = TransactionRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    alignItems: 'center',
    width: 36,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  txnNo: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  txnTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  detail: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
});
