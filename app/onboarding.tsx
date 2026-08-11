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
import { SocialAuthButton } from '@components/ui/SocialAuthButton';

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
  const [connecting, setConnecting] = useState(false);
  const setCompleted = useOnboardingStore((state) => state.setCompleted);

  const total = ONBOARDING_SLIDES.length;
  const isLast = current === total - 1;
  const currentSlide = ONBOARDING_SLIDES[current] || ONBOARDING_SLIDES[0];

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

  const handleGoogle = useCallback(async () => {
    haptic.medium();
    setConnecting(true);
    setCompleted();
    router.push('/(auth)/google');
  }, [router, setCompleted]);

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
        handleGoogle();
      }
    },
    [isLast, handleGoogle],
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
            iconName={item.iconName}
            accentBg={item.accentBg}
            badgeColor={item.badgeColor}
            illustration={<Illustration size={220} />}
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
    <SafeAreaView style={[styles.container, { backgroundColor: currentSlide.accentBg }]} edges={['top', 'bottom']}>
      {/* Top Header Overlay with Skip */}
      {!isLast ? (
        <View style={styles.topHeader}>
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
      ) : null}

      {/* Main Slide Carousel */}
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
        windowSize={4}
      />

      {/* Bottom Sheet Action Footer */}
      <View style={styles.bottomSheetFooter}>
        <ProgressIndicator count={total} current={current} activeColor={colors.primary} />
        
        {isLast ? (
          <View style={styles.authButtonWrap}>
            <SocialAuthButton
              onPress={handleGoogle}
              loading={connecting}
            />
            <Text style={styles.footnote}>
              By continuing, you agree to our{' '}
              <Text style={styles.link}>Terms</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>.
            </Text>
          </View>
        ) : (
          <Text style={styles.swipeHint}>Swipe to continue</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 20,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  skipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  bottomSheetFooter: {
    backgroundColor: colors.white,
    paddingHorizontal: 28,
    paddingBottom: 24,
    paddingTop: 8,
    alignItems: 'center',
    gap: 16,
    minHeight: 90,
    justifyContent: 'center',
  },
  authButtonWrap: {
    width: '100%',
    gap: 10,
  },
  swipeHint: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footnote: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
  },
});



