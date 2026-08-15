import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useGoogleAuth } from '@hooks/useGoogleAuth';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { colors, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { ONBOARDING_SLIDES } from '@lib/onboarding';
import type { OnboardingSlideData } from '@lib/onboarding';
import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { ProgressIndicator } from '@components/ui/ProgressIndicator';
import { OnboardingSlide } from '@components/ui/OnboardingSlide';
import { Button } from '@components/ui/Button';
import { PawLoadingOverlay } from '@components/ui/PawLoading';
import { ColoredGoogleIcon } from '@components/ui/SocialAuthButton';
import { toast } from '@components/ui/Sonner';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<OnboardingSlideData>);

type ScrollEvent = {
  nativeEvent: {
    contentOffset: { x: number };
    velocity?: { x: number };
  };
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { slide } = useLocalSearchParams<{ slide?: string }>();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const initialIndex = slide === '3' || slide === 'last' ? 3 : 0;
  const [current, setCurrent] = useState(initialIndex);
  const setCompleted = useOnboardingStore((state) => state.setCompleted);

  const {
    handleGoogleSignIn,
    connecting: connectingGoogle,
    error: googleError,
  } = useGoogleAuth();

  useEffect(() => {
    if (googleError) {
      toast.error('Google Sign-In', { description: googleError });
    }
  }, [googleError]);

  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === 'authenticated') {
      try {
        void WebBrowser.dismissAuthSession();
        void WebBrowser.coolDownAsync();
      } catch {}
      router.replace('/(main)');
    }
  }, [status, router]);

  // Jump to specific slide if requested (e.g. after logout)
  useEffect(() => {
    if (slide === '3' || slide === 'last') {
      setCurrent(3);
      const timer = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: 3, animated: false });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [slide]);

  const total = ONBOARDING_SLIDES.length;
  const isLast = current === total - 1;
  const currentSlide = ONBOARDING_SLIDES[current] || ONBOARDING_SLIDES[0];

  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const skip = useCallback(() => {
    haptic.light();
    setCurrent(total - 1);
    listRef.current?.scrollToIndex({ index: total - 1, animated: true });
  }, [total]);

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
        handleGoogleSignIn();
      }
    },
    [isLast, handleGoogleSignIn],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof ONBOARDING_SLIDES)[number]; index: number }) => {
      const Illustration = item.illustration;
      const illustrationSize = index === 0 ? 450 : 380;
      const isLastSlide = index === total - 1;

      return (
        <View style={{ width }}>
          <OnboardingSlide
            subtitle={item.subtitle}
            title={item.title}
            description={item.description}
            iconName={item.iconName}
            accentBg={item.accentBg}
            badgeColor={item.badgeColor}
            illustration={<Illustration size={illustrationSize} />}
            scrollX={scrollX}
            index={index}
            footer={
              <View style={styles.slideFooter}>
                <ProgressIndicator count={total} current={index} activeColor={colors.primary} />
                {isLastSlide ? (
                  <View style={styles.authButtonWrap}>
                    <Button
                      title="Continue with Google"
                      size="lg"
                      onPress={handleGoogleSignIn}
                      loading={connectingGoogle}
                      variant="primary"
                      style={styles.googleCtaButton}
                      leftIcon={
                        <View style={styles.googleIconBadge}>
                          <ColoredGoogleIcon size={20} />
                        </View>
                      }
                    />
                    <Text style={styles.footnote}>
                      By continuing, you agree to SyncVet’s{' '}
                      <Text style={styles.link}>Terms</Text> and{' '}
                      <Text style={styles.link}>Privacy Policy</Text>.
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.swipeHint}>Swipe to continue</Text>
                )}
              </View>
            }
          />
        </View>
      );
    },
    [width, scrollX, total, connectingGoogle, handleGoogleSignIn],
  );

  const insets = useSafeAreaInsets();

  const keyExtractor = useCallback(
    (item: (typeof ONBOARDING_SLIDES)[number]) => item.id,
    [],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: currentSlide.accentBg }]}
      edges={['bottom']}
    >
      {/* Top Header Overlay with Skip */}
      {!isLast ? (
        <View style={[styles.topHeader, { top: insets.top + 10 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            onPress={skip}
            hitSlop={12}
            style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
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

      {/* Full-Screen Modern Walking Paw Footprints Loader while checking & routing user */}
      <PawLoadingOverlay visible={connectingGoogle} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    position: 'absolute',
    right: 20,
    zIndex: 30,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#071D19',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  skipBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  skipText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 13,
  },
  slideFooter: {
    alignItems: 'center',
    width: '100%',
    gap: 16,
    marginTop: 4,
  },
  authButtonWrap: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  googleCtaButton: {
    height: 56,
    borderRadius: 28,
  },
  swipeHint: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
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
  googleIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
});



