import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/expo';

import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useAuthStore } from '@store/useAuthStore';
import {
  supabaseRealtimeService,
  type QueueCallAlert as QueueCallAlertData,
} from '@services/realtime/SupabaseRealtimeService';
import { PetCalledRingModal } from '@components/ui/PetCalledRingModal';

/**
 * Root-level call alert. This keeps ringing and shows the call dialog no matter
 * which screen the owner is on when the clinic calls their ticket.
 */
export function QueueCallAlert() {
  const { user } = useUser();
  const authUserId = useAuthStore((state) => state.user?.id);
  const { isOnline } = useNetworkStatus();
  const ownerId = user?.id || authUserId || '';

  const [call, setCall] = useState<QueueCallAlertData | null>(null);

  useEffect(() => supabaseRealtimeService.addQueueCallListener(setCall), []);

  // Queue requirements call for a 3-second polling fallback alongside Realtime.
  useEffect(() => {
    if (!isOnline || !ownerId) return;

    const poll = () => {
      supabaseRealtimeService.syncQueueStatus(ownerId).catch(() => {});
    };

    poll();
    const timer = setInterval(poll, 3_000);
    return () => clearInterval(timer);
  }, [isOnline, ownerId]);

  return (
    <PetCalledRingModal
      visible={Boolean(call)}
      appointment={call?.appointment || null}
      ticket={call?.ticket || null}
      onAcknowledge={() => supabaseRealtimeService.acknowledgeQueueCall()}
    />
  );
}
