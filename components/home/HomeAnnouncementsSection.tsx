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
import {
  extractOutreachOpId,
  isOutreachAnnouncement,
  parseOutreachDetails,
  type FieldOperationRecord,
  type OutreachDetails,
  type OutreachRecordResult,
} from '@services/outreach/outreachService';
import { OutreachPostAction } from './OutreachPostAction';
import { OutreachCheckInScannerModal } from './OutreachCheckInScannerModal';
import { OutreachSuccessReceiptModal } from './OutreachSuccessReceiptModal';

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
  author?: {
    id: string;
    avatar_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
  } | null;
  fieldOperation?: FieldOperationRecord | null;
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

const AVATAR_BG_COLORS = [
  '#0D9488', // Teal
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#059669', // Emerald
  '#D97706', // Amber
  '#E11D48', // Rose
  '#4F46E5', // Indigo
  '#0891B2', // Cyan
];

export function getAvatarBgColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_BG_COLORS.length;
  return AVATAR_BG_COLORS[index];
}

export function getAuthorInitials(item: AnnouncementItem): string {
  // 1. Check author first_name and last_name from users table
  const firstName = item.author?.first_name?.trim();
  const lastName = item.author?.last_name?.trim();
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName && !lastName && firstName.length >= 2) {
    return firstName.slice(0, 2).toUpperCase();
  }

  // 2. Parse from author.full_name or item.author_name
  const name = (item.author?.full_name || item.author_name || '').trim();
  if (!name) return 'CV';

  // Strip common honorific / professional prefixes (e.g. "Dr. ", "Doc ", "Atty. ")
  const cleaned = name.replace(/^(Dr\.|Doctor|Doc|Atty\.|Engr\.|Hon\.)\s+/i, '').trim();

  // Strip trailing credentials (e.g. ", DVM", ", MD", ", RN")
  const strippedCredentials = cleaned.replace(/,\s*(DVM|MD|RN|PhD|MS|BS).*$/i, '').trim();

  const words = strippedCredentials.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const firstInitial = words[0][0];
    const lastInitial = words[words.length - 1][0];
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }

  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0]?.[0] || 'CV').toUpperCase();
}

export function getAuthorAvatarUrl(item: AnnouncementItem): string | null {
  const url = item.author?.avatar_url;
  if (url && typeof url === 'string') {
    const trimmed = url.trim();
    if (
      trimmed.length > 0 &&
      trimmed !== 'null' &&
      trimmed !== 'undefined' &&
      (trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('file:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('content:'))
    ) {
      return trimmed;
    }
  }
  return null;
}

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
  const [scannerOutreach, setScannerOutreach] = useState<OutreachDetails | null>(null);
  const [receiptResult, setReceiptResult] = useState<OutreachRecordResult | null>(null);

  // TanStack Query for caching, revalidation, and background sync
  const {
    data: announcements = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['announcements'],
    queryFn: async (): Promise<AnnouncementItem[]> => {
      const [annRes, fieldOpRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('*, author:users(id, avatar_url, first_name, last_name, full_name)')
          .eq('is_active', true)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('field_operations')
          .select('id, op_id, barangay, scheduled_date, status, notes, lead'),
      ]);

        if (annRes.error) {
          throw new Error(annRes.error.message);
        }

        const fieldOpsByOpId = new Map<string, FieldOperationRecord>();
        if (!fieldOpRes.error && Array.isArray(fieldOpRes.data)) {
          for (const op of fieldOpRes.data as FieldOperationRecord[]) {
            if (op.op_id) {
              fieldOpsByOpId.set(op.op_id.toUpperCase(), op);
            }
          }
        }

        // Filter out internal system configuration records (e.g. quota config)
      const visible = (annRes.data || []).filter(
          (a: any) => !a.title?.startsWith('[CVO_') && a.title !== '[CVO_PROCEDURE_QUOTA_CONFIG]',
        );

        return visible.map((a: any) => {
          const opId = extractOutreachOpId(a.content);
          const fieldOperation = opId
            ? fieldOpsByOpId.get(opId.toUpperCase()) ?? null
            : null;
          return {
            ...a,
            fieldOperation,
          };
        });
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
            onScanOutreach={(details) => {
              if (details.canScanQr) {
                setScannerOutreach(details);
              }
            }}
          />
        ))
      )}

      {/* Facebook-style Fullscreen Maximized Image Viewer Modal */}
      <FacebookImageViewerModal
        imageInfo={maximizedImage}
        onClose={handleCloseImage}
      />

      {/* Outreach QR Check-in & Record Scanner Modal */}
      <OutreachCheckInScannerModal
        visible={Boolean(scannerOutreach)}
        outreachInfo={scannerOutreach}
        onClose={() => setScannerOutreach(null)}
        onSuccess={(result) => {
          setScannerOutreach(null);
          setReceiptResult(result);
        }}
      />

      {/* Official CVO Outreach Receipt / Certificate Modal */}
      <OutreachSuccessReceiptModal
        visible={Boolean(receiptResult)}
        result={receiptResult}
        onClose={() => setReceiptResult(null)}
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
  onScanOutreach,
}: {
  item: AnnouncementItem;
  isFirst: boolean;
  onImagePress: () => void;
  onScanOutreach: (details: OutreachDetails) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Outreach post detection & metadata
  const outreachDetails = useMemo(
    () => (isOutreachAnnouncement(item) ? parseOutreachDetails(item, item.fieldOperation) : null),
    [item],
  );

  const avatarUrl = useMemo(() => getAuthorAvatarUrl(item), [item]);
  const initials = useMemo(() => getAuthorInitials(item), [item]);
  const avatarBgColor = useMemo(
    () => getAvatarBgColor(item.author_name || initials),
    [item.author_name, initials],
  );

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

        {/* Facebook Header: Avatar, Name, Verified Badge, Time, Globe */}
        <View style={styles.fbHeaderRow}>
          <View
            style={[
              styles.fbAvatarWrap,
              (!avatarUrl || imageError) && { backgroundColor: avatarBgColor },
            ]}
          >
            {avatarUrl && !imageError ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.fbAvatarImg}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <Text style={styles.fbAvatarInitialsText}>{initials}</Text>
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

        {/* Barangay Outreach Station Action Card */}
        {outreachDetails ? (
          <OutreachPostAction
            outreachInfo={outreachDetails}
            onScanPress={() => onScanOutreach(outreachDetails)}
          />
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
    backgroundColor: '#E6F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbAvatarImg: {
    width: 40,
    height: 40,
  },
  fbAvatarInitialsText: {
    fontFamily: typography.font.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
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
