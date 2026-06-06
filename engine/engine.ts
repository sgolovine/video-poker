import { EngineError } from './types';
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
} from './types';
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
} from './util';

export class JacksOrBetterVideoPokerEngine implements VideoPokerEngine {
  private phase: GamePhase = 'ready';
  private credits: CreditAmount;
  private readonly rng: Rng;
  private activeBet?: CreditAmount;
  private hand?: Card[];
  private deck?: Card[];
  private drawCursor?: number;
  private lastResult?: HandResult;

  /**
   * @public
   * @description Creates a Jacks-or-Better engine with validated credits and an optional deterministic RNG.
   * @param {GameConfig} config - The game configuration.
   * @param {'JacksOrBetter'} config.variant - The supported game variant.
   * @param {1} config.minBetCredits - The minimum allowed bet.
   * @param {5} config.maxBetCredits - The maximum allowed bet.
   * @param {CreditAmount} config.initialCredits - The starting credit balance.
   * @param {Rng} [config.rng] - Optional RNG for deterministic shuffles.
   * @returns {JacksOrBetterVideoPokerEngine} A configured video poker engine instance.
   * @example
   * new JacksOrBetterVideoPokerEngine({ variant: 'JacksOrBetter', minBetCredits: 1, maxBetCredits: 5, initialCredits: 100 });
   */
  constructor(config: GameConfig) {
    validateConfig(config);
    this.credits = config.initialCredits;
    this.rng = config.rng ?? defaultRng();
  }

  /**
   * @public
   * @description Returns an immutable snapshot of the current game state.
   * @returns {GameSnapshot} The current phase, credits, and any phase-specific hand state.
   * @example
   * engine.snapshot();
   */
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

  /**
   * @public
   * @description Adds credits when a hand is not actively dealt.
   * @param {CreditAmount} amount - The non-negative credit amount to add.
   * @returns {GameSnapshot} The updated game snapshot.
   * @example
   * engine.addCredits(25);
   */
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

  /**
   * @public
   * @description Starts a round by shuffling a fresh deck, taking the bet, and dealing five cards.
   * @param {CreditAmount} bet - The one-to-five credit bet for the round.
   * @returns {DealtHand} The dealt hand and remaining credits.
   * @example
   * engine.deal(5);
   */
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

  /**
   * @public
   * @description Completes the current round by replacing unheld cards and settling the payout.
   * @param {readonly CardIndex[]} heldIndexes - The zero-based card indexes to keep from the dealt hand.
   * @returns {HandResult} The completed hand result and updated credits.
   * @example
   * engine.draw([0, 3]);
   */
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

  /**
   * @private
   * @description Returns the active hand or fails if no hand is currently dealt.
   * @returns {Card[]} The current mutable hand state.
   * @example
   * this.requireHand();
   */
  private requireHand(): Card[] {
    if (!this.hand) {
      throw new EngineError('invalidPhase');
    }
    return this.hand;
  }

  /**
   * @private
   * @description Returns the active deck or fails if deck state is unavailable.
   * @returns {Card[]} The current mutable deck state.
   * @example
   * this.requireDeck();
   */
  private requireDeck(): Card[] {
    if (!this.deck) {
      throw new EngineError('invalidDeck');
    }
    return this.deck;
  }

  /**
   * @private
   * @description Returns the most recent completed result or fails if no result exists.
   * @returns {HandResult} The last completed hand result.
   * @example
   * this.requireLastResult();
   */
  private requireLastResult(): HandResult {
    if (!this.lastResult) {
      throw new EngineError('invalidPhase');
    }
    return this.lastResult;
  }
}
