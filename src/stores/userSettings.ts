import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PAY_TABLE, clonePayTable, type CreditAmount, type HandRank, type PayTableConfig } from '../engine';

export const GAME_SPEEDS = ['slow', 'medium', 'fast'] as const;
export const DEFAULT_BALANCE = 100;
export const DEFAULT_PAYS = clonePayTable(PAY_TABLE);
const DEFAULT_SPEED: GameSpeed = 'medium';

export type GameSpeed = (typeof GAME_SPEEDS)[number];

interface UserSettingsState {
  readonly speed: GameSpeed;
  readonly balance: CreditAmount;
  readonly pays: PayTableConfig;
  readonly setSpeed: (speed: GameSpeed) => void;
  readonly cycleSpeed: () => void;
  readonly setBalance: (balance: CreditAmount) => void;
  readonly setPays: (pays: PayTableConfig) => void;
  readonly setPay: (rank: HandRank, bet: 1 | 2 | 3 | 4 | 5, payout: CreditAmount) => void;
}

function assertBalance(balance: CreditAmount): void {
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new RangeError('Balance must be a non-negative safe integer.');
  }
}

function isGameSpeed(value: unknown): value is GameSpeed {
  return GAME_SPEEDS.includes(value as GameSpeed);
}

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set, get) => ({
      speed: DEFAULT_SPEED,
      balance: DEFAULT_BALANCE,
      pays: DEFAULT_PAYS,
      setSpeed: (speed) => set({ speed }),
      cycleSpeed: () => {
        const currentIndex = GAME_SPEEDS.indexOf(get().speed);
        const nextSpeed = GAME_SPEEDS[(currentIndex + 1) % GAME_SPEEDS.length];
        set({ speed: nextSpeed });
      },
      setBalance: (balance) => {
        assertBalance(balance);
        set({ balance });
      },
      setPays: (pays) => set({ pays: clonePayTable(pays) }),
      setPay: (rank, bet, payout) => {
        const pays = clonePayTable(get().pays);
        const nextRow = [...pays[rank]] as [number, number, number, number, number];
        nextRow[bet - 1] = payout;
        set({
          pays: clonePayTable({
            ...pays,
            [rank]: nextRow,
          }),
        });
      },
    }),
    {
      name: 'video-poker-user-settings',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<UserSettingsState> | undefined;

        return {
          ...currentState,
          ...persisted,
          speed: isGameSpeed(persisted?.speed) ? persisted.speed : DEFAULT_SPEED,
        };
      },
      partialize: (state) => ({ speed: state.speed, balance: state.balance, pays: state.pays }),
    },
  ),
);
