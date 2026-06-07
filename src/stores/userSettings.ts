import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const GAME_SPEEDS = ['slow', 'medium', 'fast', 'turbo'] as const;

export type GameSpeed = (typeof GAME_SPEEDS)[number];

interface UserSettingsState {
  readonly speed: GameSpeed;
  readonly setSpeed: (speed: GameSpeed) => void;
  readonly cycleSpeed: () => void;
}

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set, get) => ({
      speed: 'medium',
      setSpeed: (speed) => set({ speed }),
      cycleSpeed: () => {
        const currentIndex = GAME_SPEEDS.indexOf(get().speed);
        const nextSpeed = GAME_SPEEDS[(currentIndex + 1) % GAME_SPEEDS.length];
        set({ speed: nextSpeed });
      },
    }),
    {
      name: 'video-poker-user-settings',
      partialize: (state) => ({ speed: state.speed }),
    },
  ),
);
