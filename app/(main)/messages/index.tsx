import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import {
  chatService,
  OFFICIAL_CONTACTS,
  type ChatThread,
} from '@services/chat/chatService';

export default function MessagesIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((s) => s.user);
  const ownerId = authUser?.id || clerkUser?.id || '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [threads, setThreads] = useState<Record<string, ChatThread>>({});

  const loadThreads = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    try {
      const list = await chatService.getResidentChats(ownerId);
      const map: Record<string, ChatThread> = {};
      list.forEach((t) => {
        if (t.assigned_vet_name?.includes('Helen') || t.subject?.includes('Telemedicine')) {
          map['vet-hellen'] = t;
        } else {
          map['cvo-admin'] = t;
        }
      });
      setThreads(map);
    } catch (err) {
      console.warn('Error loading threads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ownerId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadThreads();
  };

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

        {/* Channels List */}
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
          {loading && !refreshing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={styles.loadingText}>Connecting to municipal channels...</Text>
            </View>
          ) : (
            <View style={styles.channelsList}>
              {/* Channel 1: Dr. Helen Ann P. Tacandong */}
              <Pressable
                onPress={() => handleOpenChat('vet-hellen')}
                style={({ pressed }) => [
                  styles.card,
                  styles.vetCard,
                  pressed && styles.cardPressed,
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

                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      Dr. Helen Ann P. Tacandong
                    </Text>
                    <View style={styles.telemedicineBadge}>
                      <Text style={styles.telemedicineBadgeText}>Telemedicine</Text>
                    </View>
                  </View>

                  <Text style={styles.cardRole} numberOfLines={1}>
                    City Veterinarian • CVO
                  </Text>
                  <Text style={styles.cardDesc} numberOfLines={1}>
                    Clinical advice & rabies protocols
                  </Text>
                </View>
              </Pressable>

              {/* Channel 2: CVO Inquiry & Admin Desk */}
              <Pressable
                onPress={() => handleOpenChat('cvo-admin')}
                style={({ pressed }) => [
                  styles.card,
                  styles.adminCard,
                  pressed && styles.cardPressed,
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

                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      CVO Inquiry & Admin Desk
                    </Text>
                    <View style={styles.publicDeskBadge}>
                      <Text style={styles.publicDeskBadgeText}>Public Desk</Text>
                    </View>
                  </View>

                  <Text style={styles.cardRole} numberOfLines={1}>
                    City Veterinary Office Admin
                  </Text>
                  <Text style={styles.cardDesc} numberOfLines={1}>
                    Kapon schedules, anti-rabies & walk-ins
                  </Text>
                </View>
              </Pressable>
            </View>
          )}
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
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  channelsList: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  vetCard: {
    backgroundColor: '#EBF8F2',
    borderColor: '#A7F3D0',
  },
  adminCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
  avatarWrap: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
  },
  sealAvatar: {
    backgroundColor: '#FFFFFF',
  },
  activeDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  telemedicineBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  telemedicineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  publicDeskBadge: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  publicDeskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  cardRole: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 2,
  },
});
