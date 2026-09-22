import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { useResidentData } from '@hooks/useResidentData';
import { useNotificationStore } from '@store/useNotificationStore';
import { BackButton } from '@components/ui/BackButton';
import { TransactionRow } from '@components/ui/TransactionRow';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import type { ServiceTransaction } from '@services/data';

export default function NotificationsScreen() {
  const { ownerId, transactions, loading, syncNow } = useResidentData();
  const [refreshing, setRefreshing] = useState(false);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const loadReadIds = useNotificationStore((state) => state.loadReadIds);

  useEffect(() => {
    if (ownerId) {
      loadReadIds(ownerId);
    }
  }, [ownerId, loadReadIds]);

  useEffect(() => {
    if (ownerId && transactions && transactions.length > 0) {
      const ids = transactions.map((t: ServiceTransaction) => t.id || t.transactionNo);
      markAllAsRead(ownerId, ids);
    }
  }, [ownerId, transactions, markAllAsRead]);

  const handleRefresh = useCallback(async () => {
    haptic.light();
    setRefreshing(true);
    try {
      await syncNow();
    } catch (e) {
      console.log('Notifications refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [syncNow]);

  const allTransactions: ServiceTransaction[] = transactions || [];

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="notifications-off-outline" size={38} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>No Activity Recorded</Text>
      <Text style={styles.emptyDesc}>
        Official veterinary service transactions, appointments, and pet registrations will appear here in real time.
      </Text>
    </View>
  );

  return (
    <AnimatedScreen animation="fade">
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        {/* 1. Header Bar with safe notch clearance */}
        <View style={styles.header}>
          <BackButton />
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Notifications & Activity</Text>
            <Text style={styles.headerSubtitle}>Official CVO Service Transactions</Text>
          </View>
          <View style={styles.headerRightSpacer} />
        </View>

        {/* 2. Unified Compressed Timeline Card */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {allTransactions.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(250)} style={styles.unifiedCard}>
              {allTransactions.map((tx, idx) => (
                <TransactionRow
                  key={tx.id || idx}
                  transactionNo={tx.transactionNo}
                  title={tx.title}
                  detail={tx.detail}
                  date={tx.date}
                  type={tx.type}
                  status={tx.status}
                  isLast={idx === allTransactions.length - 1}
                />
              ))}
            </Animated.View>
          ) : (
            renderEmptyState()
          )}
        </ScrollView>
      </SafeAreaView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    fontSize: 17,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  headerRightSpacer: {
    width: 42,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  unifiedCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(7, 30, 38, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
  },
});
