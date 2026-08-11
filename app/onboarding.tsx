import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { colors, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { ONBOARDING_SLIDES } from '@lib/onboarding';
import type { OnboardingSlideData } from '@lib/onboarding';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { ProgressIndicator } from '@components/ui/ProgressIndicator';
import { OnboardingSlide } from '@components/ui/OnboardingSlide';
import { BackgroundDecoration } from '@components/ui/BackgroundDecoration';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<OnboardingSlideData>);

type ScrollEvent = {
  nativeEvent: {
    contentOffset: { x: number };
    velocity?: { x: number };
  };
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const [current, setCurrent] = useState(0);
  const setCompleted = useOnboardingStore((state) => state.setCompleted);

  const total = ONBOARDING_SLIDES.length;
  const isLast = current === total - 1;

  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const finish = useCallback(() => {
    haptic.success();
    setCompleted();
    router.replace('/welcome');
  }, [router, setCompleted]);

  const skip = useCallback(() => {
    haptic.light();
    finish();
  }, [finish]);

  const onMomentumScrollEnd = useCallback(
    (e: ScrollEvent) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      setCurrent(Math.max(0, Math.min(total - 1, index)));
    },
    [width, total],
  );

  const onScrollEndDrag = useCallback(
    (e: ScrollEvent) => {
      const velocityX = e.nativeEvent.velocity?.x ?? 0;
      if (isLast && velocityX < -0.5) {
        finish();
      }
    },
    [isLast, finish],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof ONBOARDING_SLIDES)[number]; index: number }) => {
      const Illustration = item.illustration;
      return (
        <View style={{ width }}>
          <OnboardingSlide
            subtitle={item.subtitle}
            title={item.title}
            description={item.description}
            illustration={<Illustration size={250} />}
            scrollX={scrollX}
            index={index}
          />
        </View>
      );
    },
    [width, scrollX],
  );

  const keyExtractor = useCallback(
    (item: (typeof ONBOARDING_SLIDES)[number]) => item.id,
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <BackgroundDecoration subtle />

      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          onPress={skip}
          hitSlop={12}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <AnimatedFlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        bounces={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
      />

      <View style={styles.bottom}>
        <ProgressIndicator count={total} current={current} />
        <Text style={styles.hint}>
          {isLast ? 'Swipe to get started' : 'Swipe to continue'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  skipBtn: {
    padding: spacing.sm,
  },
  skipText: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  bottom: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
