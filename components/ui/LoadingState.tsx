import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@theme';
import { PawLoading } from './PawLoading';
import type { PawLoadingMode, PawLoadingSize } from './PawLoading';

interface LoadingStateProps {
  label?: string;
  fullScreen?: boolean;
  mode?: PawLoadingMode;
  size?: PawLoadingSize;
}

export function LoadingState({
  label,
  fullScreen = true,
  mode = 'walking',
  size = 'md',
}: LoadingStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <PawLoading
        mode={mode}
        size={size}
        label={label}
        color={colors.primary}
        fullScreen={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

