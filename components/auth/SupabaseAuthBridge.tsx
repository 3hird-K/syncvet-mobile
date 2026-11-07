import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/expo';
import { setSupabaseTokenProvider, supabase } from '@lib/supabase';
import { useAuthStore } from '@store/useAuthStore';
import { supabaseRealtimeService } from '@services/realtime/SupabaseRealtimeService';

/**
 * Headless bridge component that connects Clerk's authenticated session
 * to the Supabase client so all database queries send the Clerk JWT.
 * 
 * Responsibilities:
 * 1. Automatically signs out of local store if user is deleted or revoked in Clerk.
 * 2. Automatically signs out of Clerk if user record is deleted in Supabase.
 * 3. Mounts root-level Supabase Realtime subscription to catch instant DELETE events.
 * 4. Syncs user profile data into store without resurrecting deleted accounts.
 */
export function SupabaseAuthBridge() {
  const { getToken, isSignedIn, isLoaded, signOut: clerkSignOut } = useAuth();
  const { user: clerkUser } = useUser();
  const syncUserFromClerk = useAuthStore((state) => state.syncUserFromClerk);
  const sessionInitializedRef = useRef<string | null>(null);

  // 1. If Clerk session is terminated or user is deleted in Clerk, clear local auth store
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const authStatus = useAuthStore.getState().status;
      if (authStatus === 'authenticated') {
        console.log('[SupabaseAuthBridge] Clerk session ended/user deleted. Signing out of local store.');
        useAuthStore.getState().signOut().catch(() => {});
      }
    }
  }, [isLoaded, isSignedIn]);

  // 2. If local store becomes unauthenticated (e.g. Supabase account deletion), terminate Clerk session
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      if (prevState.status === 'authenticated' && state.status === 'unauthenticated') {
        if (isSignedIn) {
          console.log('[SupabaseAuthBridge] Local store unauthenticated. Terminating Clerk session.');
          clerkSignOut().catch(() => {});
        }
      }
    });
    return unsubscribe;
  }, [isSignedIn, clerkSignOut]);

  // 3. Connect Realtime account deletion callback to full signout
  useEffect(() => {
    supabaseRealtimeService.setOnAccountDeleted(async () => {
      console.warn('[SupabaseAuthBridge] Realtime account deleted event received. Signing out.');
      await clerkSignOut().catch(() => {});
      await useAuthStore.getState().signOut().catch(() => {});
    });
    return () => {
      supabaseRealtimeService.setOnAccountDeleted(undefined);
    };
  }, [clerkSignOut]);

  // 4. Mount root-level Realtime listener for the active resident
  useEffect(() => {
    const ownerId = clerkUser?.id;
    if (ownerId && isSignedIn) {
      supabaseRealtimeService.subscribeToResident(ownerId);
    } else {
      supabaseRealtimeService.unsubscribe();
    }
  }, [clerkUser?.id, isSignedIn]);

  // 5. Verify account existence in Supabase public.users
  useEffect(() => {
    if (clerkUser) {
      if (sessionInitializedRef.current === clerkUser.id) return;
      sessionInitializedRef.current = clerkUser.id;
      let isMounted = true;

      (async () => {
        let dbUser: any = null;
        let dbError: any = null;
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, role, profile_completed')
            .eq('id', clerkUser.id)
            .maybeSingle();
          dbUser = data;
          dbError = error;
        } catch (err) {
          dbError = err;
        }

        if (!isMounted) return;

        // Step B: User is not in Supabase public.users
        if (!dbError && !dbUser) {
          // Create user record in Supabase public.users for valid Clerk session
          const email =
            clerkUser.primaryEmailAddress?.emailAddress || `${clerkUser.id}@resident.syncvet.app`;
          const fullName =
            clerkUser.fullName ||
            `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
            'Resident';
          const avatarUrl = clerkUser.imageUrl || null;

          try {
            await supabase
              .from('users')
              .upsert(
                {
                  id: clerkUser.id,
                  email,
                  full_name: fullName,
                  first_name: clerkUser.firstName || null,
                  last_name: clerkUser.lastName || null,
                  avatar_url: avatarUrl,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' },
              );
          } catch (upsertErr) {
            console.warn('[SupabaseAuthBridge] Failed to create user in Supabase:', upsertErr);
          }
          return;
        }

        // Sync fresh profile into auth store
        await syncUserFromClerk(clerkUser).catch((err) => {
          console.warn('Failed to sync user from Clerk to store:', err);
        });

        if (dbUser && clerkUser.imageUrl) {
          // If resident exists, keep avatar aligned with Google OAuth
          try {
            await supabase
              .from('users')
              .update({
                avatar_url: clerkUser.imageUrl,
                updated_at: new Date().toISOString(),
              })
              .eq('id', clerkUser.id);
          } catch {}
        }
      })().catch(() => {});

      return () => {
        isMounted = false;
      };
    }
  }, [clerkUser?.id, syncUserFromClerk, clerkSignOut]);

  // 5. Supabase JWT Token Provider
  useEffect(() => {
    if (isSignedIn) {
      setSupabaseTokenProvider(async () => {
        try {
          const templateToken = await getToken({ template: 'supabase' }).catch(() => null);
          if (templateToken) return templateToken;
          return await getToken();
        } catch {
          return null;
        }
      });
    } else {
      setSupabaseTokenProvider(null);
    }
  }, [isSignedIn, getToken]);

  return null;
}
