import { useEffect } from 'react';
import { supabaseRealtimeService } from '@services/realtime/SupabaseRealtimeService';

/**
 * Hook to automatically subscribe to live Supabase Realtime changes
 * whenever an authenticated resident owner ID is present.
 */
export function useSupabaseRealtime(ownerId: string | null | undefined): void {
  useEffect(() => {
    if (ownerId) {
      supabaseRealtimeService.subscribeToResident(ownerId);
    } else {
      supabaseRealtimeService.unsubscribe();
    }
  }, [ownerId]);
}
