import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface TypingIndicatorProps {
  senderName: string;
  role?: string;
  visible: boolean;
  avatarIcon?: string;
  avatarSource?: any;
  themeColor?: string;
}

function BouncingDot({ delay, color }: { delay: number; color: string }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 260 }),
          withTiming(0, { duration: 260 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

export function TypingIndicator({
  senderName,
  role = 'Staff',
  visible,
  avatarIcon = 'medical',
  avatarSource,
  themeColor = '#059669',
}: TypingIndicatorProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      {/* Sender Mini Avatar */}
      <View style={[styles.avatarCircle, { backgroundColor: `${themeColor}20`, borderColor: `${themeColor}40` }]}>
        {avatarSource ? (
          <Image source={avatarSource} style={styles.avatarImage} />
        ) : (
          <Ionicons name={avatarIcon as any} size={13} color={themeColor} />
        )}
      </View>

      {/* Bubble with Typing Dots */}
      <View style={styles.bubble}>
        <View style={styles.headerRow}>
          <Text style={[styles.senderName, { color: themeColor }]} numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={styles.roleText}>({role})</Text>
        </View>

        <View style={styles.dotsRow}>
          <Text style={styles.isTypingText}>typing</Text>
          <View style={styles.dotsContainer}>
            <BouncingDot delay={0} color={themeColor} />
            <BouncingDot delay={180} color={themeColor} />
            <BouncingDot delay={360} color={themeColor} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderBottomLeftRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '78%',
    gap: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleText: {
    fontSize: 9.5,
    color: '#9CA3AF',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  isTypingText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
