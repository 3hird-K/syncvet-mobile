import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';

import { colors, typography } from '@theme';
import { supabase } from '@lib/supabase';
import { haptic } from '@lib/haptics';
import { Skeleton, SkeletonCircle } from '@components/ui/Skeleton';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  author_id: string | null;
  author_name: string;
  author_role: string;
  target_barangay: string | null;
  is_pinned: boolean;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaximizedImageInfo {
  url: string;
  title?: string;
  authorName?: string;
  authorRole?: string;
  created_at?: string;
}

const CATEGORIES = [
  'All',
  'Vaccination Drive',
  'Clinic Schedule',
  'Public Health',
  'Urgent Advisory',
] as const;

function formatRelativeTime(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'just now';
    if (diffHours === 1) return '1h';
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1d';
    return `${diffDays}d`;
  } catch {
    return 'recently';
  }
}

export function HomeAnnouncementsSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [maximizedImage, setMaximizedImage] = useState<MaximizedImageInfo | null>(null);

  // TanStack Query for caching, revalidation, and background sync
  const {
    data: announcements = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['announcements'],
    queryFn: async (): Promise<AnnouncementItem[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Filter out internal system configuration records (e.g. quota config)
      return (data || []).filter(
        (a) => !a.title?.startsWith('[CVO_') && a.title !== '[CVO_PROCEDURE_QUOTA_CONFIG]',
      );
    },
    staleTime: 1000 * 60 * 3, // 3 minutes stale time
    gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
    refetchOnReconnect: true,
  });

  const filteredAnnouncements = useMemo(() => {
    if (selectedCategory === 'All') return announcements;
    return announcements.filter(
      (a) =>
        a.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        (selectedCategory === 'Public Health' && a.category?.toLowerCase() === 'general'),
    );
  }, [selectedCategory, announcements]);

  const handleOpenImage = (item: AnnouncementItem) => {
    if (!item.image_url) return;
    haptic.light();
    setMaximizedImage({
      url: item.image_url,
      title: item.title,
      authorName: item.author_name,
      authorRole: item.author_role,
      created_at: item.created_at,
    });
  };

  const handleCloseImage = () => {
    haptic.light();
    setMaximizedImage(null);
  };

  return (
    <Animated.View entering={FadeInDown.delay(120).duration(280)} style={styles.section}>
      {/* Category Filter Pills (Horizontal Scroll bar) */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => {
                  haptic.light();
                  setSelectedCategory(cat);
                }}
                style={[
                  styles.filterChip,
                  isSelected ? styles.filterChipSelected : styles.filterChipUnselected,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected ? styles.filterChipTextSelected : styles.filterChipTextUnselected,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Announcements Feed (Facebook Style Posts or Facebook Skeletons) */}
      {isLoading && announcements.length === 0 ? (
        <View style={styles.skeletonContainer}>
          <FacebookPostSkeleton hasImage />
          <FacebookPostSkeleton />
          <FacebookPostSkeleton hasImage />
        </View>
      ) : isError ? (
        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.warning} />
          <Text style={styles.emptyTitle}>Unable to load announcements</Text>
          <Text style={styles.emptySubtitle}>
            Please check your network connection and try again.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : filteredAnnouncements.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="newspaper-outline" size={28} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No announcements found</Text>
          <Text style={styles.emptySubtitle}>
            There are currently no active posts under &quot;{selectedCategory}&quot;.
          </Text>
        </View>
      ) : (
        filteredAnnouncements.map((item, index) => (
          <FacebookPostCard
            key={item.id}
            item={item}
            isFirst={index === 0}
            onImagePress={() => handleOpenImage(item)}
          />
        ))
      )}

      {/* Facebook-style Fullscreen Maximized Image Viewer Modal */}
      <FacebookImageViewerModal
        imageInfo={maximizedImage}
        onClose={handleCloseImage}
      />
    </Animated.View>
  );
}

/**
 * Facebook Post Skeleton Loader
 * Mimics Facebook app feed loading placeholders with shimmering avatar, lines, and media.
 */
function FacebookPostSkeleton({ hasImage = false }: { hasImage?: boolean }) {
  return (
    <View style={styles.fbPostWrapper}>
      <View style={styles.fbSeparator} />
      <View style={styles.fbPostContainer}>
        {/* Header Skeleton */}
        <View style={styles.fbHeaderRow}>
          <SkeletonCircle size={40} />
          <View style={{ flex: 1, marginLeft: 10, gap: 6 }}>
            <Skeleton width="45%" height={14} borderRadius={4} />
            <Skeleton width="30%" height={11} borderRadius={4} />
          </View>
          <Skeleton width={18} height={18} borderRadius={9} />
        </View>

        {/* Text Body Skeleton */}
        <View style={styles.fbTextWrap}>
          <Skeleton width="94%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="86%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="55%" height={13} borderRadius={4} style={{ marginBottom: 4 }} />
        </View>

        {/* Image Media Skeleton (Full Bleed) */}
        {hasImage && (
          <View style={styles.fbFullWidthImageWrap}>
            <Skeleton width="100%" height={280} borderRadius={0} />
          </View>
        )}
      </View>
    </View>
  );
}

function FacebookPostCard({
  item,
  isFirst,
  onImagePress,
}: {
  item: AnnouncementItem;
  isFirst: boolean;
  onImagePress: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Format internal brackets like [EVENT_DATE:2026-11-09] into clean human dates
  const cleanContent = useMemo(() => {
    let text = item.content || '';
    text = text.replace(/\[EVENT_DATE:([^\]]+)\]/g, '📅 Event Date: $1');
    text = text.replace(/\[OP_ID:([^\]]+)\]/g, '🔖 Reference: $1');
    return text.trim();
  }, [item.content]);

  // Check if text is long enough to warrant "See more" / "See less"
  const isLong = cleanContent.length > 160 || cleanContent.split('\n').length > 3;

  const displayText = useMemo(() => {
    if (!isLong || expanded) return cleanContent;
    // Show first ~150 chars or first 3 lines
    const lines = cleanContent.split('\n');
    if (lines.length > 3) {
      return lines.slice(0, 3).join('\n').trim();
    }
    return cleanContent.slice(0, 150).trim();
  }, [cleanContent, isLong, expanded]);

  const authorInitials = useMemo(() => {
    if (!item.author_name) return 'CVO';
    return item.author_name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [item.author_name]);

  const isDrHelen =
    item.author_name?.toLowerCase().includes('helen') ||
    item.author_role?.toLowerCase().includes('veterinarian');

  return (
    <View style={styles.fbPostWrapper}>
      {/* 8px Facebook Feed Separator between posts */}
      <View style={[styles.fbSeparator, isFirst && styles.fbFirstSeparator]} />

      <View style={styles.fbPostContainer}>
        {/* Pinned Post indicator if pinned */}
        {item.is_pinned && (
          <View style={styles.fbPinnedRow}>
            <Ionicons name="pin" size={13} color="#059669" />
            <Text style={styles.fbPinnedText}>Pinned post</Text>
            <View style={{ flex: 1 }} />
            <View style={styles.fbFeaturedBadge}>
              <Text style={styles.fbFeaturedBadgeText}>FEATURED ANNOUNCEMENT</Text>
            </View>
          </View>
        )}

        {/* Facebook Header: Avatar, Name, Verified Badge, Time, Globe, More/Close */}
        <View style={styles.fbHeaderRow}>
          <View style={styles.fbAvatarWrap}>
            {isDrHelen ? (
              <Image
                source={require('@assets/no-backgrounds/doctor11-removebg-preview.png')}
                style={styles.fbAvatarImg}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.fbAvatarFallback}>
                <Text style={styles.fbAvatarFallbackText}>{authorInitials}</Text>
              </View>
            )}
          </View>

          <View style={styles.fbAuthorMeta}>
            <View style={styles.fbAuthorNameRow}>
              <Text style={styles.fbAuthorName} numberOfLines={1}>
                {item.author_name || 'City Veterinary Office'}
              </Text>
              <Ionicons name="checkmark-circle" size={14} color="#1877F2" style={{ marginLeft: 3 }} />
            </View>

            <View style={styles.fbTimeRow}>
              <Text style={styles.fbTimeText}>
                {item.author_role ? `${item.author_role} · ` : ''}{formatRelativeTime(item.created_at)}
              </Text>
              <Text style={styles.fbDot}>·</Text>
              <Ionicons name="earth" size={11} color="#65676B" />
            </View>
          </View>

          {/* Facebook Header Action Icons: Ellipsis & Close */}
          <View style={styles.fbHeaderActions}>
            <Pressable hitSlop={8} style={styles.fbIconBtn}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#65676B" />
            </Pressable>
            <Pressable hitSlop={8} style={styles.fbIconBtn}>
              <Ionicons name="close" size={18} color="#65676B" />
            </Pressable>
          </View>
        </View>

        {/* Post Text & Title */}
        <View style={styles.fbTextWrap}>
          {item.title ? (
            <Text style={styles.fbTitle}>{item.title}</Text>
          ) : null}

          {item.target_barangay ? (
            <View style={styles.fbBarangayPill}>
              <Ionicons name="location-sharp" size={11} color="#059669" />
              <Text style={styles.fbBarangayText}>{item.target_barangay}</Text>
            </View>
          ) : null}

          {/* Text with "See more" / "See less" */}
          <Text style={styles.fbBodyText}>
            {displayText}
            {isLong && !expanded ? '... ' : ' '}
            {isLong && (
              <Text
                onPress={() => {
                  haptic.light();
                  setExpanded(!expanded);
                }}
                style={styles.seeMoreBtn}
              >
                {expanded ? 'See less' : 'See more'}
              </Text>
            )}
          </Text>
        </View>

        {/* Full Width Edge-to-Edge Media: Tap to Maximize in Fullscreen */}
        {item.image_url ? (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Maximize Image"
            onPress={onImagePress}
            style={({ pressed }) => [
              styles.fbFullWidthImageWrap,
              pressed && styles.imagePressed,
            ]}
          >
            <Image
              source={{ uri: item.image_url }}
              style={styles.fbFullWidthImage}
              resizeMode="cover"
            />
          </Pressable>
        ) : null}

        {/* No reactions per user explicit instruction */}
      </View>
    </View>
  );
}

/**
 * Facebook-style Fullscreen Maximized Photo Viewer Modal
 */
function FacebookImageViewerModal({
  imageInfo,
  onClose,
}: {
  imageInfo: MaximizedImageInfo | null;
  onClose: () => void;
}) {
  if (!imageInfo) return null;

  return (
    <Modal
      visible={Boolean(imageInfo)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        {/* Top Header Bar */}
        <View style={styles.modalHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
            onPress={onClose}
            hitSlop={10}
            style={styles.modalCloseBtn}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.modalHeaderMeta}>
            <Text style={styles.modalAuthorName} numberOfLines={1}>
              {imageInfo.authorName || 'City Veterinary Office'}
            </Text>
            {imageInfo.created_at ? (
              <Text style={styles.modalTimeText}>
                {formatRelativeTime(imageInfo.created_at)} · 🌐
              </Text>
            ) : null}
          </View>

          <View style={styles.modalHeaderRight}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
          </View>
        </View>

        {/* Center Maximized Fullscreen Image */}
        <Pressable style={styles.modalImageCenterWrap} onPress={onClose}>
          <Image
            source={{ uri: imageInfo.url }}
            style={styles.modalMaximizedImage}
            resizeMode="contain"
          />
        </Pressable>

        {/* Bottom Post Title / Caption Overlay */}
        {imageInfo.title ? (
          <View style={styles.modalBottomBar}>
            <Text style={styles.modalTitleText} numberOfLines={3}>
              {imageInfo.title}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
    marginBottom: 24,
    width: '100%',
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6EB',
    paddingVertical: 10,
    marginBottom: 4,
  },
  filterRow: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipSelected: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  filterChipUnselected: {
    backgroundColor: '#F0F2F5',
    borderColor: '#E4E6EB',
  },
  filterChipText: {
    fontFamily: typography.font.medium,
    fontSize: 12,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: typography.font.bold,
  },
  filterChipTextUnselected: {
    color: '#475569',
  },

  /* Skeleton Container */
  skeletonContainer: {
    width: '100%',
  },

  /* Empty & Error Cards */
  emptyCard: {
    width: '100%',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    fontFamily: typography.font.bold,
    fontSize: 14,
    color: '#0F172A',
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: typography.font.regular,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#0D9488',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
  },
  retryBtnText: {
    fontFamily: typography.font.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  /* Facebook Post Layout */
  fbPostWrapper: {
    width: '100%',
  },
  fbSeparator: {
    height: 8,
    backgroundColor: '#F0F2F5',
    width: '100%',
  },
  fbFirstSeparator: {
    height: 4,
  },
  fbPostContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingBottom: 6,
  },

  /* Pinned Row */
  fbPinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 5,
  },
  fbPinnedText: {
    fontFamily: typography.font.bold,
    fontSize: 11.5,
    color: '#059669',
  },
  fbFeaturedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fbFeaturedBadgeText: {
    fontFamily: typography.font.bold,
    fontSize: 9.5,
    color: '#166534',
    letterSpacing: 0.3,
  },

  /* Facebook Header Row */
  fbHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  fbAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbAvatarImg: {
    width: 40,
    height: 40,
  },
  fbAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbAvatarFallbackText: {
    fontFamily: typography.font.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  fbAuthorMeta: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  fbAuthorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fbAuthorName: {
    fontFamily: typography.font.bold,
    fontSize: 15,
    color: '#050505',
    letterSpacing: -0.1,
  },
  fbTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
    gap: 3,
  },
  fbTimeText: {
    fontFamily: typography.font.regular,
    fontSize: 12,
    color: '#65676B',
  },
  fbDot: {
    fontSize: 12,
    color: '#65676B',
  },
  fbHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fbIconBtn: {
    padding: 6,
  },

  /* Post Text */
  fbTextWrap: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
  },
  fbTitle: {
    fontFamily: typography.font.bold,
    fontSize: 15.5,
    color: '#050505',
    lineHeight: 21,
    marginBottom: 4,
  },
  fbBarangayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  fbBarangayText: {
    fontFamily: typography.font.medium,
    fontSize: 11,
    color: '#047857',
  },
  fbBodyText: {
    fontFamily: typography.font.regular,
    fontSize: 14.5,
    lineHeight: 20.5,
    color: '#050505',
  },
  seeMoreBtn: {
    fontFamily: typography.font.bold,
    fontSize: 14,
    color: '#65676B',
  },

  /* Facebook Full Bleed Edge-to-Edge Image */
  fbFullWidthImageWrap: {
    width: '100%',
    height: 350,
    backgroundColor: '#1E293B',
  },
  imagePressed: {
    opacity: 0.9,
  },
  fbFullWidthImage: {
    width: '100%',
    height: '100%',
  },

  /* Fullscreen Modal Image Viewer */
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 54,
    paddingBottom: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 10,
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderMeta: {
    flex: 1,
    marginLeft: 14,
  },
  modalAuthorName: {
    fontFamily: typography.font.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  modalTimeText: {
    fontFamily: typography.font.regular,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 1,
  },
  modalHeaderRight: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageCenterWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalMaximizedImage: {
    width: '100%',
    height: '100%',
  },
  modalBottomBar: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalTitleText: {
    fontFamily: typography.font.regular,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
});
