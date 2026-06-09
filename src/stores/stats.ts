import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type CreditAmount, GAME_VARIANTS, type GameVariant, getGameDefinition, type HandRank } from '../engine';

export interface GameStats {
  readonly handsPlayed: number;
  readonly winningHands: number;
  readonly highestHandWon?: HandRank;
  readonly winPercentage: number;
  readonly totalMoneySpent: CreditAmount;
  readonly totalMoneyEarned: CreditAmount;
  readonly totalWinLoss: CreditAmount;
}

export type StatsByVariant = Readonly<Record<GameVariant, GameStats>>;

export interface CompletedHandStatsInput {
  readonly variant: GameVariant;
  readonly handRank: HandRank;
  readonly bet: CreditAmount;
  readonly payout: CreditAmount;
}

interface StatsState {
  readonly globalStats: GameStats;
  readonly statsByVariant: StatsByVariant;
  readonly recordHand: (result: CompletedHandStatsInput) => void;
  readonly resetStats: () => void;
}

const GLOBAL_HAND_ORDER: readonly HandRank[] = Object.freeze([
  'royalFlush',
  'fourDeuces',
  'fiveOfAKind',
  'wildRoyalFlush',
  'straightFlush',
  'fourOfAKind',
  'fullHouse',
  'flush',
  'straight',
  'threeOfAKind',
  'twoPair',
  'jacksOrBetter',
  'kingsOrBetter',
]);

function createEmptyGameStats(): GameStats {
  return {
    handsPlayed: 0,
    winningHands: 0,
    winPercentage: 0,
    totalMoneySpent: 0,
    totalMoneyEarned: 0,
    totalWinLoss: 0,
  };
}

function createEmptyStatsByVariant(): StatsByVariant {
  return {
    JacksOrBetter: createEmptyGameStats(),
    DeucesWild: createEmptyGameStats(),
    JokerPoker: createEmptyGameStats(),
  };
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isGameVariant(value: unknown): value is GameVariant {
  return GAME_VARIANTS.includes(value as GameVariant);
}

function isHandRank(value: unknown): value is HandRank {
  return typeof value === 'string' && GLOBAL_HAND_ORDER.includes(value as HandRank);
}

function getWinPercentage(handsPlayed: number, winningHands: number): number {
  return handsPlayed === 0 ? 0 : (winningHands / handsPlayed) * 100;
}

function getTotalWinLoss(totalMoneyEarned: CreditAmount, totalMoneySpent: CreditAmount): CreditAmount {
  return totalMoneyEarned - totalMoneySpent;
}

function getRankStrength(order: readonly HandRank[], rank: HandRank): number {
  const index = order.indexOf(rank);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function isBetterGlobalHand(current: HandRank | undefined, next: HandRank): boolean {
  return (
    current === undefined || getRankStrength(GLOBAL_HAND_ORDER, next) < getRankStrength(GLOBAL_HAND_ORDER, current)
  );
}

function isBetterVariantHand(variant: GameVariant, current: HandRank | undefined, next: HandRank): boolean {
  const order = getGameDefinition(variant).handOrder;
  return current === undefined || getRankStrength(order, next) < getRankStrength(order, current);
}

function applyCompletedHand(
  stats: GameStats,
  result: CompletedHandStatsInput,
  isBetterHand: (current: HandRank | undefined, next: HandRank) => boolean,
): GameStats {
  const handsPlayed = stats.handsPlayed + 1;
  const isWin = result.payout > 0;
  const winningHands = stats.winningHands + (isWin ? 1 : 0);
  const totalMoneySpent = stats.totalMoneySpent + result.bet;
  const totalMoneyEarned = stats.totalMoneyEarned + result.payout;
  const highestHandWon =
    isWin && isBetterHand(stats.highestHandWon, result.handRank) ? result.handRank : stats.highestHandWon;

  return {
    handsPlayed,
    winningHands,
    highestHandWon,
    winPercentage: getWinPercentage(handsPlayed, winningHands),
    totalMoneySpent,
    totalMoneyEarned,
    totalWinLoss: getTotalWinLoss(totalMoneyEarned, totalMoneySpent),
  };
}

function normalizeStats(stats: Partial<GameStats> | undefined): GameStats {
  const handsPlayed = isSafeNonNegativeInteger(stats?.handsPlayed) ? stats.handsPlayed : 0;
  const winningHands = isSafeNonNegativeInteger(stats?.winningHands) ? Math.min(stats.winningHands, handsPlayed) : 0;
  const totalMoneySpent = isSafeNonNegativeInteger(stats?.totalMoneySpent) ? stats.totalMoneySpent : 0;
  const totalMoneyEarned = isSafeNonNegativeInteger(stats?.totalMoneyEarned) ? stats.totalMoneyEarned : 0;
  const highestHandWon = isHandRank(stats?.highestHandWon) ? stats.highestHandWon : undefined;

  return {
    handsPlayed,
    winningHands,
    highestHandWon,
    winPercentage: getWinPercentage(handsPlayed, winningHands),
    totalMoneySpent,
    totalMoneyEarned,
    totalWinLoss: getTotalWinLoss(totalMoneyEarned, totalMoneySpent),
  };
}

function normalizeStatsByVariant(statsByVariant: Partial<Record<GameVariant, Partial<GameStats>>> | undefined) {
  return {
    JacksOrBetter: normalizeStats(statsByVariant?.JacksOrBetter),
    DeucesWild: normalizeStats(statsByVariant?.DeucesWild),
    JokerPoker: normalizeStats(statsByVariant?.JokerPoker),
  };
}

export function recordCompletedHand(
  globalStats: GameStats,
  statsByVariant: StatsByVariant,
  result: CompletedHandStatsInput,
): Pick<StatsState, 'globalStats' | 'statsByVariant'> {
  if (!isGameVariant(result.variant)) {
    throw new RangeError(`Game variant ${result.variant} is not supported.`);
  }
  if (!Number.isSafeInteger(result.bet) || result.bet < 1 || result.bet > 5) {
    throw new RangeError('Bet must be a safe integer from one through five.');
  }
  if (!isSafeNonNegativeInteger(result.payout)) {
    throw new RangeError('Payout must be a non-negative safe integer.');
  }

  return {
    globalStats: applyCompletedHand(globalStats, result, isBetterGlobalHand),
    statsByVariant: {
      ...statsByVariant,
      [result.variant]: applyCompletedHand(statsByVariant[result.variant], result, (current, next) =>
        isBetterVariantHand(result.variant, current, next),
      ),
    },
  };
}

export function createEmptyStatsState(): Pick<StatsState, 'globalStats' | 'statsByVariant'> {
  return {
    globalStats: createEmptyGameStats(),
    statsByVariant: createEmptyStatsByVariant(),
  };
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      ...createEmptyStatsState(),
      recordHand: (result) => {
        set((state) => recordCompletedHand(state.globalStats, state.statsByVariant, result));
      },
      resetStats: () => {
        set(createEmptyStatsState());
      },
    }),
    {
      name: 'video-poker-stats',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | {
              readonly globalStats?: Partial<GameStats>;
              readonly statsByVariant?: Partial<Record<GameVariant, Partial<GameStats>>>;
            }
          | undefined;

        if (!persisted) {
          return currentState;
        }

        return {
          ...currentState,
          globalStats: normalizeStats(persisted.globalStats),
          statsByVariant: normalizeStatsByVariant(persisted.statsByVariant),
        };
      },
      partialize: (state) => ({
        globalStats: state.globalStats,
        statsByVariant: state.statsByVariant,
      }),
    },
  ),
);
