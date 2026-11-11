import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@lib/queryClient';

import { colors, radius, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { useAuthStore } from '@store/useAuthStore';
import { AnimatedScreen } from '@components/ui/AnimatedScreen';
import { TypingIndicator } from '@components/messages';
import { ChatMessageListSkeleton } from '@components/ui/Skeleton';
import {
  chatService,
  OFFICIAL_CONTACTS,
  type ChatMessage,
  type ChatThread,
  type OfficialContact,
} from '@services/chat/chatService';

const SUGGESTIONS: Record<string, string[]> = {
  'vet-hellen': [
    'My pet is vomiting / weak',
    'Anti-rabies vaccine info',
    'Kapon surgery requirements',
    'Animal bite guidance',
    'Pre-surgery fasting hours',
  ],
  'cvo-admin': [
    'Walk-in clinic operating hours',
    'Barangay outreach deployment',
    'How to register a new pet',
    'Are CVO services free?',
    'Adoption & impound inquiry',
  ],
};

interface SwipeableMessageProps {
  isResident: boolean;
  onSwipeReply: () => void;
  children: React.ReactNode;
}

/**
 * Swipeable message container:
 * - Own message: swipe LEFT (negative dx) to reply
 * - Other's message: swipe RIGHT (positive dx) to reply
 */
function SwipeableMessage({ isResident, onSwipeReply, children }: SwipeableMessageProps) {
  const pan = useRef(new Animated.Value(0)).current;
  const hasTriggeredHaptic = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const isHorizontal =
            Math.abs(gestureState.dx) > 12 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4;

          if (!isHorizontal) return false;

          // Own message: swipe left
          // Other message: swipe right
          return isResident ? gestureState.dx < -8 : gestureState.dx > 8;
        },
        onPanResponderMove: (_, gestureState) => {
          if (isResident) {
            if (gestureState.dx <= 0) {
              const clamped = Math.max(gestureState.dx, -65);
              pan.setValue(clamped);

              if (clamped <= -38 && !hasTriggeredHaptic.current) {
                hasTriggeredHaptic.current = true;
                haptic.light();
              } else if (clamped > -38) {
                hasTriggeredHaptic.current = false;
              }
            }
          } else {
            if (gestureState.dx >= 0) {
              const clamped = Math.min(gestureState.dx, 65);
              pan.setValue(clamped);

              if (clamped >= 38 && !hasTriggeredHaptic.current) {
                hasTriggeredHaptic.current = true;
                haptic.light();
              } else if (clamped < 38) {
                hasTriggeredHaptic.current = false;
              }
            }
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const threshold = 38;
          const shouldReply = isResident
            ? gestureState.dx <= -threshold
            : gestureState.dx >= threshold;

          if (shouldReply) {
            onSwipeReply();
          }

          hasTriggeredHaptic.current = false;
          Animated.spring(pan, {
            toValue: 0,
            friction: 7,
            tension: 80,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          hasTriggeredHaptic.current = false;
          Animated.spring(pan, {
            toValue: 0,
            friction: 7,
            tension: 80,
            useNativeDriver: true,
          }).start();
        },
      }),
    [isResident, onSwipeReply],
  );

  return (
    <View style={styles.swipeableContainer}>
      {/* Background Animated Reply Icon */}
      {isResident ? (
        <Animated.View
          style={[
            styles.replyIndicatorRight,
            {
              opacity: pan.interpolate({
                inputRange: [-55, -20, 0],
                outputRange: [1, 0.4, 0],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: pan.interpolate({
                    inputRange: [-55, -20, 0],
                    outputRange: [1, 0.6, 0.2],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.replyCircle}>
            <Ionicons name="arrow-undo" size={16} color="#FFFFFF" />
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.replyIndicatorLeft,
            {
              opacity: pan.interpolate({
                inputRange: [0, 20, 55],
                outputRange: [0, 0.4, 1],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: pan.interpolate({
                    inputRange: [0, 20, 55],
                    outputRange: [0.2, 0.6, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.replyCircle}>
            <Ionicons name="arrow-undo" size={16} color="#FFFFFF" />
          </View>
        </Animated.View>
      )}

      {/* Swiped message content */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX: pan }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export default function ChatConversationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const contactId = (id === 'cvo-admin' ? 'cvo-admin' : 'vet-hellen') as 'vet-hellen' | 'cvo-admin';
  const contact: OfficialContact = OFFICIAL_CONTACTS[contactId] || OFFICIAL_CONTACTS['vet-hellen'];
  const isVet = contactId === 'vet-hellen';

  const avatarSource = isVet
    ? require('@assets/dr-helen-avatar.jpg')
    : require('@assets/cvo-seal.png');

  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((s) => s.user);
  const ownerId = authUser?.id || clerkUser?.id || '';
  const senderName = authUser?.fullName || clerkUser?.fullName || 'Pet Owner';

  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<ChatMessage | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; base64?: string } | null>(null);
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; message: ChatMessage } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<any>(null);
  const queryClient = useQueryClient();

  const handleScrollToRepliedMessage = useCallback(
    (targetId?: string, fallbackSnippet?: string) => {
      if (!targetId && !fallbackSnippet) return;
      haptic.light();

      let targetIndex = -1;
      if (targetId) {
        targetIndex = messages.findIndex((m) => m.id === targetId);
      }
      if (targetIndex === -1 && fallbackSnippet) {
        const snippetClean = fallbackSnippet.trim().toLowerCase();
        targetIndex = messages.findIndex(
          (m) =>
            m.message_text &&
            (m.message_text.toLowerCase().includes(snippetClean) ||
              snippetClean.includes(m.message_text.toLowerCase())),
        );
      }

      if (targetIndex !== -1 && flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({
            index: targetIndex,
            animated: true,
            viewPosition: 0.35,
          });
        } catch {
          flatListRef.current.scrollToOffset({
            offset: Math.max(0, targetIndex * 70),
            animated: true,
          });
        }

        const matchedMsg = messages[targetIndex];
        if (matchedMsg) {
          setHighlightedMessageId(matchedMsg.id);
          setTimeout(() => {
            setHighlightedMessageId((curr) => (curr === matchedMsg.id ? null : curr));
          }, 2200);
        }
      }
    },
    [messages],
  );

  // Load chat and messages
  const loadChat = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    try {
      const { chat: activeChat, messages: msgList } = await chatService.getOrCreateChat(
        ownerId,
        contactId,
      );
      setChat(activeChat);
      setMessages(msgList);

      // Mark unread incoming messages as read in Supabase & invalidate TanStack unread query
      await chatService.markMessagesAsRead(activeChat.id);
      queryClient.invalidateQueries({
        queryKey: queryKeys.unreadMessagesCount(ownerId),
      });
    } catch (err) {
      console.warn('Error loading chat:', err);
    } finally {
      setLoading(false);
    }
  }, [ownerId, contactId, queryClient]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  // Subscribe to real-time messages with deduplication & optimistic replacement
  useEffect(() => {
    if (!chat?.id) return;
    const unsubscribe = chatService.subscribeToChat(chat.id, (newMsg) => {
      // Mark as read in real-time if resident is actively inside this chat room
      if (newMsg.sender_role !== 'Pet Owner') {
        chatService.markMessagesAsRead(chat.id);
        queryClient.invalidateQueries({
          queryKey: queryKeys.unreadMessagesCount(ownerId),
        });
      }

      setMessages((prev) => {
        // If updating an existing message (e.g. edited, reacted, or unsent)
        const existingIdx = prev.findIndex((m) => m.id === newMsg.id);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = newMsg;
          return updated;
        }

        // If replacing an optimistic message with same text sent within 10 seconds
        const optIndex = prev.findIndex(
          (m) =>
            m.id.startsWith('temp-') &&
            m.message_text === newMsg.message_text &&
            m.sender_role === newMsg.sender_role,
        );
        if (optIndex !== -1) {
          const updated = [...prev];
          updated[optIndex] = newMsg;
          return updated;
        }

        return [...prev, newMsg];
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });

    return () => {
      unsubscribe();
      if (chat?.id) {
        chatService.markMessagesAsRead(chat.id);
        queryClient.invalidateQueries({
          queryKey: queryKeys.unreadMessagesCount(ownerId),
        });
      }
    };
  }, [chat?.id, ownerId, queryClient]);

  // Android Keyboard height management & layout animation
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardOpen(true);
        if (Platform.OS === 'android') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setAndroidKeyboardHeight(e.endCoordinates.height);
        }
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
      },
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardOpen(false);
        if (Platform.OS === 'android') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setAndroidKeyboardHeight(0);
        }
      },
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSwipeReply = (message: ChatMessage) => {
    haptic.light();
    setReplyingTo(message);
    setEditingMessage(null);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 50);
  };

  /**
   * Toggle 🐾 Paw reaction on bubble click / tap
   */
  const handleToggleReaction = async (message: ChatMessage) => {
    haptic.light();
    const { reactions, imageUrl, replyTo, isUnsent, isEdited } = parseAttachment(message.attachment_url);
    const hasPaw = reactions.includes('🐾');
    const nextReactions = hasPaw ? reactions.filter((r) => r !== '🐾') : [...reactions, '🐾'];
    const nextPayload = JSON.stringify({
      imageUrl,
      replyTo,
      isUnsent,
      isEdited,
      reactions: nextReactions,
    });

    // Optimistic local update
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, attachment_url: nextPayload } : m)),
    );

    try {
      await chatService.toggleReaction(message.id, message.attachment_url, '🐾');
    } catch (e) {
      console.warn('Reaction error:', e);
    }
  };

  /**
   * Start editing a message
   */
  const handleStartEdit = (message: ChatMessage) => {
    haptic.light();
    setSelectedMessageForAction(null);
    setReplyingTo(null);
    setEditingMessage(message);
    setInputText(message.message_text);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 50);
  };

  /**
   * Unsend message
   */
  const handleUnsendMessage = async (message: ChatMessage) => {
    haptic.medium();
    setSelectedMessageForAction(null);

    const updatedAttachment = JSON.stringify({
      ...parseAttachment(message.attachment_url),
      isUnsent: true,
    });

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? { ...m, message_text: '__UNSENT__', attachment_url: updatedAttachment }
          : m,
      ),
    );

    try {
      await chatService.unsendMessage(message.id);
    } catch (err) {
      console.warn('Unsend error:', err);
    }
  };

  /**
   * Real-time instant message send with 0ms optimistic UI update, edit, and reply attachments
   */
    const handleSend = async (textToSend?: string, directAttachmentUrl?: string) => {
      const text = (textToSend !== undefined ? textToSend : inputText).trim();
      const photo = selectedPhoto;

      if (!text && !directAttachmentUrl && !photo) return;
      if (!chat?.id) return;

      haptic.light();

      // 1. If currently editing an existing message
      if (editingMessage) {
        const msgId = editingMessage.id;
        const updatedAttachment = JSON.stringify({
          ...parseAttachment(editingMessage.attachment_url),
          isEdited: true,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, message_text: text, attachment_url: updatedAttachment }
              : m,
          ),
        );

        setInputText('');
        setEditingMessage(null);

        try {
          await chatService.editMessage(msgId, text, editingMessage.attachment_url);
        } catch (e) {
          console.warn('Edit message error:', e);
        }
        return;
      }

      setInputText('');
      setSelectedPhoto(null);

      // Prepare attachment with replyTo and imageUrl payload
      const activeReply = replyingTo;
            const localImageUrl = directAttachmentUrl || (photo ? photo.uri : null);
            const remoteImageUrl =
              directAttachmentUrl ||
              (photo ? (photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri) : null);

            let optimisticAttachmentUrl: string | null = null;
            let persistedAttachmentUrl: string | null = null;

            if(activeReply || localImageUrl) {
              const basePayload: any = {};
        if (activeReply) {
          basePayload.replyTo = {
            id: activeReply.id,
            senderName:
              activeReply.sender_role === 'Pet Owner'
                ? 'You'
                : isVet
                  ? 'Dr. Helen'
                  : contact.displayName,
            text: activeReply.message_text || 'Photo',
      };
    }

    if (localImageUrl) {
      optimisticAttachmentUrl = JSON.stringify({ ...basePayload, imageUrl: localImageUrl });
      persistedAttachmentUrl = JSON.stringify({ ...basePayload, imageUrl: remoteImageUrl });
    } else {
      optimisticAttachmentUrl = JSON.stringify(basePayload);
      persistedAttachmentUrl = JSON.stringify(basePayload);
    }
    setReplyingTo(null);
  }

  // 2. Instant 0ms Optimistic Update
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const optimisticMsg: ChatMessage = {
    id: tempId,
    chat_id: chat.id,
    sender_id: ownerId,
    sender_name: senderName || 'Pet Owner',
    sender_role: 'Pet Owner',
    message_text: text,
    attachment_url: optimisticAttachmentUrl,
    is_read: false,
    created_at: now,
  };

  setMessages((prev) => [...prev, optimisticMsg]);
  setTimeout(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, 30);

  // 3. Background persistence to Supabase
  try {
    const persistedMsg = await chatService.sendMessage(
      chat.id,
      ownerId,
      senderName,
      text,
      persistedAttachmentUrl,
    );

    // Reconcile optimistic message with persisted one
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? persistedMsg : m)),
    );
  } catch (err) {
    console.error('Send message error:', err);
  }
};

const handleThumbsUp = () => {
  handleSend('👍');
};

  const handleOpenPhotoPicker = () => {
    haptic.light();
    setShowPhotoPickerModal(true);
  };

  const handlePickFromCamera = async () => {
    setShowPhotoPickerModal(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera Access Required',
          'Please allow camera access in your settings so you can take and send pet consultation photos.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedPhoto({
          uri: asset.uri,
          base64: asset.base64 || undefined,
        });
        haptic.light();
      }
    } catch (e) {
      console.warn('Camera error:', e);
    }
  };

  const handlePickFromGallery = async () => {
    setShowPhotoPickerModal(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Library Access Required',
          'Please allow photo library access in your settings so you can attach pet photos.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedPhoto({
          uri: asset.uri,
          base64: asset.base64 || undefined,
        });
        haptic.light();
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  const formatMessageTime = (iso: string) => {
    try {
      const d = new Date(iso);
      let hours = d.getHours();
      const mins = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${mins} ${ampm}`;
    } catch {
      return '';
    }
  };

  const formatDateLabel = (iso: string) => {
    try {
      const d = new Date(iso);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const day = d.getDate();
      let hours = d.getHours();
      const mins = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${month} ${day} at ${hours}:${mins} ${ampm}`;
    } catch {
      return '';
    }
  };

  const parseAttachment = (attachment: string | null) => {
    if (!attachment) {
      return {
        imageUrl: null,
        replyTo: null,
        isUnsent: false,
        isEdited: false,
        reactions: [] as string[],
      };
    }
    try {
      const parsed = JSON.parse(attachment);
      return {
        imageUrl: parsed.imageUrl || null,
        replyTo: parsed.replyTo || null,
        isUnsent: Boolean(parsed.isUnsent),
        isEdited: Boolean(parsed.isEdited),
        reactions: (Array.isArray(parsed.reactions) ? parsed.reactions : []) as string[],
      };
    } catch {
      if (
        attachment.startsWith('http') ||
        attachment.startsWith('file:') ||
        attachment.startsWith('data:')
      ) {
        return {
          imageUrl: attachment,
          replyTo: null,
          isUnsent: false,
          isEdited: false,
          reactions: [] as string[],
        };
      }
      return {
        imageUrl: null,
        replyTo: null,
        isUnsent: false,
        isEdited: false,
        reactions: [] as string[],
      };
    }
  };

  return (
    <AnimatedScreen animation="zoom">
      <View style={styles.root}>
        {/* Top Chat Header */}
        <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to Chats"
          >
            <Ionicons name="chevron-back" size={24} color="#1E293B" />
          </Pressable>

          {/* Contact Avatar with Active Dot */}
          <View style={styles.headerAvatarWrap}>
            <Image
              source={avatarSource}
              style={[styles.headerAvatarImg, !isVet && styles.sealAvatarImg]}
              resizeMode={isVet ? 'cover' : 'contain'}
            />
            <View style={styles.headerActiveDot} />
          </View>

          {/* Header Contact Details */}
          <View style={styles.headerTextCol}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitleText} numberOfLines={1}>
                {isVet ? 'Dr. Helen Ann P. Tacando...' : 'CVO Inquiry & Admin Desk'}
              </Text>
              <View style={styles.activePillRow}>
                <View style={styles.activeDotInline} />
                <Text style={styles.activeNowText}>Active now</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitleText} numberOfLines={1}>
              {isVet
                ? 'City Veterinary Office (CVO) • Telemedicine clinical ...'
                : 'City Veterinary Office (CVO) • Public Admin Desk'}
            </Text>
          </View>
        </View>

        {/* Loading State with Realistic Shimmering Chat Skeleton */}
        {loading ? (
          <ChatMessageListSkeleton />
        ) : (
          <KeyboardAvoidingView
            style={[
              styles.keyboardContainer,
              Platform.OS === 'android' && { paddingBottom: androidKeyboardHeight },
            ]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 16) + 52 : 0}
          >
            {/* Messages List */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesListContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onContentSizeChange={() => {
                if (!highlightedMessageId) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }}
              onScrollToIndexFailed={(info) => {
                flatListRef.current?.scrollToOffset({
                  offset: Math.max(0, info.index * 65),
                  animated: true,
                });
              }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.profileIntroCard}>
                  <View style={styles.largeAvatarWrap}>
                    <Image
                      source={avatarSource}
                      style={[styles.largeAvatarImg, !isVet && styles.sealAvatarImg]}
                      resizeMode={isVet ? 'cover' : 'contain'}
                    />
                  </View>

                  <Text style={styles.largeIntroName}>
                    {isVet ? 'Dr. Helen Ann P. Tacandong, DVM' : 'CVO Inquiry & Admin Desk'}
                  </Text>
                  <Text style={styles.largeIntroRole}>
                    {isVet
                      ? 'City Veterinary Office (CVO) • Telemedicine clinical guidance desk'
                      : 'City Veterinary Office (CVO) • Municipal Public Desk'}
                  </Text>
                  <Text style={styles.largeIntroNotice}>
                    {isVet
                      ? "You're connected on City Veterinary Office Official Telemedicine Channel."
                      : "You're connected on City Veterinary Office Public Citizen Channel."}
                  </Text>

                  <View style={styles.introDivider} />

                  {/* Initial Date Stamp */}
                  <View style={styles.dateStampPill}>
                    <Text style={styles.dateStampText}>
                      {messages.length > 0
                        ? formatDateLabel(messages[0].created_at)
                        : 'Today'}
                    </Text>
                  </View>
                </View>
              }
              renderItem={({ item, index }) => {
                const isResident = item.sender_role === 'Pet Owner';
                const { imageUrl, replyTo, isUnsent, isEdited, reactions } = parseAttachment(
                  item.attachment_url,
                );
                const isThumbsUp = item.message_text === '👍' && !imageUrl && !isUnsent;
                const hasPawReaction = reactions.includes('🐾');

                // Grouping logic for consecutive messages
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

                const isPrevSameSender =
                  prevMsg &&
                  prevMsg.sender_role === item.sender_role &&
                  prevMsg.sender_name === item.sender_name &&
                  new Date(item.created_at).getTime() - new Date(prevMsg.created_at).getTime() <
                  5 * 60 * 1000;

                const isNextSameSender =
                  nextMsg &&
                  nextMsg.sender_role === item.sender_role &&
                  nextMsg.sender_name === item.sender_name &&
                  new Date(nextMsg.created_at).getTime() - new Date(item.created_at).getTime() <
                  5 * 60 * 1000;

                const isFirstInGroup = !isPrevSameSender;
                const isLastInGroup = !isNextSameSender;

                // Check if we should render a date separator between distinct calendar days
                const showDateSeparator =
                  prevMsg &&
                  new Date(item.created_at).getDate() !== new Date(prevMsg.created_at).getDate();

                // Dynamic corner styling for tight Messenger message grouping
                const residentCornerStyle = {
                  borderTopRightRadius: isFirstInGroup ? 18 : 4,
                  borderBottomRightRadius: isLastInGroup ? 18 : 4,
                  borderTopLeftRadius: 18,
                  borderBottomLeftRadius: 18,
                };

                const staffCornerStyle = {
                  borderTopLeftRadius: isFirstInGroup ? 18 : 4,
                  borderBottomLeftRadius: isLastInGroup ? 18 : 4,
                  borderTopRightRadius: 18,
                  borderBottomRightRadius: 18,
                };

                // Unsent message styling
                if (isUnsent || item.message_text === '__UNSENT__') {
                  return (
                    <View
                      style={[
                        isResident ? styles.residentRow : styles.staffRow,
                        { marginBottom: isLastInGroup ? 8 : 2 },
                      ]}
                    >
                      <View
                        style={[
                          isResident ? styles.residentUnsentBubble : styles.staffUnsentBubble,
                        ]}
                      >
                        <Text style={styles.unsentText}>
                          {isResident ? 'You unsent a message' : 'Message unsent'}
                        </Text>
                      </View>
                    </View>
                  );
                }

                return (
                  <View>
                    {showDateSeparator ? (
                      <View style={styles.dateStampPill}>
                        <Text style={styles.dateStampText}>
                          {formatDateLabel(item.created_at)}
                        </Text>
                      </View>
                    ) : null}

                    <SwipeableMessage
                      isResident={isResident}
                      onSwipeReply={() => handleSwipeReply(item)}
                    >
                      {isResident ? (
                        /* Resident Message (Right-aligned) */
                        <View
                          style={[
                            styles.residentRow,
                            { marginBottom: isLastInGroup ? 8 : 2 },
                            highlightedMessageId === item.id && styles.highlightedRow,
                          ]}
                        >
                          <View style={styles.residentBubbleCol}>
                            {/* Reply Quote Badge - Tap to scroll up to replied message */}
                            {replyTo ? (
                              <Pressable
                                onPress={() => handleScrollToRepliedMessage(replyTo.id, replyTo.text)}
                                style={({ pressed }) => [
                                  styles.replyQuoteWrap,
                                  pressed && styles.replyQuoteWrapPressed,
                                ]}
                                hitSlop={6}
                                accessibilityRole="button"
                                accessibilityLabel={`Jump to replied message: ${replyTo.text}`}
                              >
                                <Text style={styles.replyToLabel}>
                                  You replied to {replyTo.senderName || 'Staff'} →
                                </Text>
                                <View style={styles.replyQuoteBubble}>
                                  <Text style={styles.replyQuoteText} numberOfLines={1}>
                                    {replyTo.text}
                                  </Text>
                                </View>
                              </Pressable>
                            ) : null}

                            {imageUrl ? (
                              <View style={styles.bubbleReactionWrapper}>
                                <Pressable
                                  onPress={() => setFullscreenImage({ url: imageUrl, message: item })}
                                  onLongPress={() => {
                                    haptic.medium();
                                    setSelectedMessageForAction(item);
                                  }}
                                  delayLongPress={300}
                                  style={styles.imageBubbleWrap}
                                >
                                  <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.attachedImage}
                                    resizeMode="cover"
                                  />
                                </Pressable>
                                  {!item.message_text && hasPawReaction ? (
                                <Pressable
                                  onPress={() => handleToggleReaction(item)}
                                  style={[styles.reactionBadge, styles.reactionBadgeResident]}
                                  hitSlop={6}
                                >
                                  <Ionicons name="paw" size={13} color="#059669" />
                                </Pressable>
                                ) : null}
                              </View>
                            ) : null}

                            {isThumbsUp ? (
                              /* Standalone Large Green Thumbs Up */
                              <View style={styles.bubbleReactionWrapper}>
                                <Pressable
                                  onPress={() => handleToggleReaction(item)}
                                  onLongPress={() => {
                                    haptic.medium();
                                    setSelectedMessageForAction(item);
                                  }}
                                  delayLongPress={300}
                                  style={styles.standaloneThumbsUpWrap}
                                >
                                  <Ionicons name="thumbs-up" size={38} color="#059669" />
                                </Pressable>
                                {hasPawReaction ? (
                                  <Pressable
                                    onPress={() => handleToggleReaction(item)}
                                    style={[styles.reactionBadge, styles.reactionBadgeResident]}
                                    hitSlop={6}
                                  >
                                    <Ionicons name="paw" size={13} color="#059669" />
                                  </Pressable>
                                ) : null}
                              </View>
                            ) : item.message_text ? (
                              /* Resident Bubble with Tap-to-React & Long-press */
                              <View style={styles.bubbleReactionWrapper}>
                                <Pressable
                                  onPress={() => handleToggleReaction(item)}
                                  onLongPress={() => {
                                    haptic.medium();
                                    setSelectedMessageForAction(item);
                                  }}
                                  delayLongPress={300}
                                  style={[
                                    styles.residentBubble,
                                    residentCornerStyle,
                                    imageUrl ? styles.residentBubbleWithImage : null,
                                    highlightedMessageId === item.id && styles.highlightedBubbleResident,
                                  ]}
                                >
                                  <Text style={styles.residentText}>{item.message_text}</Text>
                                </Pressable>

                                {/* 🐾 Paw Reaction Badge */}
                                {hasPawReaction ? (
                                  <Pressable
                                    onPress={() => handleToggleReaction(item)}
                                    style={[styles.reactionBadge, styles.reactionBadgeResident]}
                                    hitSlop={6}
                                  >
                                    <Ionicons name="paw" size={13} color="#059669" />
                                  </Pressable>
                                ) : null}
                              </View>
                            ) : null}

                            {/* Timestamp & Meta only on the last message of the group */}
                            {isLastInGroup ? (
                              <View style={styles.residentMetaRow}>
                                {isEdited ? (
                                  <Text style={styles.editedLabel}>(edited)</Text>
                                ) : null}
                                <Text style={styles.residentTimeText}>
                                  {formatMessageTime(item.created_at)}
                                </Text>
                                <Ionicons name="checkmark-done" size={13} color="#059669" />
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ) : (
                        /* Staff Message (Left-aligned) */
                        <View
                          style={[
                            styles.staffRow,
                            { marginBottom: isLastInGroup ? 8 : 2 },
                            highlightedMessageId === item.id && styles.highlightedRow,
                          ]}
                        >
                          {/* Avatar only on the last message of cluster; empty spacer on earlier to maintain alignment */}
                          <View style={styles.staffAvatarWrap}>
                            {isLastInGroup ? (
                              <Image
                                source={avatarSource}
                                style={[styles.staffAvatarImg, !isVet && styles.sealAvatarImg]}
                                resizeMode={isVet ? 'cover' : 'contain'}
                              />
                            ) : (
                              <View style={styles.avatarSpacer} />
                            )}
                          </View>

                          <View style={styles.staffBubbleCol}>
                            {/* Sender name ONLY displayed ONCE at the top of the group */}
                            {isFirstInGroup ? (
                              <View style={styles.staffSenderHeader}>
                                <Text style={styles.staffSenderName}>
                                  {isVet ? 'Dr. Helen' : contact.displayName}
                                </Text>
                                <View style={styles.vetRoleBadge}>
                                  <Text style={styles.vetRoleBadgeText}>
                                    {isVet ? 'Veterinarian' : 'Administrator'}
                                  </Text>
                                </View>
                              </View>
                            ) : null}

                            {/* Reply Quote Badge - Tap to scroll up to replied message */}
                            {replyTo ? (
                              <Pressable
                                onPress={() => handleScrollToRepliedMessage(replyTo.id, replyTo.text)}
                                style={({ pressed }) => [
                                  styles.replyQuoteWrapStaff,
                                  pressed && styles.replyQuoteWrapPressed,
                                ]}
                                hitSlop={6}
                                accessibilityRole="button"
                                accessibilityLabel={`Jump to replied message: ${replyTo.text}`}
                              >
                                <Text style={styles.replyToLabel}>
                                  Replied to {replyTo.senderName || 'You'} →
                                </Text>
                                <View style={styles.replyQuoteBubbleStaff}>
                                  <Text style={styles.replyQuoteText} numberOfLines={1}>
                                    {replyTo.text}
                                  </Text>
                                </View>
                              </Pressable>
                            ) : null}

                            {imageUrl ? (
                              <View style={styles.bubbleReactionWrapper}>
                                <Pressable
                                  onPress={() => setFullscreenImage({ url: imageUrl, message: item })}
                                  onLongPress={() => {
                                    haptic.medium();
                                    setSelectedMessageForAction(item);
                                  }}
                                  delayLongPress={300}
                                  style={styles.imageBubbleWrap}
                                >
                                  <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.attachedImage}
                                    resizeMode="cover"
                                  />
                                </Pressable>
                                  {!item.message_text && hasPawReaction ? (
                                <Pressable
                                  onPress={() => handleToggleReaction(item)}
                                  style={[styles.reactionBadge, styles.reactionBadgeStaff]}
                                  hitSlop={6}
                                >
                                  <Ionicons name="paw" size={13} color="#059669" />
                                </Pressable>
                                ) : null}
                              </View>
                            ) : null}

                            {isThumbsUp ? (
                              /* Standalone Large Green Thumbs Up */
                              <View style={styles.bubbleReactionWrapper}>
                                <Pressable
                                  onPress={() => handleToggleReaction(item)}
                                  onLongPress={() => {
                                    haptic.medium();
                                    setSelectedMessageForAction(item);
                                  }}
                                  delayLongPress={300}
                                  style={styles.standaloneThumbsUpWrapStaff}
                                >
                                  <Ionicons name="thumbs-up" size={38} color="#059669" />
                                </Pressable>
                                {hasPawReaction ? (
                                  <Pressable
                                    onPress={() => handleToggleReaction(item)}
                                    style={[styles.reactionBadge, styles.reactionBadgeStaff]}
                                    hitSlop={6}
                                  >
                                    <Ionicons name="paw" size={13} color="#059669" />
                                  </Pressable>
                                ) : null}
                              </View>
                            ) : item.message_text ? (
                              /* Staff Bubble with Tap-to-React & Long-press */
                              <View style={styles.bubbleReactionWrapper}>
                                <Pressable
                                  onPress={() => handleToggleReaction(item)}
                                  onLongPress={() => {
                                    haptic.medium();
                                    setSelectedMessageForAction(item);
                                  }}
                                  delayLongPress={300}
                                  style={[
                                    styles.staffBubble,
                                    staffCornerStyle,
                                    imageUrl ? styles.staffBubbleWithImage : null,
                                    highlightedMessageId === item.id && styles.highlightedBubbleStaff,
                                  ]}
                                >
                                  <Text style={styles.staffText}>{item.message_text}</Text>
                                </Pressable>

                                {/* 🐾 Paw Reaction Badge */}
                                {hasPawReaction ? (
                                  <Pressable
                                    onPress={() => handleToggleReaction(item)}
                                    style={[styles.reactionBadge, styles.reactionBadgeStaff]}
                                    hitSlop={6}
                                  >
                                    <Ionicons name="paw" size={13} color="#059669" />
                                  </Pressable>
                                ) : null}
                              </View>
                            ) : null}

                            {/* Timestamp only on the last message of the group */}
                            {isLastInGroup ? (
                              <View style={styles.staffMetaRow}>
                                {isEdited ? (
                                  <Text style={styles.editedLabel}>(edited)</Text>
                                ) : null}
                                <Text style={styles.staffTimeText}>
                                  {formatMessageTime(item.created_at)}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      )}
                    </SwipeableMessage>
                  </View>
                );
              }}
              ListFooterComponent={
                <TypingIndicator
                  visible={isTyping}
                  senderName={isVet ? 'Dr. Helen' : 'CVO Admin'}
                  role={isVet ? 'Veterinarian' : 'Administrator'}
                  avatarSource={avatarSource}
                  themeColor="#059669"
                />
              }
            />

            {/* Quick Consultation Suggestions Bar (Collapsible) */}
            {showTemplates ? (
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                  <Text style={styles.suggestionsHeaderTitle}>Common Inquiries</Text>
                  <Pressable onPress={() => setShowTemplates(false)} hitSlop={6}>
                    <Ionicons name="close-circle" size={18} color="#64748B" />
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsScroll}
                >
                  {SUGGESTIONS[contactId].map((chip, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        setShowTemplates(false);
                        handleSend(chip);
                      }}
                      style={styles.suggestionChip}
                    >
                      <Text style={styles.suggestionText}>{chip}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Replying To Banner Preview (Above Composer) */}
            {replyingTo ? (
              <View style={styles.replyingBarContainer}>
                <View style={styles.replyingBarAccent} />
                <View style={styles.replyingBarContent}>
                  <Text style={styles.replyingBarTitle}>
                    Replying to{' '}
                    <Text style={styles.replyingBarTarget}>
                      {replyingTo.sender_role === 'Pet Owner'
                        ? 'yourself'
                        : isVet
                          ? 'Dr. Helen'
                          : contact.displayName}
                    </Text>
                  </Text>
                  <Text style={styles.replyingBarSnippet} numberOfLines={1}>
                    {replyingTo.message_text || (replyingTo.attachment_url ? 'Photo' : 'Message')}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setReplyingTo(null)}
                  style={styles.replyingBarClose}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel reply"
                >
                  <Ionicons name="close-circle" size={20} color="#64748B" />
                </Pressable>
              </View>
            ) : null}

            {/* Editing Message Banner Preview (Above Composer) */}
            {editingMessage ? (
              <View style={[styles.replyingBarContainer, styles.editingBarContainer]}>
                <View style={[styles.replyingBarAccent, styles.editingBarAccent]} />
                <View style={styles.replyingBarContent}>
                  <Text style={[styles.replyingBarTitle, styles.editingBarTitle]}>
                    Editing Message
                  </Text>
                  <Text style={styles.replyingBarSnippet} numberOfLines={1}>
                    {editingMessage.message_text}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEditingMessage(null);
                    setInputText('');
                  }}
                  style={styles.replyingBarClose}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel edit"
                >
                  <Ionicons name="close-circle" size={20} color="#64748B" />
                </Pressable>
              </View>
            ) : null}

            {/* Selected Photo Attachment Preview (Above Composer) */}
            {selectedPhoto ? (
              <View style={styles.photoPreviewBar}>
                <View style={styles.photoPreviewThumbWrap}>
                  <Image source={{ uri: selectedPhoto.uri }} style={styles.photoPreviewThumb} />
                  <Pressable
                    onPress={() => setSelectedPhoto(null)}
                    style={styles.photoPreviewRemoveBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                  >
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View style={styles.photoPreviewInfo}>
                  <Text style={styles.photoPreviewTitle}>Photo attached</Text>
                  <Text style={styles.photoPreviewHint}>Type an optional caption or tap Send</Text>
                </View>
              </View>
            ) : null}

            {/* Bottom Composer Bar */}
            <View
              style={[
                styles.composerRoot,
                {
                  paddingBottom: isKeyboardOpen
                    ? 8
                    : Math.max(insets.bottom, 12),
                },
              ]}
            >
              {/* Photo / Image attachment button */}
              <Pressable
                onPress={handleOpenPhotoPicker}
                style={styles.composerIconBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Attach Photo"
              >
                <Ionicons
                  name={selectedPhoto ? 'image' : 'image-outline'}
                  size={24}
                  color={selectedPhoto ? '#059669' : '#64748B'}
                />
              </Pressable>

              {/* Text Input Pill with increased height & comfortable padding */}
              <View style={styles.inputPill}>
                <TextInput
                  ref={textInputRef}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={
                    selectedPhoto
                      ? 'Add a caption...'
                      : editingMessage
                        ? 'Edit your message...'
                        : 'Aa'
                  }
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                  multiline
                  maxLength={1000}
                />
              </View>

              {/* Right Action: Thumbs Up 👍 or Send / Save */}
                {
                  inputText.trim().length > 0 || selectedPhoto !== null ? (
                    <Pressable
                      onPress={() => handleSend()}
                      style={styles.sendActionBtn}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={editingMessage ? 'Save Edit' : 'Send Message'}
                    >
                      <Ionicons
                        name={editingMessage ? 'checkmark-circle' : 'send'}
                        size={24}
                        color="#059669"
                      />
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handleThumbsUp}
                      style={styles.thumbsUpBtn}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="Send Thumbs Up"
                    >
                      <Ionicons name="thumbs-up" size={26} color="#059669" />
                    </Pressable>
                  )
                }
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Long-Press Message Actions Modal */}
        <Modal
          visible={Boolean(selectedMessageForAction)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedMessageForAction(null)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSelectedMessageForAction(null)}
          >
            <View style={styles.actionSheetContainer}>
              {/* Header preview */}
              {selectedMessageForAction ? (
                <View style={styles.actionSheetHeader}>
                  <Text style={styles.actionSheetQuoteTitle}>Message Action</Text>
                  <Text style={styles.actionSheetQuoteSnippet} numberOfLines={2}>
                    {selectedMessageForAction.message_text || 'Photo attachment'}
                  </Text>
                </View>
              ) : null}

              {/* Options */}
              <View style={styles.actionSheetOptions}>
                {/* 🐾 React with Paw */}
                <Pressable
                  style={styles.actionOptionBtn}
                  onPress={() => {
                    if (selectedMessageForAction) {
                      handleToggleReaction(selectedMessageForAction);
                      setSelectedMessageForAction(null);
                    }
                  }}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="paw" size={18} color="#059669" />
                  </View>
                  <Text style={styles.actionOptionText}>React with Paw 🐾</Text>
                </Pressable>

                {/* ↩️ Reply */}
                <Pressable
                  style={styles.actionOptionBtn}
                  onPress={() => {
                    if (selectedMessageForAction) {
                      handleSwipeReply(selectedMessageForAction);
                      setSelectedMessageForAction(null);
                    }
                  }}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons name="arrow-undo" size={18} color="#0F172A" />
                  </View>
                  <Text style={styles.actionOptionText}>Reply</Text>
                </Pressable>

                {/* If Own Message: Edit & Unsend */}
                {selectedMessageForAction?.sender_role === 'Pet Owner' ? (
                  <>
                    <Pressable
                      style={styles.actionOptionBtn}
                      onPress={() => {
                        if (selectedMessageForAction) {
                          handleStartEdit(selectedMessageForAction);
                        }
                      }}
                    >
                      <View style={[styles.actionIconWrap, { backgroundColor: '#E0F2FE' }]}>
                        <Ionicons name="pencil" size={18} color="#0284C7" />
                      </View>
                      <Text style={styles.actionOptionText}>Edit Message</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.actionOptionBtn, styles.actionOptionBtnDanger]}
                      onPress={() => {
                        if (selectedMessageForAction) {
                          handleUnsendMessage(selectedMessageForAction);
                        }
                      }}
                    >
                      <View style={[styles.actionIconWrap, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      </View>
                      <Text style={[styles.actionOptionText, { color: '#DC2626' }]}>
                        Unsend Message
                      </Text>
                    </Pressable>
                  </>
                ) : null}
              </View>

              {/* Cancel Button */}
              <Pressable
                style={styles.actionCancelBtn}
                onPress={() => setSelectedMessageForAction(null)}
              >
                <Text style={styles.actionCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Fullscreen Photo Lightbox Modal */}
        <Modal
          visible={Boolean(fullscreenImage)}
          transparent
          animationType="fade"
          onRequestClose={() => setFullscreenImage(null)}
        >
          <View style={styles.lightboxRoot}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.lightboxHeader}>
              <Pressable
                onPress={() => setFullscreenImage(null)}
                style={styles.lightboxCloseBtn}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close photo viewer"
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.lightboxTitle} numberOfLines={1}>
                {fullscreenImage?.message.sender_name || 'Photo'}
              </Text>
              {fullscreenImage?.message ? (
                <Pressable
                  onPress={() => {
                    handleToggleReaction(fullscreenImage.message);
                  }}
                  style={styles.lightboxActionBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="React to photo"
                >
                  <Ionicons name="paw" size={20} color="#10B981" />
                </Pressable>
              ) : (
                <View style={{ width: 40 }} />
              )}
            </SafeAreaView>

            <View style={styles.lightboxBody}>
              {fullscreenImage?.url ? (
                <Image
                  source={{ uri: fullscreenImage.url }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          </View>
        </Modal>

        {/* Photo Picker Choice Modal (Camera vs Gallery) */}
        <Modal
          visible={showPhotoPickerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPhotoPickerModal(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowPhotoPickerModal(false)}
          >
            <View style={styles.pickerModalCard}>
              <View style={styles.modalDragHandle} />
              <Text style={styles.pickerModalTitle}>Attach a Photo</Text>
              <Text style={styles.pickerModalSub}>
                Share clear photos of your pet for clinical veterinary guidance
              </Text>

              <Pressable
                style={styles.pickerOptionRow}
                onPress={handlePickFromCamera}
              >
                <View style={[styles.pickerOptionIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="camera" size={22} color="#059669" />
                </View>
                <View style={styles.pickerOptionTextWrap}>
                  <Text style={styles.pickerOptionTitle}>Take Photo</Text>
                  <Text style={styles.pickerOptionDesc}>Use camera to capture right now</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </Pressable>

              <Pressable
                style={styles.pickerOptionRow}
                onPress={handlePickFromGallery}
              >
                <View style={[styles.pickerOptionIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="images" size={22} color="#2563EB" />
                </View>
                <View style={styles.pickerOptionTextWrap}>
                  <Text style={styles.pickerOptionTitle}>Choose from Gallery</Text>
                  <Text style={styles.pickerOptionDesc}>Select from your photos</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </Pressable>

              <Pressable
                style={styles.pickerCancelBtn}
                onPress={() => setShowPhotoPickerModal(false)}
              >
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerAvatarWrap: {
    position: 'relative',
    width: 38,
    height: 38,
    marginRight: 10,
  },
  headerAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
  },
  sealAvatarImg: {
    backgroundColor: '#FFFFFF',
  },
  headerActiveDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  activePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeDotInline: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeNowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  headerSubtitleText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingSub: {
    fontSize: 13,
    color: '#64748B',
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesListContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  profileIntroCard: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 8,
  },
  largeAvatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#A7F3D0',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  largeAvatarImg: {
    width: 84,
    height: 84,
  },
  largeIntroName: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  largeIntroRole: {
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'center',
    marginTop: 3,
  },
  largeIntroNotice: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  introDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  dateStampPill: {
    alignSelf: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 10,
  },
  dateStampText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  swipeableContainer: {
    position: 'relative',
    width: '100%',
  },
  replyIndicatorRight: {
    position: 'absolute',
    right: 6,
    top: '50%',
    marginTop: -16,
    zIndex: 1,
  },
  replyIndicatorLeft: {
    position: 'absolute',
    left: 6,
    top: '50%',
    marginTop: -16,
    zIndex: 1,
  },
  replyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  residentRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  residentBubbleCol: {
    alignItems: 'flex-end',
    maxWidth: '78%',
  },
  bubbleReactionWrapper: {
    position: 'relative',
  },
  residentBubble: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  residentText: {
    fontSize: 14.5,
    color: '#FFFFFF',
    lineHeight: 20,
    fontWeight: '500',
  },
  reactionBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
    ...shadows.sm,
    zIndex: 3,
  },
  reactionBadgeResident: {
    left: 4,
  },
  reactionBadgeStaff: {
    right: 4,
  },
  standaloneThumbsUpWrap: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  residentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  editedLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  residentTimeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  staffAvatarWrap: {
    width: 28,
    height: 28,
    marginBottom: 2,
  },
  staffAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  avatarSpacer: {
    width: 28,
    height: 28,
  },
  staffBubbleCol: {
    maxWidth: '78%',
    alignItems: 'flex-start',
  },
  staffSenderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  staffSenderName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  vetRoleBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  vetRoleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  staffBubble: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  staffText: {
    fontSize: 14.5,
    color: '#0F172A',
    lineHeight: 20,
  },
  standaloneThumbsUpWrapStaff: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  staffMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  staffTimeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  residentUnsentBubble: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  staffUnsentBubble: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  unsentText: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  replyQuoteWrap: {
    alignItems: 'flex-end',
    marginBottom: 3,
  },
  replyQuoteWrapStaff: {
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  replyQuoteWrapPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.98 }],
  },
  highlightedRow: {
    backgroundColor: 'rgba(13, 148, 136, 0.14)',
    borderRadius: 14,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  highlightedBubbleResident: {
    borderWidth: 2,
    borderColor: '#047857',
    transform: [{ scale: 1.02 }],
  },
  highlightedBubbleStaff: {
    borderWidth: 2,
    borderColor: '#0D9488',
    backgroundColor: '#E6FFFA',
    transform: [{ scale: 1.02 }],
  },
  replyToLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  replyQuoteBubble: {
    backgroundColor: '#F1F5F9',
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 220,
  },
  replyQuoteBubbleStaff: {
    backgroundColor: '#F1F5F9',
    borderLeftWidth: 3,
    borderLeftColor: '#94A3B8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 220,
  },
  replyQuoteText: {
    fontSize: 11.5,
    color: '#475569',
    fontStyle: 'italic',
  },
  imageBubbleWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    ...shadows.sm,
  },
  attachedImage: {
    width: 250,
    height: 200,
    borderRadius: 16,
  },
  residentBubbleWithImage: {
    marginTop: 3,
    borderTopRightRadius: 6,
    borderTopLeftRadius: 18,
  },
  staffBubbleWithImage: {
    marginTop: 3,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 18,
  },
  suggestionsContainer: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    paddingBottom: 6,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  suggestionsHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...shadows.sm,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  replyingBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  editingBarContainer: {
    backgroundColor: '#F0F9FF',
    borderTopColor: '#BAE6FD',
  },
  replyingBarAccent: {
    width: 3.5,
    height: 32,
    borderRadius: 2,
    backgroundColor: '#059669',
  },
  editingBarAccent: {
    backgroundColor: '#0284C7',
  },
  replyingBarContent: {
    flex: 1,
  },
  replyingBarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  editingBarTitle: {
    color: '#0284C7',
  },
  replyingBarTarget: {
    color: '#0F172A',
  },
  replyingBarSnippet: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 1,
  },
  replyingBarClose: {
    padding: 4,
  },
  composerRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  composerIconBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    minHeight: 46,
  },
  textInput: {
    flex: 1,
    fontSize: 15.5,
    color: '#0F172A',
    minHeight: 28,
    maxHeight: 110,
    paddingVertical: 0,
    lineHeight: 21,
  },
  sendActionBtn: {
    padding: 6,
  },
  thumbsUpBtn: {
    padding: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  actionSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    ...shadows.lg,
  },
  actionSheetHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  actionSheetQuoteTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  actionSheetQuoteSnippet: {
    fontSize: 13.5,
    color: '#0F172A',
    fontStyle: 'italic',
    marginTop: 3,
  },
  actionSheetOptions: {
    gap: 8,
  },
  actionOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  actionOptionBtnDanger: {
    backgroundColor: '#FEF2F2',
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOptionText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginTop: 4,
  },
  actionCancelText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#64748B',
  },
  /* Photo Preview Bar above composer */
  photoPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  photoPreviewThumbWrap: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  photoPreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  photoPreviewRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  photoPreviewInfo: {
    flex: 1,
  },
  photoPreviewTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  photoPreviewHint: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  /* Photo Picker Bottom Modal */
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 6,
  },
  pickerModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    ...shadows.lg,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  pickerModalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
    gap: 12,
  },
  pickerOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionTextWrap: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  pickerOptionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  pickerCancelBtn: {
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  pickerCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  /* Fullscreen Photo Lightbox */
  lightboxRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
  },
  lightboxCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  lightboxActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
});
