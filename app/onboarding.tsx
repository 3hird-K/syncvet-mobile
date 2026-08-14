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
import * as Linking from 'expo-linking';
import { useOAuth } from '@clerk/expo';
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

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  const status = useAuthStore((state) => state.status);

  // Warm up browser for OAuth
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
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

  if (status === 'authenticated') {
    return null;
  }

  const handleGoogleSignIn = useCallback(async () => {
    try {
      haptic.medium();
      setConnectingGoogle(true);

      try {
        await WebBrowser.dismissAuthSession();
      } catch {}

      const redirectUrl = Linking.createURL('/(auth)', { scheme: 'syncvet' });
      const { createdSessionId, signIn: clerkSignInFlow, signUp: clerkSignUpFlow, setActive } =
        await startOAuthFlow({ redirectUrl });

      const sessionId = createdSessionId || clerkSignInFlow?.createdSessionId || clerkSignUpFlow?.createdSessionId;

      if (sessionId && setActive) {
        await setActive({ session: sessionId });
        haptic.success();
        setCompleted();

        const clerkEmail =
          clerkSignUpFlow?.emailAddress ??
          clerkSignInFlow?.identifier ??
          '';
        const firstName = clerkSignUpFlow?.firstName || clerkSignInFlow?.userData?.firstName || '';
        const lastName = clerkSignUpFlow?.lastName || clerkSignInFlow?.userData?.lastName || '';
        const clerkName =
          firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || (clerkEmail ? clerkEmail.split('@')[0] : 'Resident');

        await useAuthStore.getState().googleSignIn({
          email: clerkEmail || 'user@syncvet.app',
          fullName: clerkName || 'SyncVet Resident',
        });

        const currentUser = useAuthStore.getState().user;
        const metadata = (clerkSignUpFlow?.unsafeMetadata || (clerkSignInFlow?.userData as any)?.unsafeMetadata || {}) as Record<string, any>;
        const clerkPets = Array.isArray(metadata?.pets) ? (metadata?.pets as any[]) : [];
        const hasCompletedProfile = Boolean(
          metadata?.profileCompleted &&
          metadata?.mobileNumber &&
          metadata?.address &&
          clerkPets.length > 0
        );

        if (hasCompletedProfile) {
          if (metadata?.mobileNumber || metadata?.address) {
            await useAuthStore.getState().saveOwnerProfile(
              (metadata?.mobileNumber as string) || currentUser?.mobileNumber || '',
              (metadata?.address as string) || currentUser?.address || '',
            );
          }
          await useAuthStore.getState().markRegistrationComplete();
          router.replace('/(main)');
        } else {
          router.replace('/(register)/owner');
        }
      } else {
        setConnectingGoogle(false);
      }
    } catch (err: any) {
      console.log('Google OAuth error on onboarding:', err);
      setConnectingGoogle(false);
      const rawMsg =
        err?.errors?.[0]?.longMessage ||
        err?.message ||
        'Could not sign in with Google. Please try again.';

      // Suppress standard dismiss/cancel warnings
      if (
        !rawMsg.toLowerCase().includes('cancel') &&
        !rawMsg.toLowerCase().includes('dismiss') &&
        !rawMsg.toLowerCase().includes('closed')
      ) {
        toast.error('Google Sign-In', {
          description: rawMsg,
        });
      }
      haptic.error();
    } finally {
      setConnectingGoogle(false);
      try {
        await WebBrowser.dismissAuthSession();
      } catch {}
    }
  }, [startOAuthFlow, setCompleted, router]);

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
                      leftIcon={
                        <View style={styles.googleIconBadge}>
                          <ColoredGoogleIcon size={18} />
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
});



