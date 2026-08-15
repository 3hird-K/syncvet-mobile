import React, { useState, useCallback } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@theme';
import { BackgroundDecoration } from './BackgroundDecoration';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  keyboardAvoid?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentContainerStyle?: object;
  padded?: boolean;
  refreshControl?: ReactElement;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

/**
 * Base screen scaffold: safe area, keyboard handling, scrolling, pull-to-refresh
 * and the shared brand background. Use everywhere to keep screens consistent.
 */
export function Screen({
  children,
  scroll = false,
  keyboardAvoid = true,
  edges = ['top', 'bottom'],
  contentContainerStyle,
  padded = true,
  refreshControl,
  onRefresh,
  refreshing,
}: ScreenProps) {
  const padding = padded ? spacing.xl : 0;
  const [internalRefreshing, setInternalRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setInternalRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setInternalRefreshing(false);
    }
  }, [onRefresh]);

  const activeRefreshing = refreshing !== undefined ? refreshing : internalRefreshing;

  const defaultRefreshControl = onRefresh ? (
    <RefreshControl
      refreshing={activeRefreshing}
      onRefresh={handleRefresh}
      tintColor={colors.primary}
      colors={[colors.primary, colors.primaryDark]}
      progressBackgroundColor={colors.surface}
    />
  ) : undefined;

  const content = (
    <>
      <BackgroundDecoration />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: padding },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={Boolean(onRefresh || refreshControl)}
          refreshControl={refreshControl ?? defaultRefreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { paddingHorizontal: padding }, contentContainerStyle]}>
          {children}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {keyboardAvoid ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },
});
