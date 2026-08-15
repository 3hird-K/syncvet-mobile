import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { colors, radius, shadows, spacing, typography } from '@theme';

interface ServiceCardProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconBackground?: string;
  onPress?: () => void;
}

export function ServiceCard({
  title,
  subtitle,
  icon,
  iconBackground = colors.primaryLight,
  onPress,
}: ServiceCardProps) {
  const content = (
    <>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
          {icon}
        </View>
        <View style={styles.arrowWrap}>
          <Ionicons name="arrow-forward" size={13} color={colors.primaryDark} />
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.container, shadows.sm]}>{content}</View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        shadows.sm,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 13,
    minHeight: 122,
    borderWidth: 1,
    borderColor: 'rgba(10, 110, 100, 0.10)',
    justifyContent: 'space-between',
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.98 }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    fontSize: 14,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.small,
    fontSize: 11.5,
    color: colors.textMuted,
    lineHeight: 15,
  },
});
