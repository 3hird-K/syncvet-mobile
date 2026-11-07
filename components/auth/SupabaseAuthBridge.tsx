import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth, useUser } from '@clerk/expo';
import { setSupabaseTokenProvider, supabase } from '@lib/supabase';
import { useAuthStore } from '@store/useAuthStore';
import { supabaseRealtimeService } from '@services/realtime/SupabaseRealtimeService';
import { toast } from '@components/ui/Sonner';

/**
 * Headless bridge component that connects Clerk's authenticated session
 * to the Supabase client so all database queries send the Clerk JWT.
 * 
 * Responsibilities:
 * 1. Automatically signs out of local store if user is deleted or revoked in Clerk.
 * 2. Automatically signs out of Clerk and mobile session if user record is deleted in Supabase admin.
 * 3. Mounts root-level Supabase Realtime subscription to catch instant DELETE events.
 * 4. Active heartbeat poll & AppState listener to detect admin deletion in real-time.
 * 5. Syncs user profile data into store without resurrecting deleted accounts.
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
      toast.error('Account Deleted', {
        description: 'Your account was deleted by an administrator.',
      });
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
          const currentStoreUser = useAuthStore.getState().user;
          // Only sign out if this exact user previously had a completed profile and was deleted in the admin
          if (currentStoreUser && currentStoreUser.id === clerkUser.id && currentStoreUser.profileCompleted) {
            console.warn('[SupabaseAuthBridge] Resident profile was deleted in Supabase admin. Signing out.');
            toast.error('Account Deleted', {
              description: 'Your account was removed by an administrator.',
            });
            await clerkSignOut().catch(() => {});
            await useAuthStore.getState().signOut().catch(() => {});
            return;
          }

          // Register initial user record in Supabase public.users for valid Clerk session
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
                  role: 'Pet Owner',
                  profile_completed: false,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' },
              );
          } catch (upsertErr) {
            console.warn('[SupabaseAuthBridge] Failed to create user in Supabase:', upsertErr);
          }
        }

        if (clerkUser.unsafeMetadata && Object.keys(clerkUser.unsafeMetadata).length > 0) {
          try {
            await clerkUser.update({ unsafeMetadata: {} });
            console.log('[SupabaseAuthBridge] Cleared Clerk unsafeMetadata - profile is stored directly in Supabase public.users.');
          } catch (metaErr) {
            console.warn('[SupabaseAuthBridge] Note clearing Clerk unsafeMetadata:', metaErr);
          }
        }

        // Sync fresh profile into auth store directly from Supabase
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

  // 6. Active deletion heartbeat: Automatically logs out if admin deletes the user in the database
  useEffect(() => {
    if (!clerkUser?.id || !isSignedIn) return;

    let isMounted = true;

    const checkUserStillExistsInAdmin = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, profile_completed')
          .eq('id', clerkUser.id)
          .maybeSingle();

        if (!isMounted) return;

        // If the query returns null, the record was deleted in the admin console!
        if (!error && !data) {
          const currentStoreUser = useAuthStore.getState().user;
          if (currentStoreUser && currentStoreUser.id === clerkUser.id && currentStoreUser.profileCompleted) {
            console.warn('[SupabaseAuthBridge] Heartbeat detected user was deleted by admin. Logging out automatically.');
            toast.error('Account Deleted', {
              description: 'Your account was deleted by an administrator.',
            });
            await clerkSignOut().catch(() => {});
            await useAuthStore.getState().signOut().catch(() => {});
          }
        }
      } catch (err) {
        // Network offline / momentary hiccup, ignore
      }
    };

    // Check periodically every 5 seconds
    const intervalId = setInterval(checkUserStillExistsInAdmin, 5000);

    // Also check immediately when app returns to foreground
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkUserStillExistsInAdmin();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [clerkUser?.id, isSignedIn, clerkSignOut]);

  // 7. Supabase JWT Token Provider
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
