import React, { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { queryKeys } from '@lib/queryClient';
import { useAuthStore } from '@store/useAuthStore';
import { networkService } from '@services/network';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { toast } from '@components/ui/Sonner';

export default function MessagesIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((s) => s.user);
  const ownerId = authUser?.id || clerkUser?.id || '';

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // The two official channels and their imagery are bundled with the app, so
  // this screen never needs to wait on Supabase just to render.
  const handleRefresh = useCallback(async () => {
    haptic.light();
    setRefreshing(true);
    if (ownerId && networkService.isOnline()) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.unreadMessagesCount(ownerId),
      });
    } else {
      toast.info('Offline mode', {
        description: 'Saved conversations are still available.',
        duration: 2500,
      });
    }
    setRefreshing(false);
  }, [ownerId, queryClient]);

  const handleOpenChat = (contactId: 'vet-hellen' | 'cvo-admin') => {
    haptic.light();
    router.push(`/messages/${contactId}` as never);
  };

  return (
    <AnimatedScreen animation="zoom">
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Chats</Text>
          <Text style={styles.subtitle}>
            Official Cagayan de Oro City Veterinary Telemedicine
          </Text>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText}>OFFICIAL CVO CHANNELS</Text>
        </View>

        {/* Channels List - Edge-to-Edge Messenger Style */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 110 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#059669"
            />
          }
        >
          <View style={styles.channelsList}>
            {/* Channel 1: Dr. Helen Ann P. Tacandong */}
            <Pressable
              onPress={() => handleOpenChat('vet-hellen')}
              style={({ pressed }) => [
                styles.channelRow,
                pressed && styles.channelRowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Chat with Dr. Helen Ann P. Tacandong"
            >
              <View style={styles.avatarWrap}>
                <Image
                  source={require('@assets/dr-helen-avatar.jpg')}
                  style={styles.avatarImage}
                />
                <View style={styles.activeDot} />
              </View>

              <View style={styles.channelRowContent}>
                <View style={styles.channelTopRow}>
                  <Text style={styles.channelName} numberOfLines={1}>
                    Dr. Helen Ann P. Tacandong
                  </Text>
                  <Text style={styles.channelTime}>Active</Text>
                </View>

                <View style={styles.channelBottomRow}>
                  <Text style={styles.channelSnippet} numberOfLines={1}>
                    Clinical advice, symptoms & rabies protocols
                  </Text>
                  <View style={styles.telemedicineBadge}>
                    <Text style={styles.telemedicineBadgeText}>Telemedicine</Text>
                  </View>
                </View>
              </View>
            </Pressable>

            {/* Inset Divider (Messenger / iOS Style) */}
            <View style={styles.insetDivider} />

            {/* Channel 2: CVO Inquiry & Admin Desk */}
            <Pressable
              onPress={() => handleOpenChat('cvo-admin')}
              style={({ pressed }) => [
                styles.channelRow,
                pressed && styles.channelRowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Chat with CVO Inquiry and Admin Desk"
            >
              <View style={styles.avatarWrap}>
                <Image
                  source={require('@assets/cvo-seal.png')}
                  style={[styles.avatarImage, styles.sealAvatar]}
                  resizeMode="contain"
                />
                <View style={styles.activeDot} />
              </View>

              <View style={styles.channelRowContent}>
                <View style={styles.channelTopRow}>
                  <Text style={styles.channelName} numberOfLines={1}>
                    CVO Inquiry & Admin Desk
                  </Text>
                  <Text style={styles.channelTime}>Active</Text>
                </View>

                <View style={styles.channelBottomRow}>
                  <Text style={styles.channelSnippet} numberOfLines={1}>
                    Kapon reservations, anti-rabies & walk-ins
                  </Text>
                  <View style={styles.publicDeskBadge}>
                    <Text style={styles.publicDeskBadgeText}>Public Desk</Text>
                  </View>
                </View>
              </View>
            </Pressable>

            {/* Inset Divider */}
            <View style={styles.insetDivider} />
          </View>
        </ScrollView>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '400',
  },
  sectionHeaderRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  channelsList: {
    width: '100%',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  channelRowPressed: {
    backgroundColor: '#F8FAFC',
  },
  avatarWrap: {
    position: 'relative',
    width: 56,
    height: 56,
    marginRight: 14,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
  },
  sealAvatar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  channelRowContent: {
    flex: 1,
    justifyContent: 'center',
  },
  channelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.2,
  },
  channelTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginLeft: 8,
  },
  channelBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelSnippet: {
    fontSize: 13.5,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  telemedicineBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  telemedicineBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
  },
  publicDeskBadge: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  publicDeskBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginLeft: 86,
  },
});
