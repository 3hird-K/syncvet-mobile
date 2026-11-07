import React, { useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { colors, radius, shadows, typography } from '@theme';
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
    (clerkUser?.unsafeMetadata?.role as string) ||
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

  const handleOpenWebPortal = async () => {
    haptic.light();
    const portalUrl = 'https://syncvet.cagayandeoro.gov.ph';
    try {
      await WebBrowser.openBrowserAsync(portalUrl);
    } catch {
      await Linking.openURL(portalUrl).catch(() => {
        toast.info('SyncVet Web Portal', {
          description: 'Visit syncvet.cagayandeoro.gov.ph on your computer.',
        });
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Top Restricted Badge Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="shield-half-sharp" size={44} color={colors.warning} />
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>Pet Owner Access Only</Text>
        <Text style={styles.subtitle}>
          This SyncVet mobile app is exclusively designed for CDO Pet Owners and Residents.
        </Text>

        {/* Account & Role Card */}
        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
            )}
            <View style={styles.accountDetails}>
              <Text style={styles.accountName} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.accountEmail} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>

          {/* Detected Restricted Role Badge */}
          <View style={styles.roleBadgeRow}>
            <View style={styles.roleBadge}>
              <Ionicons name="alert-circle" size={14} color={colors.warningDark} />
              <Text style={styles.roleBadgeText}>
                Active Role: <Text style={styles.roleBadgeStrong}>{roleTitle}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Notice Explanation Box */}
        <View style={styles.noticeBox}>
          <Ionicons name="desktop-outline" size={20} color={colors.primary} style={styles.noticeIcon} />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Staff Web Portal Required</Text>
            <Text style={styles.noticeText}>
              Veterinarians and Administrators must sign in via the SyncVet Web Portal or CVO Admin Console for clinic operations, consultations, and rabies management.
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <Button
            title={signingOut ? 'Signing Out...' : 'Sign In with Pet Owner Account'}
            variant="primary"
            size="lg"
            onPress={handleSwitchAccount}
            disabled={signingOut}
            loading={signingOut}
          />

          <Button
            title="Open CVO Web Portal"
            variant="outline"
            size="md"
            onPress={handleOpenWebPortal}
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
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.warningLight,
    borderWidth: 2,
    borderColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...shadows.sm,
  },
  title: {
    fontFamily: typography.font.bold,
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: typography.font.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
    marginBottom: 28,
  },
  accountCard: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
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
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontFamily: typography.font.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  accountEmail: {
    fontFamily: typography.font.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  roleBadgeRow: {
    flexDirection: 'row',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  roleBadgeText: {
    fontFamily: typography.font.medium,
    fontSize: 12,
    color: colors.warningDark,
  },
  roleBadgeStrong: {
    fontFamily: typography.font.bold,
    color: colors.warningDark,
  },
  noticeBox: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
  },
  noticeIcon: {
    marginTop: 2,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontFamily: typography.font.bold,
    fontSize: 13,
    color: colors.primary,
    marginBottom: 2,
  },
  noticeText: {
    fontFamily: typography.font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  spacer: {
    flex: 1,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
});

