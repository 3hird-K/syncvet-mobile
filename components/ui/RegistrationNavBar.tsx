import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@theme';
import { BackButton } from './BackButton';
import { ProgressIndicator } from './ProgressIndicator';

export interface RegistrationNavBarProps {
  step: number;
  total?: number;
  showBack?: boolean;
  onBack?: () => void;
  to?: string;
}

/**
 * Clean, modern navigation bar for the resident registration wizard.
 * - Symmetrically balances the back button on the left with an equal right spacer.
 * - Positions the step progress indicator (green pill + dot) and step label inline.
 * - Suppresses the back button on Step 1.
 */
export function RegistrationNavBar({
  step,
  total = 2,
  showBack = false,
  onBack,
  to,
}: RegistrationNavBarProps) {
  return (
    <View style={styles.navBar}>
      <View style={styles.sideSlot}>
        {showBack ? <BackButton onPress={onBack} to={to} /> : null}
      </View>

      <View style={styles.centerSlot}>
        <ProgressIndicator count={total} current={step - 1} activeColor={colors.primary} />
        <Text style={styles.stepLabel}>STEP {step} OF {total}</Text>
      </View>

      <View style={styles.sideSlot} />
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideSlot: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
