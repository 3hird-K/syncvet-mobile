import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  completed: boolean;
  /** True after an intentional sign-out so a stale Clerk session cannot bounce
   *  the user back into the authenticated app on cold start. */
  signedOut: boolean;
  setCompleted: () => void;
  markSignedOut: () => void;
  clearSignedOut: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      signedOut: false,
      setCompleted: () => set({ completed: true }),
      markSignedOut: () => set({ signedOut: true }),
      clearSignedOut: () => set({ signedOut: false }),
      reset: () => set({ completed: false }),
    }),
    {
      name: 'syncvet.onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
