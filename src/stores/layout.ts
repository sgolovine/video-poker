import { create } from 'zustand';

interface LayoutState {
  readonly isPayTableVisible: boolean;
  readonly togglePayTable: () => void;
}

function shouldShowPayTableByDefault() {
  if (typeof window === 'undefined') {
    return true;
  }

  return !window.matchMedia('(max-width: 760px), (max-width: 950px) and (max-height: 500px)').matches;
}

export const useLayoutStore = create<LayoutState>()((set) => ({
  isPayTableVisible: shouldShowPayTableByDefault(),
  togglePayTable: () => set((state) => ({ isPayTableVisible: !state.isPayTableVisible })),
}));
