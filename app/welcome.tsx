import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { Logo } from '@components/ui/Logo';
import { PhotoIllustration } from '@components/ui/PhotoIllustration';
import { SocialAuthButton } from '@components/ui/SocialAuthButton';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';

export default function WelcomeScreen() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);

  const handleGoogle = async () => {
    haptic.medium();
    setConnecting(true);
    router.push('/(auth)/google');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Hero Canvas with Animated Floating Bubbles */}
      <View style={styles.heroCanvas}>
        <AnimatedBubbleBackground />
        
        <View style={styles.logoRow}>
          <Logo size={42} wordmarkSize={20} />
        </View>

        <View style={styles.heroIllustration}>
          <PhotoIllustration
            source={require('@assets/image2.png')}
            size={220}
            accentColor={colors.primary}
          />
        </View>
      </View>

      {/* Curved Bottom Sheet Container */}
      <View style={[styles.cardSheet, shadows.lg]}>
        {/* Floating Center Icon Badge */}
        <View style={[styles.floatingBadge, shadows.md]}>
          <Ionicons name="heart" size={26} color={colors.white} />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.subtitle}>WELCOME TO SYNCVET</Text>
          <Text style={styles.headline}>Better care for your best friend.</Text>
          <Text style={styles.body}>
            Access veterinary services from your City Veterinary Office, right from your phone.
          </Text>

          <View style={styles.ctaWrap}>
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
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F5F2',
  },
  heroCanvas: {
    flex: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoRow: {
    position: 'absolute',
    top: 20,
    left: 24,
    zIndex: 10,
  },
  heroIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  cardSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 28,
    alignItems: 'center',
    position: 'relative',
  },
  floatingBadge: {
    position: 'absolute',
    top: -26,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  cardContent: {
    width: '100%',
    alignItems: 'center',
  },
  subtitle: {
    ...typography.captionBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  headline: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '700',
    marginBottom: 10,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 320,
  },
  ctaWrap: {
    width: '100%',
    marginTop: 24,
    gap: 12,
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

