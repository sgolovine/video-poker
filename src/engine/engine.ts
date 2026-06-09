import { EngineError } from './types';
import type {
  Card,
  CardIndex,
  CreditAmount,
  DealtHand,
  GameConfig,
  GamePhase,
  GameSnapshot,
  GameVariant,
  HandResult,
  PayTableConfig,
  Rng,
  VideoPokerEngine,
} from './types';
import {
  assertSafeNonNegativeInteger,
  cloneCard,
  cloneCards,
  clonePayTable,
  cloneResult,
  createDeck,
  defaultRng,
  evaluateHand,
  getDefaultPayTable,
  getPayout,
  makeDealtHand,
  normalizeHeldIndexes,
  shuffleDeck,
  validateConfig,
} from './util';

export class VariantVideoPokerEngine implements VideoPokerEngine {
  private phase: GamePhase = 'ready';
  private credits: CreditAmount;
  private readonly variant: GameVariant;
  private readonly rng: Rng;
  private payTable: PayTableConfig;
  private activeBet?: CreditAmount;
  private hand?: Card[];
  private deck?: Card[];
  private drawCursor?: number;
  private lastResult?: HandResult;

  constructor(config: GameConfig) {
    validateConfig(config);
    this.variant = config.variant;
    this.credits = config.initialCredits;
    this.payTable = clonePayTable(config.variant, config.payTable ?? getDefaultPayTable(config.variant));
    this.rng = config.rng ?? defaultRng();
  }

  snapshot(): GameSnapshot {
    if (this.phase === 'ready') {
      return { phase: 'ready', variant: this.variant, credits: this.credits };
    }
    if (this.phase === 'dealt') {
      return {
        phase: 'dealt',
        variant: this.variant,
        credits: this.credits,
        activeBet: this.activeBet,
        hand: cloneCards(this.requireHand()),
      };
    }
    return {
      phase: 'complete',
      variant: this.variant,
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

  setPayTable(payTable: PayTableConfig): GameSnapshot {
    this.payTable = clonePayTable(this.variant, payTable);
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

    const shuffledDeck = shuffleDeck(this.variant, createDeck(this.variant), this.rng);
    const nextCredits = this.credits - bet;
    const nextHand = shuffledDeck.slice(0, 5);

    this.phase = 'dealt';
    this.credits = nextCredits;
    this.activeBet = bet;
    this.hand = nextHand;
    this.deck = shuffledDeck;
    this.drawCursor = 5;
    this.lastResult = undefined;

    return makeDealtHand(this.variant, this.credits, bet, nextHand);
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

    const handRank = evaluateHand(this.variant, finalHand);
    const bet = this.activeBet ?? 0;
    const payout = getPayout(this.variant, handRank, bet, this.payTable);
    const nextCredits = this.credits + payout;
    assertSafeNonNegativeInteger(nextCredits, 'invalidCreditAmount');

    const result: HandResult = {
      phase: 'complete',
      variant: this.variant,
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

export class JacksOrBetterVideoPokerEngine extends VariantVideoPokerEngine {
  constructor(config: Omit<GameConfig, 'variant'> & { readonly variant?: 'JacksOrBetter' }) {
    super({ ...config, variant: 'JacksOrBetter' });
  }
}

export function createVideoPokerEngine(config: GameConfig): VideoPokerEngine {
  return new VariantVideoPokerEngine(config);
}
