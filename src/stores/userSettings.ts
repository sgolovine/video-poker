import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GAME_VARIANTS,
  clonePayTable,
  getDefaultPayTable,
  type CreditAmount,
  type GameVariant,
  type HandRank,
  type PayTableConfig,
  type VariantPayTables,
} from '../engine';
import { DEFAULT_CARD_BACK_ID, isCardBackId } from '../lib/cardAssets';

export const GAME_SPEEDS = ['slow', 'medium', 'fast'] as const;
export const DEFAULT_BALANCE = 100;
export const DEFAULT_VARIANT: GameVariant = 'JacksOrBetter';
export const DEFAULT_PAY_TABLES = createDefaultPayTables();
export const DEFAULT_PAYS = DEFAULT_PAY_TABLES[DEFAULT_VARIANT];
const DEFAULT_SPEED: GameSpeed = 'medium';
const MOBILE_SHORTCUT_MEDIA_QUERY = '(max-width: 760px)';

export type GameSpeed = (typeof GAME_SPEEDS)[number];

interface UserSettingsState {
  readonly speed: GameSpeed;
  readonly showKeyboardShortcuts: boolean;
  readonly cardBackId: string;
  readonly balance: CreditAmount;
  readonly selectedVariant: GameVariant;
  readonly payTablesByVariant: VariantPayTables;
  readonly setSpeed: (speed: GameSpeed) => void;
  readonly setShowKeyboardShortcuts: (showKeyboardShortcuts: boolean) => void;
  readonly setCardBackId: (cardBackId: string) => void;
  readonly cycleSpeed: () => void;
  readonly setBalance: (balance: CreditAmount) => void;
  readonly setSelectedVariant: (variant: GameVariant) => void;
  readonly setPayTableForVariant: (variant: GameVariant, pays: PayTableConfig) => void;
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

function isGameVariant(value: unknown): value is GameVariant {
  return GAME_VARIANTS.includes(value as GameVariant);
}

function createDefaultPayTables(): VariantPayTables {
  return {
    JacksOrBetter: getDefaultPayTable('JacksOrBetter'),
    DeucesWild: getDefaultPayTable('DeucesWild'),
    JokerPoker: getDefaultPayTable('JokerPoker'),
  };
}

function clonePayTables(payTables: Partial<Record<GameVariant, PayTableConfig>> | undefined): VariantPayTables {
  return {
    JacksOrBetter: clonePayTable('JacksOrBetter', payTables?.JacksOrBetter ?? getDefaultPayTable('JacksOrBetter')),
    DeucesWild: clonePayTable('DeucesWild', payTables?.DeucesWild ?? getDefaultPayTable('DeucesWild')),
    JokerPoker: clonePayTable('JokerPoker', payTables?.JokerPoker ?? getDefaultPayTable('JokerPoker')),
  };
}

function mergePayTables(persisted: Partial<UserSettingsState> & { readonly pays?: PayTableConfig }): VariantPayTables {
  const legacyJacksPayTable = persisted.pays;
  const persistedTables = persisted.payTablesByVariant;
  return clonePayTables({
    JacksOrBetter: persistedTables?.JacksOrBetter ?? legacyJacksPayTable,
    DeucesWild: persistedTables?.DeucesWild,
    JokerPoker: persistedTables?.JokerPoker,
  });
}

export function getDefaultShowKeyboardShortcuts(): boolean {
  return (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function' ||
    !window.matchMedia(MOBILE_SHORTCUT_MEDIA_QUERY).matches
  );
}

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set, get) => ({
      speed: DEFAULT_SPEED,
      showKeyboardShortcuts: getDefaultShowKeyboardShortcuts(),
      cardBackId: DEFAULT_CARD_BACK_ID,
      balance: DEFAULT_BALANCE,
      selectedVariant: DEFAULT_VARIANT,
      payTablesByVariant: DEFAULT_PAY_TABLES,
      setSpeed: (speed) => set({ speed }),
      setShowKeyboardShortcuts: (showKeyboardShortcuts) => set({ showKeyboardShortcuts }),
      setCardBackId: (cardBackId) => {
        set({ cardBackId: isCardBackId(cardBackId) ? cardBackId : DEFAULT_CARD_BACK_ID });
      },
      cycleSpeed: () => {
        const currentIndex = GAME_SPEEDS.indexOf(get().speed);
        const nextSpeed = GAME_SPEEDS[(currentIndex + 1) % GAME_SPEEDS.length];
        set({ speed: nextSpeed });
      },
      setBalance: (balance) => {
        assertBalance(balance);
        set({ balance });
      },
      setSelectedVariant: (selectedVariant) => set({ selectedVariant }),
      setPayTableForVariant: (variant, pays) => {
        set((state) => ({
          payTablesByVariant: clonePayTables({
            ...state.payTablesByVariant,
            [variant]: clonePayTable(variant, pays),
          }),
        }));
      },
      setPay: (rank, bet, payout) => {
        const variant = get().selectedVariant;
        const pays = clonePayTable(variant, get().payTablesByVariant[variant]);
        const row = pays[rank];
        if (!row) {
          throw new RangeError(`Hand rank ${rank} is not valid for ${variant}.`);
        }
        const nextRow = [...row] as [number, number, number, number, number];
        nextRow[bet - 1] = payout;
        set((state) => ({
          payTablesByVariant: clonePayTables({
            ...state.payTablesByVariant,
            [variant]: {
              ...pays,
              [rank]: nextRow,
            },
          }),
        }));
      },
    }),
    {
      name: 'video-poker-user-settings',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | (Partial<UserSettingsState> & { readonly pays?: PayTableConfig })
          | undefined;

        if (!persisted) {
          return currentState;
        }

        return {
          ...currentState,
          ...persisted,
          speed: isGameSpeed(persisted.speed) ? persisted.speed : DEFAULT_SPEED,
          cardBackId: isCardBackId(persisted.cardBackId) ? persisted.cardBackId : DEFAULT_CARD_BACK_ID,
          selectedVariant: isGameVariant(persisted.selectedVariant) ? persisted.selectedVariant : DEFAULT_VARIANT,
          showKeyboardShortcuts:
            typeof persisted.showKeyboardShortcuts === 'boolean'
              ? persisted.showKeyboardShortcuts
              : getDefaultShowKeyboardShortcuts(),
          payTablesByVariant: mergePayTables(persisted),
        };
      },
      partialize: (state) => ({
        speed: state.speed,
        showKeyboardShortcuts: state.showKeyboardShortcuts,
        cardBackId: state.cardBackId,
        balance: state.balance,
        selectedVariant: state.selectedVariant,
        payTablesByVariant: state.payTablesByVariant,
      }),
    },
  ),
);
