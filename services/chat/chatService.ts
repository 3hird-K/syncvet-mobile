import { supabase } from '@lib/supabase';
import { generateUUID } from '@lib/uuid';

export interface OfficialContact {
  id: 'vet-hellen' | 'cvo-admin';
  assignedVetName: string;
  displayName: string;
  role: string;
  badge: string;
  subject: string;
  avatarIcon: string;
  themeColor: string;
  status: 'online' | 'offline';
  defaultGreeting: string;
}

export const OFFICIAL_CONTACTS: Record<string, OfficialContact> = {
  'vet-hellen': {
    id: 'vet-hellen',
    assignedVetName: 'Dr. Helen Ann P. Tacandong, DVM',
    displayName: 'Dr. Helen Ann Tacandong',
    role: 'City Veterinarian',
    badge: 'Municipal Vet Officer',
    subject: 'Veterinary Telemedicine Consultation',
    avatarIcon: 'medical',
    themeColor: '#0D9488',
    status: 'online',
    defaultGreeting:
      "Hello! I'm Dr. Helen Ann Tacandong, your City Veterinarian. How is your companion feeling today? You can ask me about symptoms, immunization guidelines, or pre-surgery prep.",
  },
  'cvo-admin': {
    id: 'cvo-admin',
    assignedVetName: 'CVO Inquiry & Admin Desk',
    displayName: 'CVO Admin Desk',
    role: 'Municipal Public Desk',
    badge: 'LGU Support',
    subject: 'CVO Inquiry & Admin Desk',
    avatarIcon: 'business',
    themeColor: '#2563EB',
    status: 'online',
    defaultGreeting:
      'Welcome to the City Veterinary Office Citizen Desk! How can we assist you today? We can assist with clinic operating hours, barangay rabies outreach schedules, and pet registration.',
  },
};

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_role: 'Pet Owner' | 'Staff' | 'Veterinarian' | 'Administrator';
  message_text: string;
  is_read: boolean;
  attachment_url: string | null;
  created_at: string;
}

export interface ChatThread {
  id: string;
  owner_id: string;
  assigned_vet_name: string;
  subject: string;
  status: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export class ChatService {
  /**
   * Get existing chat thread with an official contact or create one with the initial greeting.
   */
  async getOrCreateChat(
    ownerId: string,
    contactId: 'vet-hellen' | 'cvo-admin',
  ): Promise<{ chat: ChatThread; messages: ChatMessage[] }> {
    const contact = OFFICIAL_CONTACTS[contactId];
    if (!contact) {
      throw new Error(`Unknown contact id: ${contactId}`);
    }

    // 1. Check if chat already exists in Supabase
    const { data: existingChats, error: fetchErr } = await supabase
      .from('chats')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('assigned_vet_name', contact.assignedVetName)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.warn('Error checking existing chat in Supabase:', fetchErr.message);
    }

    let chat: ChatThread;

    if (existingChats && existingChats.length > 0) {
      chat = existingChats[0] as ChatThread;
    } else {
      // Create new chat row
      const now = new Date().toISOString();
      const newChatId = generateUUID();

      const { data: createdChat, error: createErr } = await supabase
        .from('chats')
        .insert({
          id: newChatId,
          owner_id: ownerId,
          assigned_vet_name: contact.assignedVetName,
          subject: contact.subject,
          status: 'open',
          last_message: contact.defaultGreeting,
          last_message_at: now,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (createErr) {
        console.error('Error creating chat thread:', createErr.message);
        // Fallback local chat object
        chat = {
          id: newChatId,
          owner_id: ownerId,
          assigned_vet_name: contact.assignedVetName,
          subject: contact.subject,
          status: 'open',
          last_message: contact.defaultGreeting,
          last_message_at: now,
          created_at: now,
          updated_at: now,
        };
      } else {
        chat = createdChat as ChatThread;
      }

      // Insert initial greeting message
      const greetingMsgId = generateUUID();
      await supabase.from('chat_messages').insert({
        id: greetingMsgId,
        chat_id: chat.id,
        sender_id: contactId === 'vet-hellen' ? 'staff_vet_hellen' : 'staff_cvo_admin',
        sender_name: contact.displayName,
        sender_role: contactId === 'vet-hellen' ? 'Veterinarian' : 'Administrator',
        message_text: contact.defaultGreeting,
        is_read: true,
        created_at: now,
      });
    }

    // 2. Fetch all messages for this chat
    const { data: messages, error: msgErr } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });

    if (msgErr) {
      console.warn('Error fetching chat messages:', msgErr.message);
      return { chat, messages: [] };
    }

    return { chat, messages: (messages || []) as ChatMessage[] };
  }

  /**
   * Fetch all active chat threads for resident
   */
  async getResidentChats(ownerId: string): Promise<ChatThread[]> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('owner_id', ownerId)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.warn('Error fetching resident chats:', error.message);
      return [];
    }

    return (data || []) as ChatThread[];
  }

  /**
   * Get unread messages count for a resident across all their chats
   */
  async getUnreadMessagesCount(ownerId: string): Promise<number> {
    if (!ownerId) return 0;
    try {
      // 1. Get all chat IDs belonging to this resident
      const { data: chats, error: chatErr } = await supabase
        .from('chats')
        .select('id')
        .eq('owner_id', ownerId);

      if (chatErr) {
        console.warn('Error fetching chats for unread count:', chatErr.message);
        return 0;
      }

      if (!chats || chats.length === 0) return 0;

      const chatIds = chats.map((c) => c.id);

      // 2. Count unread messages not sent by Pet Owner
      const { count, error: msgErr } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('chat_id', chatIds)
        .neq('sender_role', 'Pet Owner')
        .eq('is_read', false);

      if (msgErr) {
        console.warn('Error counting unread messages:', msgErr.message);
        return 0;
      }

      return count ?? 0;
    } catch (err) {
      console.warn('Error in getUnreadMessagesCount:', err);
      return 0;
    }
  }

  /**
   * Mark all unread incoming messages in a chat as read
   */
  async markMessagesAsRead(chatId: string): Promise<void> {
    if (!chatId) return;
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('sender_role', 'Pet Owner')
        .eq('is_read', false);

      if (error) {
        console.warn('Error marking messages as read in Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Error in markMessagesAsRead:', err);
    }
  }

  /**
   * Send a message from resident
   */
  async sendMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    text: string,
    attachmentUrl?: string | null,
  ): Promise<ChatMessage> {
    const now = new Date().toISOString();
    const msgId = generateUUID();

    const newMsg: ChatMessage = {
      id: msgId,
      chat_id: chatId,
      sender_id: senderId,
      sender_name: senderName || 'Pet Owner',
      sender_role: 'Pet Owner',
      message_text: text,
      is_read: false,
      attachment_url: attachmentUrl || null,
      created_at: now,
    };

    // Insert into chat_messages
    const { error: msgErr } = await supabase.from('chat_messages').insert({
      id: newMsg.id,
      chat_id: newMsg.chat_id,
      sender_id: newMsg.sender_id,
      sender_name: newMsg.sender_name,
      sender_role: newMsg.sender_role,
      message_text: newMsg.message_text,
      attachment_url: newMsg.attachment_url,
      is_read: false,
      created_at: now,
    });

    if (msgErr) {
      console.error('Error inserting message into Supabase:', msgErr.message);
    }

    // Update chats last_message
    await supabase
      .from('chats')
      .update({
        last_message: text,
        last_message_at: now,
        updated_at: now,
      })
      .eq('id', chatId);

    return newMsg;
  }

  /**
   * Send simulated or automated staff reply
   */
  async sendStaffReply(
    chatId: string,
    contactId: 'vet-hellen' | 'cvo-admin',
    text: string,
  ): Promise<ChatMessage> {
    const contact = OFFICIAL_CONTACTS[contactId];
    const now = new Date().toISOString();
    const msgId = generateUUID();

    const replyMsg: ChatMessage = {
      id: msgId,
      chat_id: chatId,
      sender_id: contactId === 'vet-hellen' ? 'staff_vet_hellen' : 'staff_cvo_admin',
      sender_name: contact.displayName,
      sender_role: contactId === 'vet-hellen' ? 'Veterinarian' : 'Administrator',
      message_text: text,
      is_read: false,
      attachment_url: null,
      created_at: now,
    };

    await supabase.from('chat_messages').insert({
      id: replyMsg.id,
      chat_id: replyMsg.chat_id,
      sender_id: replyMsg.sender_id,
      sender_name: replyMsg.sender_name,
      sender_role: replyMsg.sender_role,
      message_text: replyMsg.message_text,
      is_read: false,
      created_at: now,
    });

    await supabase
      .from('chats')
      .update({
        last_message: text,
        last_message_at: now,
        updated_at: now,
      })
      .eq('id', chatId);

    return replyMsg;
  }

  /**
   * Generate contextual municipal reply
   */
  generateContextualResponse(
    contactId: 'vet-hellen' | 'cvo-admin',
    userMessage: string,
  ): string {
    const lower = userMessage.toLowerCase();

    if (contactId === 'vet-hellen') {
      if (lower.includes('vomit') || lower.includes('throw up') || lower.includes('puke')) {
        return 'If your pet is vomiting, please withhold heavy solid food for 4 to 6 hours while providing small amounts of fresh water. Watch closely for lethargy or dehydration. If vomiting occurs more than twice, please bring them to our City Clinic for examination.';
      }
      if (lower.includes('letharg') || lower.includes('weak') || lower.includes('tired') || lower.includes('sleepy')) {
        return 'Lethargy in companion animals can indicate fever, infection, or parasitic burden. Please check if your pet has a warm nose/paws or pale gums. You can bring them to our CVO clinic between 8:00 AM – 5:00 PM for free vitals checkup.';
      }
      if (lower.includes('rabies') || lower.includes('vaccine') || lower.includes('vax') || lower.includes('shot')) {
        return 'Our anti-rabies vaccination is completely free under the National Rabies Prevention & Control Program! Pets must be at least 3 months old and clinically healthy. Walk into our clinic Mon–Fri with your digital passport QR.';
      }
      if (lower.includes('kapon') || lower.includes('spay') || lower.includes('neuter') || lower.includes('surgery')) {
        return 'For surgical sterilization (kapon), your pet must be at least 6 months old and strictly fasted (no food or water for 8 hours prior to procedure). We schedule surgeries every weekday morning.';
      }
      if (lower.includes('bite') || lower.includes('scratch') || lower.includes('kagat')) {
        return 'IMPORTANT: Wash the bite wound immediately with running water and soap for at least 15 minutes. Secure the biting animal for 14-day observation and head immediately to the nearest Animal Bite Treatment Center (ABTC).';
      }
      return 'Thank you for reaching out! I have received your clinical inquiry. Keep your companion hydrated and comfortable. If symptoms persist or worsen, please schedule a clinic consultation or visit us directly during weekday operating hours.';
    }

    // CVO Admin
    if (lower.includes('hour') || lower.includes('open') || lower.includes('time') || lower.includes('sched')) {
      return 'The City Veterinary Office (CVO) main clinic is open Monday through Friday, 8:00 AM to 5:00 PM. Same-day bookings are open until 4:00 PM (an hour before 5:00 PM closing). We are closed on weekends and public holidays.';
    }
    if (lower.includes('outreach') || lower.includes('barangay') || lower.includes('brgy') || lower.includes('mission')) {
      return 'Our mobile veterinary team deploys to different barangays across Cagayan de Oro weekly for free mass anti-rabies drives. Check the Announcements section on your Home tab for this week’s deployment schedule!';
    }
    if (lower.includes('register') || lower.includes('passport') || lower.includes('qr') || lower.includes('id')) {
      return 'Companion registration is completely free! Once registered in your SyncVet app, your pet receives an official municipal Tag ID and Digital Pet Passport QR code accepted at all municipal vet stations.';
    }
    if (lower.includes('fee') || lower.includes('cost') || lower.includes('price') || lower.includes('bayad')) {
      return 'All core municipal veterinary services—including anti-rabies vaccinations, routine clinical consultations, and companion registration—are provided 100% FREE by the City Government of Cagayan de Oro.';
    }

    return 'Thank you for messaging the City Veterinary Office Public Desk. We have logged your inquiry and will provide municipal assistance. You may also visit our clinic at the CVO Compound, Cagayan de Oro City.';
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    newText: string,
    currentAttachmentUrl: string | null,
  ): Promise<void> {
    let payload: any = {};
    if (currentAttachmentUrl) {
      try {
        payload = JSON.parse(currentAttachmentUrl);
      } catch {
        payload = { imageUrl: currentAttachmentUrl };
      }
    }
    payload.isEdited = true;

    await supabase
      .from('chat_messages')
      .update({
        message_text: newText,
        attachment_url: JSON.stringify(payload),
      })
      .eq('id', messageId);
  }

  /**
   * Unsend a message
   */
  async unsendMessage(messageId: string): Promise<void> {
    await supabase
      .from('chat_messages')
      .update({
        message_text: '__UNSENT__',
        attachment_url: JSON.stringify({ isUnsent: true }),
      })
      .eq('id', messageId);
  }

  /**
   * Permanently delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    await supabase.from('chat_messages').delete().eq('id', messageId);
  }

  /**
   * Toggle reaction on a message (defaults to paw icon)
   */
  async toggleReaction(
    messageId: string,
    currentAttachmentUrl: string | null,
    reactionEmoji: string = '🐾',
  ): Promise<string> {
    let payload: any = {};
    if (currentAttachmentUrl) {
      try {
        payload = JSON.parse(currentAttachmentUrl);
      } catch {
        payload = { imageUrl: currentAttachmentUrl };
      }
    }

    const currentReactions: string[] = Array.isArray(payload.reactions) ? payload.reactions : [];
    const hasReacted = currentReactions.includes(reactionEmoji);
    const updatedReactions = hasReacted
      ? currentReactions.filter((r) => r !== reactionEmoji)
      : [...currentReactions, reactionEmoji];

    payload.reactions = updatedReactions;
    const finalAttachment = JSON.stringify(payload);

    await supabase
      .from('chat_messages')
      .update({
        attachment_url: finalAttachment,
      })
      .eq('id', messageId);

    return finalAttachment;
  }

  /**
   * Subscribe to real-time chat messages
   */
  subscribeToChat(chatId: string, onNewMessage: (msg: ChatMessage) => void) {
    const channelName = `chat-room-${chatId}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (payload.new) {
            onNewMessage(payload.new as ChatMessage);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const chatService = new ChatService();

