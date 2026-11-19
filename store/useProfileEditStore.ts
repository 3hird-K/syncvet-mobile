import { create } from 'zustand';

interface ProfileEditState {
  visible: boolean;
  open: () => void;
  close: () => void;
}

/**
 * Controls the Update Profile sheet from anywhere in the app.
 *
 * The sheet itself is mounted in the root layout so it paints above the tab
 * navigator instead of being trapped inside the profile screen's hierarchy.
 */
export const useProfileEditStore = create<ProfileEditState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
