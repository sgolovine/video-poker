import { useEffect, useRef, useState } from 'react';
import {
  VariantVideoPokerEngine,
  getDefaultPayTable,
  type Card,
  type CardIndex,
  type GameSnapshot,
  type GameVariant,
  type HandRank,
  type PayTableConfig,
} from '../engine';
import { HAND_LABELS } from '../data/payTable';
import { useStatsStore } from '../stores/stats';
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

const HAND_SIZE = 5;
const PAY_TABLE_COLUMN_COUNT = 5;
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
};

export function useVideoPoker() {
  const speed = useUserSettingsStore((state) => state.speed);
  const balance = useUserSettingsStore((state) => state.balance);
  const selectedVariant = useUserSettingsStore((state) => state.selectedVariant);
  const payTablesByVariant = useUserSettingsStore((state) => state.payTablesByVariant);
  const setBalance = useUserSettingsStore((state) => state.setBalance);
  const recordHand = useStatsStore((state) => state.recordHand);
  const engineRef = useRef<VariantVideoPokerEngine | undefined>(undefined);
  const engineVariantRef = useRef<GameVariant | undefined>(undefined);
  const pays = payTablesByVariant[selectedVariant] ?? getDefaultPayTable(selectedVariant);

  if (!engineRef.current) {
    engineRef.current = new VariantVideoPokerEngine({
      variant: selectedVariant,
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: balance,
      payTable: pays,
    });
    engineVariantRef.current = selectedVariant;
  }

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => getEngine().snapshot());
  const [bet, setBet] = useState(5);
  const [heldIndexes, setHeldIndexes] = useState<number[]>([]);
  const [visibleHand, setVisibleHand] = useState<readonly (Card | undefined)[]>([]);
  const [activePayTableColumn, setActivePayTableColumn] = useState<number | undefined>(bet);
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

  useEffect(() => {
    if (engineVariantRef.current !== selectedVariant) {
      replaceMachine(balance, selectedVariant, pays);
      return;
    }
    const nextSnapshot = getEngine().setPayTable(pays);
    setSnapshot(nextSnapshot);
  }, [balance, pays, selectedVariant]);

  function getEngine() {
    const engine = engineRef.current;
    if (!engine) {
      throw new Error('Video poker engine has not been initialized.');
    }
    return engine;
  }

  function clearTimers() {
    timerRef.current.forEach((timer) => clearTimeout(timer));
    timerRef.current = [];
  }

  function queueTimer(callback: () => void, delayMs: number) {
    const timer = setTimeout(callback, delayMs);
    timerRef.current.push(timer);
  }

  function refresh() {
    const nextSnapshot = getEngine().snapshot();
    setSnapshot(nextSnapshot);
    setBalance(nextSnapshot.credits);
  }

  function replaceMachine(nextBalance: number, nextVariant: GameVariant, nextPays: PayTableConfig) {
    clearTimers();
    const nextEngine = new VariantVideoPokerEngine({
      variant: nextVariant,
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: nextBalance,
      payTable: nextPays,
    });

    engineRef.current = nextEngine;
    engineVariantRef.current = nextVariant;
    setBalance(nextBalance);
    setSnapshot(nextEngine.snapshot());
    setHeldIndexes([]);
    setVisibleHand([]);
    setActivePayTableColumn(bet);
    setInputLocked(false);
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
    const payTableAnimationMs = timing.cardDelayMs * (PAY_TABLE_COLUMN_COUNT + 1);
    const cardAnimationMs = timing.cardDelayMs * hand.length + 1;

    setVisibleHand(Array<Card | undefined>(HAND_SIZE).fill(undefined));
    setActivePayTableColumn(undefined);
    lockForAnimation(Math.max(cardAnimationMs, payTableAnimationMs));

    hand.forEach((card, index) => {
      queueTimer(
        () => {
          setVisibleHand((current) => {
            const nextHand = [...current];
            nextHand[index] = card;
            return nextHand;
          });
        },
        timing.cardDelayMs * (index + 1),
      );
    });

    Array.from({ length: PAY_TABLE_COLUMN_COUNT }, (_, index) => index + 1).forEach((column) => {
      queueTimer(() => {
        setActivePayTableColumn(column);
      }, timing.cardDelayMs * column);
    });

    queueTimer(() => {
      setActivePayTableColumn(bet);
    }, payTableAnimationMs);
  }

  function animateDraw(finalHand: readonly Card[], heldSet: ReadonlySet<number>) {
    clearTimers();
    const timing = SPEED_TIMINGS[speed];
    const drawIndexes = Array.from({ length: HAND_SIZE }, (_, index) => index).filter((index) => !heldSet.has(index));
    const baseHand = finalHand.map((card, index) => (heldSet.has(index) ? card : undefined));

    setVisibleHand(baseHand);
    lockForAnimation(timing.cardDelayMs * drawIndexes.length + timing.nextHandDelayMs);

    drawIndexes.forEach((cardIndex, revealIndex) => {
      queueTimer(
        () => {
          setVisibleHand((current) => {
            const nextHand = [...current];
            nextHand[cardIndex] = finalHand[cardIndex];
            return nextHand;
          });
        },
        timing.cardDelayMs * (revealIndex + 1),
      );
    });
  }

  function changeBet(nextBet: number) {
    if (phase === 'dealt' || inputLocked) {
      return;
    }
    const normalizedBet = Math.min(5, Math.max(1, nextBet));
    setBet(normalizedBet);
    setActivePayTableColumn(normalizedBet);
  }

  function deal() {
    if (phase === 'dealt' || inputLocked || snapshot.credits < bet) {
      return;
    }
    const dealtHand = getEngine().deal(bet);
    setHeldIndexes([]);
    refresh();
    animateInitialDeal(dealtHand.hand);
  }

  function draw() {
    if (phase !== 'dealt' || inputLocked) {
      return;
    }
    const heldSet = new Set<number>(heldIndexes);
    const result = getEngine().draw(heldIndexes as readonly CardIndex[]);
    recordHand(result);
    setHeldIndexes([]);
    refresh();
    animateDraw(result.finalHand, heldSet);
  }

  function toggleHold(index: number) {
    if (phase !== 'dealt' || inputLocked) {
      return;
    }
    setHeldIndexes((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index],
    );
  }

  function holdCard(index: number) {
    if (phase !== 'dealt' || inputLocked) {
      return;
    }
    setHeldIndexes((current) => (current.includes(index) ? current : [...current, index]));
  }

  return {
    bet,
    activePayTableColumn,
    credits: snapshot.credits,
    heldIndexes,
    lastResult,
    phase,
    selectedVariant,
    visibleHand,
    inputLocked,
    canDeal: !inputLocked && phase !== 'dealt' && snapshot.credits >= bet,
    changeBet,
    deal,
    draw,
    holdCard,
    replaceMachine,
    toggleHold,
  };
}
