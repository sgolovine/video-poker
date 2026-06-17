import { create } from 'zustand';

interface LayoutState {
  readonly isFundsPanelVisible: boolean;
  readonly isPayTableVisible: boolean;
  readonly isSettingsDialogOpen: boolean;
  readonly setSettingsDialogOpen: (isSettingsDialogOpen: boolean) => void;
  readonly toggleFundsPanel: () => void;
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
  isFundsPanelVisible: false,
  isPayTableVisible: shouldShowPayTableByDefault(),
  isSettingsDialogOpen: false,
  setSettingsDialogOpen: (isSettingsDialogOpen) => set({ isSettingsDialogOpen }),
  toggleFundsPanel: () =>
    set((state) => ({
      isFundsPanelVisible: !state.isFundsPanelVisible,
      isPayTableVisible: state.isFundsPanelVisible ? state.isPayTableVisible : false,
    })),
  togglePayTable: () =>
    set((state) => ({
      isFundsPanelVisible: state.isPayTableVisible ? state.isFundsPanelVisible : false,
      isPayTableVisible: !state.isPayTableVisible,
    })),
  toggleSettingsDialog: () => set((state) => ({ isSettingsDialogOpen: !state.isSettingsDialogOpen })),
}));
