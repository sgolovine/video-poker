import { useState } from 'react';
import { JacksOrBetterVideoPokerEngine, type CardIndex, type GameSnapshot, type HandRank } from '../../engine';
import { HAND_LABELS } from '../data/payTable';

interface LastResultView {
  readonly label: string;
  readonly payout: number;
  readonly rank: HandRank;
}

const INITIAL_CREDITS = 100;

export function useVideoPoker() {
  const [engine] = useState(
    () =>
      new JacksOrBetterVideoPokerEngine({
        variant: 'JacksOrBetter',
        minBetCredits: 1,
        maxBetCredits: 5,
        initialCredits: INITIAL_CREDITS,
      }),
  );
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => engine.snapshot());
  const [bet, setBet] = useState(5);
  const [heldIndexes, setHeldIndexes] = useState<number[]>([]);

  const phase = snapshot.phase;
  const visibleHand = phase === 'dealt' ? snapshot.hand ?? [] : snapshot.lastResult?.finalHand ?? [];
  const lastResult: LastResultView | undefined = snapshot.lastResult
    ? {
        label: HAND_LABELS[snapshot.lastResult.handRank],
        payout: snapshot.lastResult.payout,
        rank: snapshot.lastResult.handRank,
      }
    : undefined;

  function refresh() {
    setSnapshot(engine.snapshot());
  }

  function changeBet(nextBet: number) {
    if (phase === 'dealt') {
      return;
    }
    setBet(Math.min(5, Math.max(1, nextBet)));
  }

  function deal() {
    if (phase === 'dealt' || snapshot.credits < bet) {
      return;
    }
    engine.deal(bet);
    setHeldIndexes([]);
    refresh();
  }

  function draw() {
    if (phase !== 'dealt') {
      return;
    }
    engine.draw(heldIndexes as readonly CardIndex[]);
    setHeldIndexes([]);
    refresh();
  }

  function toggleHold(index: number) {
    if (phase !== 'dealt') {
      return;
    }
    setHeldIndexes((current) => (current.includes(index) ? current.filter((value) => value !== index) : [...current, index]));
  }

  return {
    bet,
    credits: snapshot.credits,
    heldIndexes,
    lastResult,
    phase,
    visibleHand,
    canDeal: phase !== 'dealt' && snapshot.credits >= bet,
    changeBet,
    deal,
    draw,
    toggleHold,
  };
}
