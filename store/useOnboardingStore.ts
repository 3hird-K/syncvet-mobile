import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  completed: boolean;
  setCompleted: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      setCompleted: () => set({ completed: true }),
      reset: () => set({ completed: false }),
    }),
    {
      name: 'syncvet.onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
