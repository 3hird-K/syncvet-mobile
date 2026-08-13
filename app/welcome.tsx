import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { Logo } from '@components/ui/Logo';
import { Button } from '@components/ui/Button';
import { PhotoIllustration } from '@components/ui/PhotoIllustration';
import { AnimatedBubbleBackground } from '@components/ui/AnimatedBubbleBackground';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    haptic.light();
    router.push('/(auth)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Hero Canvas with Animated Floating Paw Bubbles */}
      <View style={styles.heroCanvas}>
        <AnimatedBubbleBackground />

        <View style={styles.logoRow}>
          <Logo size={38} wordmarkSize={20} />
        </View>

        <View style={styles.heroIllustration}>
          <PhotoIllustration
            source={require('@assets/no-backgrounds/nurse-pets2.png')}
            size={380}
            accentColor={colors.primary}
          />
        </View>
      </View>

      {/* Curved Bottom Sheet Container */}
      <View style={[styles.cardSheet, shadows.lg]}>
        {/* Floating Center Paw Badge */}
        <View style={[styles.floatingBadge, shadows.md]}>
          <Ionicons name="paw" size={24} color={colors.white} />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.subtitle}>WELCOME TO SYNCVET</Text>
          <Text style={styles.headline}>Better care for your best friend.</Text>
          <Text style={styles.body}>
            Access veterinary services from your City Veterinary Office, right from your phone.
          </Text>

          <View style={styles.ctaWrap}>
            <Button
              title="Get Started"
              size="lg"
              onPress={handleGetStarted}
              variant="primary"
            />

            <Text style={styles.footnote}>
              By continuing, you agree to SyncVet’s{' '}
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
    flex: 1.35,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    overflow: 'visible',
    zIndex: 1,
  },
  logoRow: {
    position: 'absolute',
    top: 16,
    left: 24,
    zIndex: 10,
  },
  heroIllustration: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: -32,
    zIndex: 1,
  },
  cardSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },
  floatingBadge: {
    position: 'absolute',
    top: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
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
    marginBottom: 6,
  },
  headline: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 320,
  },
  ctaWrap: {
    width: '100%',
    marginTop: 20,
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

