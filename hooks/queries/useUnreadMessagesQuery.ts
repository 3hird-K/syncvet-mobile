import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { queryKeys } from '@lib/queryClient';
import { chatService } from '@services/chat/chatService';

/**
 * Realtime TanStack Query hook that tracks unread messages for the resident.
 * Subscribes to Supabase postgres_changes on chat_messages table to invalidate
 * and refetch the unread count in real time whenever a message arrives, is read, or changes.
 */
export function useUnreadMessagesQuery(ownerId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.unreadMessagesCount(ownerId),
    queryFn: async () => {
      if (!ownerId) return 0;
      return await chatService.getUnreadMessagesCount(ownerId);
    },
    enabled: Boolean(ownerId),
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 15000, // 15s fallback polling
  });

  // Realtime subscription via Supabase Channel
  useEffect(() => {
    if (!ownerId) return;

    const channelName = `realtime-unread-count-${ownerId}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.unreadMessagesCount(ownerId),
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `owner_id=eq.${ownerId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.unreadMessagesCount(ownerId),
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId, queryClient]);

  return query;
}

