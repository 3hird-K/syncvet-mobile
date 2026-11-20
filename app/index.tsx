import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { withTimeout } from '@lib/asyncUtils';
import { bootstrapSession } from '@lib/sessionBootstrap';
import { isSignedOutGate, reconcileStaleSignedOutGate } from '@lib/sessionGate';
import { useAuthStore } from '@store/useAuthStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { isRestrictedStaffRole } from '@services/auth/types';

/**
 * Root index route: Immediately redirects to the appropriate destination
 * without displaying an intermediate in-app splash screen.
 */
export default function IndexScreen() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const routedRef = useRef(false);

  // Re-evaluate once the local session finishes restoring. Reading the store
  // only on the first render was the reason a returning resident could be sent
  // to onboarding while their SecureStore session was still being read.
  const localStatus = useAuthStore((state) => state.status);
  const localUserId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    let isMounted = true;

    const routeImmediately = async () => {
      await bootstrapSession();
      if (!isMounted || routedRef.current) return;

      const { status, user: currentUser } = useAuthStore.getState();
      const hasLocalSession = status === 'authenticated' && !!currentUser;

      // A Clerk session that matches the persisted local session proves this is
      // a returning/ongoing login, not a stale client left over from sign-out.
      if (isSignedIn && clerkUser) {
        reconcileStaleSignedOutGate(clerkUser.id, currentUser?.id);
      }

      // A stale Clerk session must not undo an intentional sign-out.
      const isAuth = !isSignedOutGate() && (hasLocalSession || Boolean(isSignedIn));

      if (isAuth) {
        if (clerkUser) {
          await withTimeout(
            useAuthStore.getState().syncUserFromClerk(clerkUser),
            3000,
            'profile sync timeout',
          ).catch(() => {});
        }

        if (!isMounted || routedRef.current) return;
        const freshUser = useAuthStore.getState().user;

        if (isRestrictedStaffRole(freshUser?.role)) {
          routedRef.current = true;
          router.replace('/unauthorized-role');
          return;
        }

        const hasCompletedProfile = Boolean(
          freshUser?.profileCompleted &&
          freshUser?.mobileNumber &&
          freshUser?.address
        );

        routedRef.current = true;
        router.replace(hasCompletedProfile ? '/(main)' : '/(register)/owner');
      } else {
        const completed = useOnboardingStore.getState().completed;
        routedRef.current = true;
        router.replace(
          completed ? { pathname: '/onboarding', params: { slide: '3' } } : '/onboarding',
        );
      }
    };

    routeImmediately();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, clerkUser, router, localStatus, localUserId]);

  return null;
}
