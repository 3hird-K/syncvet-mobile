import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
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

  useEffect(() => {
    if (!isLoaded) return;

    let isMounted = true;

    const routeImmediately = async () => {
      const { status, user: currentUser } = useAuthStore.getState();
      const isAuth = (status === 'authenticated' && !!currentUser) || Boolean(isSignedIn);

      if (isAuth) {
        if (clerkUser) {
          await useAuthStore.getState().syncUserFromClerk(clerkUser).catch(() => {});
        }

        const freshUser = useAuthStore.getState().user;

        if (isRestrictedStaffRole(freshUser?.role)) {
          if (isMounted) router.replace('/unauthorized-role');
          return;
        }

        const hasCompletedProfile = Boolean(
          freshUser?.profileCompleted &&
          (freshUser?.mobileNumber || freshUser?.address)
        );

        if (isMounted) {
          if (hasCompletedProfile) {
            router.replace('/(main)');
          } else {
            router.replace('/(register)/owner');
          }
        }
      } else {
        const completed = useOnboardingStore.getState().completed;
        if (isMounted) {
          if (completed) {
            router.replace({ pathname: '/onboarding', params: { slide: '3' } });
          } else {
            router.replace('/onboarding');
          }
        }
      }
    };

    routeImmediately();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, clerkUser, router]);

  return null;
}
