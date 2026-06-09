import { useEffect, useReducer, useRef } from 'react';
import { HAND_LABELS } from '../../../data/payTable';
import { VariantVideoPokerEngine } from '../../../engine/engine';
import type { Card, CardIndex, GameVariant, HandRank, PayTableConfig } from '../../../engine/types';
import { getDefaultPayTable } from '../../../engine/util';
import { useStatsStore } from '../../../stores/stats';
import { type GameSpeed, useUserSettingsStore } from '../../../stores/userSettings';

interface LastResultView {
  readonly label: string;
  readonly payout: number;
  readonly rank: HandRank;
}

interface SpeedTiming {
  readonly cardDelayMs: number;
  readonly nextHandDelayMs: number;
}

interface GameViewState {
  readonly bet: number;
  readonly heldIndexes: readonly number[];
  readonly visibleHand: readonly (Card | undefined)[];
  readonly activePayTableColumn?: number;
  readonly inputLocked: boolean;
}

type GameViewAction =
  | { readonly type: 'patch'; readonly patch: Partial<GameViewState> }
  | { readonly type: 'revealCard'; readonly index: number; readonly card: Card }
  | { readonly type: 'toggleHold'; readonly index: number }
  | { readonly type: 'holdCard'; readonly index: number };

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

function gameViewReducer(state: GameViewState, action: GameViewAction): GameViewState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'revealCard': {
      const nextHand = [...state.visibleHand];
      nextHand[action.index] = action.card;
      return { ...state, visibleHand: nextHand };
    }
    case 'toggleHold':
      return {
        ...state,
        heldIndexes: state.heldIndexes.includes(action.index)
          ? state.heldIndexes.filter((value) => value !== action.index)
          : [...state.heldIndexes, action.index],
      };
    case 'holdCard':
      return state.heldIndexes.includes(action.index)
        ? state
        : { ...state, heldIndexes: [...state.heldIndexes, action.index] };
  }
}

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

  const [, forceGameRender] = useReducer((revision: number) => revision + 1, 0);
  const [{ bet, heldIndexes, visibleHand, activePayTableColumn, inputLocked }, dispatchView] = useReducer(
    gameViewReducer,
    {
      bet: 5,
      heldIndexes: [],
      visibleHand: [],
      activePayTableColumn: 5,
      inputLocked: false,
    },
  );
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const snapshot = getEngine().snapshot();
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
    const engine = getEngine();
    if (engineVariantRef.current !== selectedVariant || engine.snapshot().credits !== balance) {
      timerRef.current.forEach((timer) => clearTimeout(timer));
      timerRef.current = [];
      const nextEngine = new VariantVideoPokerEngine({
        variant: selectedVariant,
        minBetCredits: 1,
        maxBetCredits: 5,
        initialCredits: balance,
        payTable: pays,
      });

      engineRef.current = nextEngine;
      engineVariantRef.current = selectedVariant;
      setBalance(balance);
      forceGameRender();
      dispatchView({
        type: 'patch',
        patch: {
          heldIndexes: [],
          visibleHand: [],
          activePayTableColumn: bet,
          inputLocked: false,
        },
      });
      return;
    }
    engine.setPayTable(pays);
    forceGameRender();
  }, [balance, bet, pays, selectedVariant, setBalance]);

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
    setBalance(nextSnapshot.credits);
    forceGameRender();
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
    forceGameRender();
    dispatchView({
      type: 'patch',
      patch: {
        heldIndexes: [],
        visibleHand: [],
        activePayTableColumn: bet,
        inputLocked: false,
      },
    });
  }

  function lockForAnimation(finalDelayMs: number) {
    dispatchView({ type: 'patch', patch: { inputLocked: true } });
    queueTimer(() => {
      dispatchView({ type: 'patch', patch: { inputLocked: false } });
    }, finalDelayMs);
  }

  function animateInitialDeal(hand: readonly Card[]) {
    clearTimers();
    const timing = SPEED_TIMINGS[speed];
    const payTableAnimationMs = timing.cardDelayMs * (PAY_TABLE_COLUMN_COUNT + 1);
    const cardAnimationMs = timing.cardDelayMs * hand.length + 1;

    dispatchView({ type: 'patch', patch: { visibleHand: Array<Card | undefined>(HAND_SIZE).fill(undefined) } });
    dispatchView({ type: 'patch', patch: { activePayTableColumn: undefined } });
    lockForAnimation(Math.max(cardAnimationMs, payTableAnimationMs));

    hand.forEach((card, index) => {
      queueTimer(
        () => {
          dispatchView({ type: 'revealCard', index, card });
        },
        timing.cardDelayMs * (index + 1),
      );
    });

    Array.from({ length: PAY_TABLE_COLUMN_COUNT }, (_, index) => index + 1).forEach((column) => {
      queueTimer(() => {
        dispatchView({ type: 'patch', patch: { activePayTableColumn: column } });
      }, timing.cardDelayMs * column);
    });

    queueTimer(() => {
      dispatchView({ type: 'patch', patch: { activePayTableColumn: bet } });
    }, payTableAnimationMs);
  }

  function animateDraw(finalHand: readonly Card[], heldSet: ReadonlySet<number>) {
    clearTimers();
    const timing = SPEED_TIMINGS[speed];
    const drawIndexes = Array.from({ length: HAND_SIZE }, (_, index) => index).filter((index) => !heldSet.has(index));
    const baseHand = finalHand.map((card, index) => (heldSet.has(index) ? card : undefined));

    dispatchView({ type: 'patch', patch: { visibleHand: baseHand } });
    lockForAnimation(timing.cardDelayMs * drawIndexes.length + timing.nextHandDelayMs);

    drawIndexes.forEach((cardIndex, revealIndex) => {
      queueTimer(
        () => {
          dispatchView({ type: 'revealCard', index: cardIndex, card: finalHand[cardIndex] });
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
    dispatchView({ type: 'patch', patch: { bet: normalizedBet, activePayTableColumn: normalizedBet } });
  }

  function deal() {
    if (phase === 'dealt' || inputLocked || snapshot.credits < bet) {
      return;
    }
    const dealtHand = getEngine().deal(bet);
    dispatchView({ type: 'patch', patch: { heldIndexes: [] } });
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
    dispatchView({ type: 'patch', patch: { heldIndexes: [] } });
    refresh();
    animateDraw(result.finalHand, heldSet);
  }

  function toggleHold(index: number) {
    if (phase !== 'dealt' || inputLocked) {
      return;
    }
    dispatchView({ type: 'toggleHold', index });
  }

  function holdCard(index: number) {
    if (phase !== 'dealt' || inputLocked) {
      return;
    }
    dispatchView({ type: 'holdCard', index });
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
