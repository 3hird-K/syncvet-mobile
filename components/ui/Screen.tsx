import React from 'react';
import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
}

/**
 * Base screen scaffold: safe area, keyboard handling, scrolling and the
 * shared brand background. Use everywhere to keep screens consistent.
 */
export function Screen({
  children,
  scroll = false,
  keyboardAvoid = true,
  edges = ['top', 'bottom'],
  contentContainerStyle,
  padded = true,
}: ScreenProps) {
  const padding = padded ? spacing.xl : 0;

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
          bounces={false}
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
    paddingVertical: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: spacing.lg,
  },
});
