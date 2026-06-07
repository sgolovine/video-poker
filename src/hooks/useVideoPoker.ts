import { useEffect, useRef, useState } from 'react';
import { JacksOrBetterVideoPokerEngine, type Card, type CardIndex, type GameSnapshot, type HandRank } from '../../engine';
import { HAND_LABELS } from '../data/payTable';
import { useUserSettingsStore, type GameSpeed } from '../stores/userSettings';

interface LastResultView {
  readonly label: string;
  readonly payout: number;
  readonly rank: HandRank;
}

interface SpeedTiming {
  readonly cardDelayMs: number;
  readonly nextHandDelayMs: number;
}

const INITIAL_CREDITS = 100;
const HAND_SIZE = 5;
const SPEED_TIMINGS: Readonly<Record<GameSpeed, SpeedTiming>> = {
  slow: {
    cardDelayMs: 420,
    nextHandDelayMs: 650,
  },
  medium: {
    cardDelayMs: 240,
    nextHandDelayMs: 350,
  },
  fast: {
    cardDelayMs: 110,
    nextHandDelayMs: 180,
  },
  turbo: {
    cardDelayMs: 35,
    nextHandDelayMs: 40,
  },
};

export function useVideoPoker() {
  const speed = useUserSettingsStore((state) => state.speed);
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
  const [visibleHand, setVisibleHand] = useState<readonly (Card | undefined)[]>([]);
  const [inputLocked, setInputLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const phase = snapshot.phase;
  const lastResult: LastResultView | undefined = snapshot.lastResult
    ? {
        label: HAND_LABELS[snapshot.lastResult.handRank],
        payout: snapshot.lastResult.payout,
        rank: snapshot.lastResult.handRank,
      }
    : undefined;

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  function clearTimers() {
    timerRef.current.forEach((timer) => clearTimeout(timer));
    timerRef.current = [];
  }

  function queueTimer(callback: () => void, delayMs: number) {
    const timer = setTimeout(callback, delayMs);
    timerRef.current.push(timer);
  }

  function refresh() {
    setSnapshot(engine.snapshot());
  }

  function lockForAnimation(finalDelayMs: number) {
    setInputLocked(true);
    queueTimer(() => {
      setInputLocked(false);
    }, finalDelayMs);
  }

  function animateInitialDeal(hand: readonly Card[]) {
    clearTimers();
    const timing = SPEED_TIMINGS[speed];
    setVisibleHand(Array<Card | undefined>(HAND_SIZE).fill(undefined));
    lockForAnimation(timing.cardDelayMs * hand.length + 1);

    hand.forEach((card, index) => {
      queueTimer(() => {
        setVisibleHand((current) => {
          const nextHand = [...current];
          nextHand[index] = card;
          return nextHand;
        });
      }, timing.cardDelayMs * (index + 1));
    });
  }

  function animateDraw(finalHand: readonly Card[], heldSet: ReadonlySet<number>) {
    clearTimers();
    const timing = SPEED_TIMINGS[speed];
    const drawIndexes = Array.from({ length: HAND_SIZE }, (_, index) => index).filter((index) => !heldSet.has(index));
    const baseHand = finalHand.map((card, index) => (heldSet.has(index) ? card : undefined));

    setVisibleHand(baseHand);
    lockForAnimation(timing.cardDelayMs * drawIndexes.length + timing.nextHandDelayMs);

    drawIndexes.forEach((cardIndex, revealIndex) => {
      queueTimer(() => {
        setVisibleHand((current) => {
          const nextHand = [...current];
          nextHand[cardIndex] = finalHand[cardIndex];
          return nextHand;
        });
      }, timing.cardDelayMs * (revealIndex + 1));
    });
  }

  function changeBet(nextBet: number) {
    if (phase === 'dealt' || inputLocked) {
      return;
    }
    setBet(Math.min(5, Math.max(1, nextBet)));
  }

  function deal() {
    if (phase === 'dealt' || inputLocked || snapshot.credits < bet) {
      return;
    }
    const dealtHand = engine.deal(bet);
    setHeldIndexes([]);
    refresh();
    animateInitialDeal(dealtHand.hand);
  }

  function draw() {
    if (phase !== 'dealt' || inputLocked) {
      return;
    }
    const heldSet = new Set<number>(heldIndexes);
    const result = engine.draw(heldIndexes as readonly CardIndex[]);
    setHeldIndexes([]);
    refresh();
    animateDraw(result.finalHand, heldSet);
  }

  function toggleHold(index: number) {
    if (phase !== 'dealt' || inputLocked) {
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
    inputLocked,
    canDeal: !inputLocked && phase !== 'dealt' && snapshot.credits >= bet,
    changeBet,
    deal,
    draw,
    toggleHold,
  };
}
