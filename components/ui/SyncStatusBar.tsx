import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { colors, radius, shadows, typography } from '@theme';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useResidentData } from '@hooks/useResidentData';
import { haptic } from '@lib/haptics';

interface SyncStatusBarProps {
  /** Optional container style */
  style?: any;
  /** Whether to show compact pill style */
  compact?: boolean;
}

export function SyncStatusBar({ style, compact = false }: SyncStatusBarProps) {
  const { isOnline, status: networkStatus } = useNetworkStatus();
  const { isSyncing, pendingCount, lastSyncedAt, syncNow } = useResidentData();

  const [showSyncedSuccess, setShowSyncedSuccess] = useState(false);
  const prevSyncingRef = React.useRef(isSyncing);

  // Rotation animation for syncing icon
  const spinRotation = useSharedValue(0);

  useEffect(() => {
    if (isSyncing) {
      spinRotation.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      spinRotation.value = 0;
    }
  }, [isSyncing, spinRotation]);

  // Flash "Synced just now" when sync finishes successfully
  useEffect(() => {
    if (prevSyncingRef.current && !isSyncing && isOnline && pendingCount === 0) {
      setShowSyncedSuccess(true);
      const timer = setTimeout(() => {
        setShowSyncedSuccess(false);
      }, 2400);
      return () => clearTimeout(timer);
    }
    prevSyncingRef.current = isSyncing;
  }, [isSyncing, isOnline, pendingCount]);

  const spinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinRotation.value}deg` }],
  }));

  const handleManualSync = () => {
    haptic.light();
    syncNow().catch(() => {});
  };

  // Only render if offline, syncing, has pending changes, or just synced
  const shouldDisplay = !isOnline || isSyncing || pendingCount > 0 || showSyncedSuccess;

  if (!shouldDisplay) {
    return null;
  }

  const formatLastSync = (iso: string | null): string => {
    if (!iso) return 'Not synced yet';
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins === 1) return '1 min ago';
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.container, style]}
      accessibilityRole="summary"
    >
      <Pressable
        onPress={isOnline && !isSyncing ? handleManualSync : undefined}
        style={[
          styles.pill,
          !isOnline && styles.pillOffline,
          isSyncing && styles.pillSyncing,
          showSyncedSuccess && styles.pillSuccess,
          compact && styles.pillCompact,
          shadows.sm,
        ]}
      >
        {/* State 1: Currently Syncing */}
        {isSyncing ? (
          <View style={styles.contentRow}>
            <Animated.View style={spinAnimatedStyle}>
              <Ionicons name="sync" size={13} color={colors.primaryDark} />
            </Animated.View>
            <Text style={styles.syncingText}>Syncing changes...</Text>
          </View>
        ) : showSyncedSuccess ? (
          /* State 2: Synced Successfully (Flash) */
          <View style={styles.contentRow}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={styles.successText}>Synced just now</Text>
          </View>
        ) : !isOnline ? (
          /* State 3: Offline with cached data and pending count */
          <View style={styles.contentRow}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineText}>
              Offline · Cached data
              {pendingCount > 0 ? ` (${pendingCount} pending)` : ''}
            </Text>
            <Ionicons name="cloud-offline-outline" size={12} color={colors.textMuted} />
          </View>
        ) : pendingCount > 0 ? (
          /* State 4: Online but with queued pending items */
          <View style={styles.contentRow}>
            <Ionicons name="arrow-up-circle" size={13} color={colors.warning} />
            <Text style={styles.pendingText}>
              {pendingCount} change{pendingCount > 1 ? 's' : ''} pending · Tap to sync
            </Text>
          </View>
        ) : (
          <View style={styles.contentRow}>
            <Ionicons name="checkmark-done" size={13} color={colors.textMuted} />
            <Text style={styles.lastSyncText}>Last synced {formatLastSync(lastSyncedAt)}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    zIndex: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
  },
  pillCompact: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
  },
  pillOffline: {
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(100, 116, 139, 0.20)',
  },
  pillSyncing: {
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    borderColor: 'rgba(0, 168, 150, 0.25)',
  },
  pillSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  offlineText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  syncingText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 11.5,
    fontWeight: '600',
  },
  successText: {
    ...typography.captionBold,
    color: colors.success,
    fontSize: 11.5,
    fontWeight: '600',
  },
  pendingText: {
    ...typography.captionBold,
    color: colors.warning,
    fontSize: 11.5,
    fontWeight: '600',
  },
  lastSyncText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
});
