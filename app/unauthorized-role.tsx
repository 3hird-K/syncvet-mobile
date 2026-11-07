import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, typography } from '@theme';
import { Button } from '@components/ui/Button';
import { useAuthStore } from '@store/useAuthStore';
import { formatRoleTitle } from '@services/auth/types';
import { haptic } from '@lib/haptics';
import { toast } from '@components/ui/Sonner';

export default function UnauthorizedRoleScreen() {
  const router = useRouter();
  const { signOut: clerkSignOut } = useAuth();
  const { user: clerkUser } = useUser();
  const currentUser = useAuthStore((state) => state.user);
  const authStoreSignOut = useAuthStore((state) => state.signOut);

  const [signingOut, setSigningOut] = useState(false);

  const detectedRole =
    currentUser?.role ||
    (clerkUser?.publicMetadata?.role as string) ||
    'Veterinarian';

  const roleTitle = formatRoleTitle(detectedRole);
  const email =
    currentUser?.email ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    'staff@syncvet.app';
  const fullName =
    currentUser?.fullName ||
    clerkUser?.fullName ||
    (clerkUser?.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : 'Staff Member');
  const avatarUrl = currentUser?.photoUrl || clerkUser?.imageUrl;

  const handleSwitchAccount = async () => {
    try {
      haptic.medium();
      setSigningOut(true);

      // Sign out from Clerk
      await clerkSignOut().catch(() => {});
      // Sign out from local store
      await authStoreSignOut().catch(() => {});

      toast.info('Signed Out', {
        description: 'Please sign in with your Pet Owner Google account.',
      });

      router.replace({ pathname: '/onboarding', params: { slide: '3' } });
    } catch (err) {
      console.warn('Switch account error:', err);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Minimalist Brand Accent Pill */}
        <View style={styles.badgePill}>
          <View style={styles.statusDot} />
          <Text style={styles.badgePillText}>Pet Owner Portal</Text>
        </View>

        {/* Minimalist Heading */}
        <Text style={styles.title}>Pet Owner Access Only</Text>
        <Text style={styles.subtitle}>
          This mobile app is built exclusively for CDO pet owners and residents. Staff management tools are hosted on the web portal.
        </Text>

        {/* Modern Minimalist User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={20} color={colors.primary} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>

          {/* Minimalist Active Role Pill */}
          <View style={styles.roleTag}>
            <Text style={styles.roleTagLabel}>Current Account Role:</Text>
            <Text style={styles.roleTagValue}>{roleTitle}</Text>
          </View>
        </View>

        {/* Minimalist Quiet Guidance Note */}
        <View style={styles.guidanceBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} style={styles.guidanceIcon} />
          <Text style={styles.guidanceText}>
            Veterinarians and Administrators should sign in from a desktop browser to access clinical records and consultation consoles.
          </Text>
        </View>

        <View style={styles.spacer} />

        {/* Single Minimalist Action Button */}
        <View style={styles.buttonWrap}>
          <Button
            title={signingOut ? 'Signing Out...' : 'Sign In with Pet Owner Account'}
            variant="primary"
            size="lg"
            onPress={handleSwitchAccount}
            disabled={signingOut}
            loading={signingOut}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
    alignItems: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 6,
    marginBottom: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  badgePillText: {
    fontFamily: typography.font.semibold,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 0.2,
  },
  title: {
    fontFamily: typography.font.bold,
    fontSize: 23,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: typography.font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 10,
    marginBottom: 28,
  },
  profileCard: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: colors.border,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: typography.font.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  profileEmail: {
    fontFamily: typography.font.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  roleTagLabel: {
    fontFamily: typography.font.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  roleTagValue: {
    fontFamily: typography.font.bold,
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  guidanceBox: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  guidanceIcon: {
    marginTop: 1,
  },
  guidanceText: {
    flex: 1,
    fontFamily: typography.font.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  spacer: {
    flex: 1,
  },
  buttonWrap: {
    width: '100%',
  },
});

