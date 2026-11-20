import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth, useUser } from '@clerk/expo';
import { setSupabaseTokenProvider, supabase } from '@lib/supabase';
import { withTimeout } from '@lib/asyncUtils';
import { clerkSignOutSafely, isSignedOutGate } from '@lib/sessionGate';
import { useAuthStore } from '@store/useAuthStore';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
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
  const { isOnline, isReady: networkReady } = useNetworkStatus();
  const syncUserFromClerk = useAuthStore((state) => state.syncUserFromClerk);
  const sessionInitializedRef = useRef<string | null>(null);

  // 0. Install the Clerk token provider before any Supabase query runs.
  // Effects execute in declaration order, so this must stay above the
  // verification/heartbeat effects that call Supabase.
  useEffect(() => {
    if (isSignedIn) {
      setSupabaseTokenProvider(async () => {
        try {
          const templateToken = await withTimeout(
            getToken({ template: 'supabase' }),
            3000,
            'Clerk Supabase token timed out',
          ).catch(() => null);
          if (templateToken) return templateToken;
          return await withTimeout(getToken(), 3000, 'Clerk token timed out').catch(() => null);
        } catch {
          return null;
        }
      });
    } else {
      setSupabaseTokenProvider(null);
    }
  }, [isSignedIn, getToken]);

  // 1. If Clerk session is terminated or user is deleted in Clerk, clear local auth store
  useEffect(() => {
    // Never turn a temporary loss of connectivity into a sign-out. The cached
    // session stays usable offline; this is re-evaluated once we reconnect.
    // Wait for the first real network check so the optimistic startup default
    // cannot trigger a false online decision.
    if (networkReady && isOnline && isLoaded && !isSignedIn) {
      const { status, user } = useAuthStore.getState();
      if (status === 'authenticated' && user) {
        // A persisted local session is authoritative unless the resident
        // intentionally signed out. Clerk can report a stale signed-out state
        // on a preview build if its token cache was not restored; wiping the
        // local session here is what sent already-logged-in users back to the
        // sign-in slide. Account deletion is handled by the heartbeat below.
        if (!isSignedOutGate()) return;
        console.log('[SupabaseAuthBridge] Signed-out gate confirmed. Clearing local store.');
        useAuthStore.getState().signOut().catch(() => {});
      }
    }
  }, [isLoaded, isSignedIn, isOnline, networkReady]);

  // 2. If local store becomes unauthenticated (e.g. Supabase account deletion), terminate Clerk session
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      if (prevState.status === 'authenticated' && state.status === 'unauthenticated') {
        if (isSignedIn) {
          console.log('[SupabaseAuthBridge] Local store unauthenticated. Terminating Clerk session.');
          void clerkSignOutSafely(clerkSignOut);
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
      await clerkSignOutSafely(clerkSignOut);
      await useAuthStore.getState().signOut().catch(() => {});
    });
    return () => {
      supabaseRealtimeService.setOnAccountDeleted(undefined);
    };
  }, [clerkSignOut]);

  // 4. Mount root-level Realtime listener for the active resident
  useEffect(() => {
    const ownerId = clerkUser?.id;
    if (networkReady && ownerId && isSignedIn) {
      supabaseRealtimeService.subscribeToResident(ownerId);
    } else {
      supabaseRealtimeService.unsubscribe();
    }
  }, [clerkUser?.id, isSignedIn, networkReady]);

  // 5. Verify account existence in Supabase public.users
  useEffect(() => {
    // Online-only admin verification. Offline launches keep the locally cached
    // profile and re-check after connectivity returns.
    if (networkReady && clerkUser && isOnline) {
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

        // Repair path: an older bundle may have left the public.users row
        // incomplete even though the resident finished onboarding locally.
        // Re-push the locally persisted profile before syncUserFromClerk
        // can flip profileCompleted back to false.
        if (!dbError && dbUser && !dbUser.profile_completed) {
          const local = useAuthStore.getState().user;
          const meta: any = local?.rawUserMetaData || {};
          const hasLocalCompletion =
            local?.profileCompleted === true ||
            meta.profileCompleted === true;
          if (
            local?.id === clerkUser.id &&
            hasLocalCompletion &&
            local.mobileNumber &&
            local.address
          ) {
            const addressParts = local.address
              .split(',')
              .map((part) => part.trim())
              .filter(Boolean);
            const mappedPetTypes: ('dogs' | 'cats')[] = Array.isArray(meta.petTypes)
              ? meta.petTypes.map((pet: string) =>
                  String(pet).toLowerCase().startsWith('dog') ? 'dogs' : 'cats',
                )
              : [];
            const petTypes = mappedPetTypes.length
              ? mappedPetTypes
              : (['dogs', 'cats'] as ('dogs' | 'cats')[]);

            console.log(
              '[SupabaseAuthBridge] Repairing incomplete public.users row for',
              clerkUser.id,
            );

            try {
              await useAuthStore.getState().completeResidentOnboarding({
                email:
                  clerkUser.primaryEmailAddress?.emailAddress ||
                  local.email ||
                  `${clerkUser.id}@resident.syncvet.app`,
                firstName: local.firstName || clerkUser.firstName || '',
                lastName: local.lastName || clerkUser.lastName || '',
                fullName: local.fullName || clerkUser.fullName || '',
                mobileNumber: local.mobileNumber,
                barangay: meta.barangay || addressParts[1] || '',
                street: meta.streetAddress || addressParts[0] || '',
                landmark: meta.landmark || '',
                smsNotificationsEnabled: meta.smsConsent !== false,
                smsConsentUpdatedAt:
                  meta.smsConsentUpdatedAt || new Date().toISOString(),
                emergencyContactName: meta.emergencyContactName || '',
                emergencyContactRelationship:
                  meta.emergencyContactRelation || 'Spouse',
                emergencyContactPhone: meta.emergencyContactPhone || '',
                caredAnimals: petTypes,
                healthDeclarationAgreed: true,
                explicitUserId: clerkUser.id,
              });
              console.log(
                '[SupabaseAuthBridge] public.users repair completed for',
                clerkUser.id,
              );
            } catch (repairError) {
              console.warn(
                '[SupabaseAuthBridge] Failed to repair public.users row:',
                repairError,
              );
            }
          }
        }

        // Step B: User is not in Supabase public.users
        if (!dbError && !dbUser) {
          const currentStoreUser = useAuthStore.getState().user;
          // Only sign out if this exact user previously had a completed profile and was deleted in the admin
          if (currentStoreUser && currentStoreUser.id === clerkUser.id && currentStoreUser.profileCompleted) {
            console.warn('[SupabaseAuthBridge] Resident profile was deleted in Supabase admin. Signing out.');
            toast.error('Account Deleted', {
              description: 'Your account was removed by an administrator.',
            });
            await clerkSignOutSafely(clerkSignOut);
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
  }, [clerkUser?.id, isOnline, networkReady, syncUserFromClerk, clerkSignOut]);

  // 6. Active deletion heartbeat: Automatically logs out if admin deletes the user in the database
  useEffect(() => {
    if (!networkReady || !isOnline || !clerkUser?.id || !isSignedIn) return;

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
            await clerkSignOutSafely(clerkSignOut);
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
  }, [clerkUser?.id, isSignedIn, isOnline, networkReady, clerkSignOut]);

  return null;
}
