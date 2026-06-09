import { describe, expect, it } from 'vitest';
import {
  createEmptyStatsState,
  recordCompletedHand,
  type CompletedHandStatsInput,
  type GameStats,
  type StatsByVariant,
  useStatsStore,
} from './stats';

function emptyStats(): GameStats {
  return {
    handsPlayed: 0,
    winningHands: 0,
    winPercentage: 0,
    totalMoneySpent: 0,
    totalMoneyEarned: 0,
    totalWinLoss: 0,
  };
}

function emptyStatsByVariant(): StatsByVariant {
  return {
    JacksOrBetter: emptyStats(),
    DeucesWild: emptyStats(),
    JokerPoker: emptyStats(),
  };
}

function recordHands(results: readonly CompletedHandStatsInput[]) {
  return results.reduce((state, result) => recordCompletedHand(state.globalStats, state.statsByVariant, result), {
    globalStats: emptyStats(),
    statsByVariant: emptyStatsByVariant(),
  });
}

describe('stats store calculations', () => {
  it('tracks completed hands globally and per variant', () => {
    const state = recordHands([
      {
        variant: 'JacksOrBetter',
        handRank: 'nothing',
        bet: 5,
        payout: 0,
      },
      {
        variant: 'JacksOrBetter',
        handRank: 'twoPair',
        bet: 5,
        payout: 10,
      },
      {
        variant: 'DeucesWild',
        handRank: 'fourDeuces',
        bet: 3,
        payout: 600,
      },
    ]);

    expect(state.globalStats).toEqual({
      handsPlayed: 3,
      winningHands: 2,
      highestHandWon: 'fourDeuces',
      winPercentage: (2 / 3) * 100,
      totalMoneySpent: 13,
      totalMoneyEarned: 610,
      totalWinLoss: 597,
    });
    expect(state.statsByVariant.JacksOrBetter).toEqual({
      handsPlayed: 2,
      winningHands: 1,
      highestHandWon: 'twoPair',
      winPercentage: 50,
      totalMoneySpent: 10,
      totalMoneyEarned: 10,
      totalWinLoss: 0,
    });
    expect(state.statsByVariant.DeucesWild).toEqual({
      handsPlayed: 1,
      winningHands: 1,
      highestHandWon: 'fourDeuces',
      winPercentage: 100,
      totalMoneySpent: 3,
      totalMoneyEarned: 600,
      totalWinLoss: 597,
    });
    expect(state.statsByVariant.JokerPoker).toEqual(emptyStats());
  });

  it('keeps the highest won hand by game order and ignores losing hands', () => {
    const state = recordHands([
      {
        variant: 'JacksOrBetter',
        handRank: 'fullHouse',
        bet: 5,
        payout: 45,
      },
      {
        variant: 'JacksOrBetter',
        handRank: 'nothing',
        bet: 5,
        payout: 0,
      },
      {
        variant: 'JacksOrBetter',
        handRank: 'straightFlush',
        bet: 1,
        payout: 50,
      },
      {
        variant: 'JacksOrBetter',
        handRank: 'threeOfAKind',
        bet: 2,
        payout: 6,
      },
    ]);

    expect(state.globalStats.highestHandWon).toBe('straightFlush');
    expect(state.statsByVariant.JacksOrBetter.highestHandWon).toBe('straightFlush');
    expect(state.statsByVariant.JacksOrBetter.winningHands).toBe(3);
    expect(state.statsByVariant.JacksOrBetter.winPercentage).toBe(75);
  });

  it('rejects impossible stat inputs before mutating totals', () => {
    expect(() =>
      recordCompletedHand(emptyStats(), emptyStatsByVariant(), {
        variant: 'JacksOrBetter',
        handRank: 'flush',
        bet: 6,
        payout: 30,
      }),
    ).toThrow(RangeError);
    expect(() =>
      recordCompletedHand(emptyStats(), emptyStatsByVariant(), {
        variant: 'JacksOrBetter',
        handRank: 'flush',
        bet: 5,
        payout: -1,
      }),
    ).toThrow(RangeError);
  });

  it('resets persisted store stats to empty totals', () => {
    useStatsStore.getState().resetStats();
    useStatsStore.getState().recordHand({
      variant: 'JacksOrBetter',
      handRank: 'straightFlush',
      bet: 5,
      payout: 250,
    });

    expect(useStatsStore.getState().globalStats.handsPlayed).toBe(1);

    useStatsStore.getState().resetStats();

    expect({
      globalStats: useStatsStore.getState().globalStats,
      statsByVariant: useStatsStore.getState().statsByVariant,
    }).toEqual(createEmptyStatsState());
  });
});
