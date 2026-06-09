import { create } from 'zustand';

interface LayoutState {
  readonly isPayTableVisible: boolean;
  readonly isSettingsDialogOpen: boolean;
  readonly setSettingsDialogOpen: (isSettingsDialogOpen: boolean) => void;
  readonly togglePayTable: () => void;
  readonly toggleSettingsDialog: () => void;
}

function shouldShowPayTableByDefault() {
  if (typeof window === 'undefined') {
    return true;
  }

  return !window.matchMedia('(max-width: 760px), (max-width: 950px) and (max-height: 500px)').matches;
}

export const useLayoutStore = create<LayoutState>()((set) => ({
  isPayTableVisible: shouldShowPayTableByDefault(),
  isSettingsDialogOpen: false,
  setSettingsDialogOpen: (isSettingsDialogOpen) => set({ isSettingsDialogOpen }),
  togglePayTable: () => set((state) => ({ isPayTableVisible: !state.isPayTableVisible })),
  toggleSettingsDialog: () => set((state) => ({ isSettingsDialogOpen: !state.isSettingsDialogOpen })),
}));
