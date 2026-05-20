import { EngineError } from './types.js';
import type {
  Card,
  CardIndex,
  CreditAmount,
  DealtHand,
  GameConfig,
  GamePhase,
  GameSnapshot,
  HandResult,
  Rng,
  VideoPokerEngine,
} from './types.js';
import {
  assertSafeNonNegativeInteger,
  cloneCard,
  cloneCards,
  cloneResult,
  createDeck,
  defaultRng,
  evaluateHand,
  getPayout,
  makeDealtHand,
  normalizeHeldIndexes,
  shuffleDeck,
  validateConfig,
} from './util.js';

export class JacksOrBetterVideoPokerEngine implements VideoPokerEngine {
  private phase: GamePhase = 'ready';
  private credits: CreditAmount;
  private readonly rng: Rng;
  private activeBet?: CreditAmount;
  private hand?: Card[];
  private deck?: Card[];
  private drawCursor?: number;
  private lastResult?: HandResult;

  constructor(config: GameConfig) {
    validateConfig(config);
    this.credits = config.initialCredits;
    this.rng = config.rng ?? defaultRng();
  }

  snapshot(): GameSnapshot {
    if (this.phase === 'ready') {
      return { phase: 'ready', credits: this.credits };
    }
    if (this.phase === 'dealt') {
      return {
        phase: 'dealt',
        credits: this.credits,
        activeBet: this.activeBet,
        hand: cloneCards(this.requireHand()),
      };
    }
    return {
      phase: 'complete',
      credits: this.credits,
      lastResult: cloneResult(this.requireLastResult()),
    };
  }

  addCredits(amount: CreditAmount): GameSnapshot {
    if (this.phase === 'dealt') {
      throw new EngineError('invalidPhase');
    }
    assertSafeNonNegativeInteger(amount, 'invalidCreditAmount');
    const nextCredits = this.credits + amount;
    assertSafeNonNegativeInteger(nextCredits, 'invalidCreditAmount');

    this.credits = nextCredits;
    return this.snapshot();
  }

  deal(bet: CreditAmount): DealtHand {
    if (this.phase === 'dealt') {
      throw new EngineError('invalidPhase');
    }
    if (!Number.isInteger(bet) || bet < 1 || bet > 5) {
      throw new EngineError('invalidBet');
    }
    if (bet > this.credits) {
      throw new EngineError('insufficientCredits');
    }

    const shuffledDeck = shuffleDeck(createDeck(), this.rng);
    const nextCredits = this.credits - bet;
    const nextHand = shuffledDeck.slice(0, 5);

    this.phase = 'dealt';
    this.credits = nextCredits;
    this.activeBet = bet;
    this.hand = nextHand;
    this.deck = shuffledDeck;
    this.drawCursor = 5;
    this.lastResult = undefined;

    return makeDealtHand(this.credits, bet, nextHand);
  }

  draw(heldIndexes: readonly CardIndex[]): HandResult {
    if (this.phase !== 'dealt') {
      throw new EngineError('invalidPhase');
    }
    const normalizedHeldIndexes = normalizeHeldIndexes(heldIndexes);
    const heldSet = new Set<number>(normalizedHeldIndexes);
    const currentHand = this.requireHand();
    const deck = this.requireDeck();
    let cursor = this.drawCursor ?? 5;
    const finalHand = cloneCards(currentHand);

    for (let index = 0; index < 5; index += 1) {
      if (!heldSet.has(index)) {
        const replacement = deck[cursor];
        if (!replacement) {
          throw new EngineError('invalidDeck');
        }
        finalHand[index] = cloneCard(replacement);
        cursor += 1;
      }
    }

    const handRank = evaluateHand(finalHand);
    const bet = this.activeBet ?? 0;
    const payout = getPayout(handRank, bet);
    const nextCredits = this.credits + payout;
    assertSafeNonNegativeInteger(nextCredits, 'invalidCreditAmount');

    const result: HandResult = {
      phase: 'complete',
      finalHand: cloneCards(finalHand),
      heldIndexes: [...normalizedHeldIndexes],
      handRank,
      bet,
      payout,
      netCredits: payout - bet,
      credits: nextCredits,
    };

    this.phase = 'complete';
    this.credits = nextCredits;
    this.activeBet = undefined;
    this.hand = undefined;
    this.deck = undefined;
    this.drawCursor = undefined;
    this.lastResult = cloneResult(result);

    return cloneResult(result);
  }

  private requireHand(): Card[] {
    if (!this.hand) {
      throw new EngineError('invalidPhase');
    }
    return this.hand;
  }

  private requireDeck(): Card[] {
    if (!this.deck) {
      throw new EngineError('invalidDeck');
    }
    return this.deck;
  }

  private requireLastResult(): HandResult {
    if (!this.lastResult) {
      throw new EngineError('invalidPhase');
    }
    return this.lastResult;
  }
}
