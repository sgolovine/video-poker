import {
  EngineError,
  type Card,
  type CardIndex,
  type CreditAmount,
  type DealtHand,
  type EngineErrorCode,
  type GameConfig,
  type HandRank,
  type HandResult,
  type PayTableConfig,
  type PayoutRow,
  type Rank,
  type Rng,
  type Suit,
} from './types';

export const SUITS: readonly Suit[] = Object.freeze(['clubs', 'diamonds', 'hearts', 'spades']);
export const RANKS: readonly Rank[] = Object.freeze(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);

const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

/**
 * @private
 * @description Freezes one pay-table row while preserving its five bet columns.
 * @param {[number, number, number, number, number]} row - The payout values for one through five credits.
 * @returns {PayoutRow} The frozen payout row.
 * @example
 * payoutRow([1, 2, 3, 4, 5]);
 */
function payoutRow(row: [number, number, number, number, number]): PayoutRow {
  return Object.freeze(row);
}

export const PAY_TABLE: Readonly<Record<HandRank, PayoutRow>> = Object.freeze({
  royalFlush: payoutRow([250, 500, 750, 1000, 4000]),
  straightFlush: payoutRow([50, 100, 150, 200, 250]),
  fourOfAKind: payoutRow([25, 50, 75, 100, 125]),
  fullHouse: payoutRow([9, 18, 27, 36, 45]),
  flush: payoutRow([6, 12, 18, 24, 30]),
  straight: payoutRow([4, 8, 12, 16, 20]),
  threeOfAKind: payoutRow([3, 6, 9, 12, 15]),
  twoPair: payoutRow([2, 4, 6, 8, 10]),
  jacksOrBetter: payoutRow([1, 2, 3, 4, 5]),
  nothing: payoutRow([0, 0, 0, 0, 0]),
});

const PAY_TABLE_RANKS: readonly HandRank[] = Object.freeze([
  'royalFlush',
  'straightFlush',
  'fourOfAKind',
  'fullHouse',
  'flush',
  'straight',
  'threeOfAKind',
  'twoPair',
  'jacksOrBetter',
  'nothing',
]);

/**
 * @public
 * @description Creates a validated immutable copy of a complete pay table.
 * @param {PayTableConfig} payTable - The complete payout table for every hand rank.
 * @returns {PayTableConfig} A frozen detached pay table.
 * @example
 * clonePayTable(PAY_TABLE);
 */
export function clonePayTable(payTable: PayTableConfig): PayTableConfig {
  const nextPayTable = {} as Record<HandRank, PayoutRow>;

  for (const rank of PAY_TABLE_RANKS) {
    const row = payTable[rank];
    if (!Array.isArray(row) || row.length !== 5) {
      throw new EngineError('invalidConfig');
    }

    const nextRow = row.map((payout) => {
      assertSafeNonNegativeInteger(payout, 'invalidConfig');
      return payout;
    }) as [number, number, number, number, number];

    nextPayTable[rank] = payoutRow(nextRow);
  }

  return Object.freeze(nextPayTable);
}

/**
 * @public
 * @description Creates a detached copy of a card value.
 * @param {Card} card - The card to copy.
 * @param {Rank} card.rank - The card rank.
 * @param {Suit} card.suit - The card suit.
 * @returns {Card} A new card with the same rank and suit.
 * @example
 * cloneCard({ rank: 'A', suit: 'spades' });
 */
export function cloneCard(card: Card): Card {
  return { rank: card.rank, suit: card.suit };
}

/**
 * @public
 * @description Creates detached copies of every card in a hand or deck.
 * @param {readonly Card[]} cards - The cards to copy.
 * @returns {Card[]} New card objects in the same order.
 * @example
 * cloneCards([{ rank: 'A', suit: 'spades' }]);
 */
export function cloneCards(cards: readonly Card[]): Card[] {
  return cards.map(cloneCard);
}

/**
 * @private
 * @description Builds the uniqueness key used when validating cards.
 * @param {Card} card - The card to key.
 * @param {Rank} card.rank - The card rank.
 * @param {Suit} card.suit - The card suit.
 * @returns {string} The rank-and-suit key for the card.
 * @example
 * cardKey({ rank: 'K', suit: 'hearts' });
 */
function cardKey(card: Card): string {
  return `${card.rank}-${card.suit}`;
}

/**
 * @public
 * @description Asserts that a credit-like value is a safe non-negative integer.
 * @param {number} value - The numeric value to validate.
 * @param {EngineErrorCode} code - The error code to throw when validation fails.
 * @returns void
 * @example
 * assertSafeNonNegativeInteger(100, 'invalidCreditAmount');
 */
export function assertSafeNonNegativeInteger(value: number, code: EngineErrorCode): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new EngineError(code);
  }
}

/**
 * @private
 * @description Asserts that a deck contains exactly one valid instance of every canonical card.
 * @param {readonly Card[]} cards - The deck to validate.
 * @returns void
 * @example
 * assertValidDeck(createDeck());
 */
function assertValidDeck(cards: readonly Card[]): void {
  if (cards.length !== 52) {
    throw new EngineError('invalidDeck');
  }
  const seen = new Set<string>();
  for (const card of cards) {
    if (!RANKS.includes(card.rank) || !SUITS.includes(card.suit)) {
      throw new EngineError('invalidDeck');
    }
    const key = cardKey(card);
    if (seen.has(key)) {
      throw new EngineError('invalidDeck');
    }
    seen.add(key);
  }
}

/**
 * @private
 * @description Asserts that a hand contains five unique valid cards.
 * @param {readonly Card[]} cards - The hand to validate.
 * @returns void
 * @example
 * assertValidHand(createDeck().slice(0, 5));
 */
function assertValidHand(cards: readonly Card[]): void {
  if (cards.length !== 5) {
    throw new EngineError('invalidDeck');
  }
  const seen = new Set<string>();
  for (const card of cards) {
    if (!RANKS.includes(card.rank) || !SUITS.includes(card.suit)) {
      throw new EngineError('invalidDeck');
    }
    const key = cardKey(card);
    if (seen.has(key)) {
      throw new EngineError('invalidDeck');
    }
    seen.add(key);
  }
}

/**
 * @public
 * @description Creates the default RNG backed by Math.random.
 * @returns {Rng} An RNG that produces integer indexes from Math.random.
 * @example
 * const rng = defaultRng();
 * rng.nextInt(52);
 */
export function defaultRng(): Rng {
  return {
    /**
     * @public
     * @description Returns a random integer in the half-open range [0, maxExclusive).
     * @param {number} maxExclusive - The exclusive upper bound.
     * @returns {number} A random integer less than maxExclusive.
     * @example
     * defaultRng().nextInt(5);
     */
    nextInt(maxExclusive: number): number {
      return Math.floor(Math.random() * maxExclusive);
    },
  };
}

/**
 * @public
 * @description Creates a canonical 52-card deck ordered by suit, then rank.
 * @returns {Card[]} A new ordered deck containing every supported card once.
 * @example
 * const deck = createDeck();
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/**
 * @public
 * @description Returns a validated Fisher-Yates shuffle of a deck using the supplied RNG.
 * @param {readonly Card[]} deck - The complete canonical deck to shuffle.
 * @param {Rng} rng - The random number generator used for swap indexes.
 * @param {Function} rng.nextInt - Returns a random integer below an exclusive upper bound.
 * @returns {Card[]} A shuffled copy of the deck.
 * @example
 * shuffleDeck(createDeck(), defaultRng());
 */
export function shuffleDeck(deck: readonly Card[], rng: Rng): Card[] {
  const shuffled = cloneCards(deck);
  assertValidDeck(shuffled);

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    if (!Number.isInteger(j) || j < 0 || j >= i + 1) {
      throw new EngineError('invalidRngOutput');
    }
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  assertValidDeck(shuffled);
  return shuffled;
}

/**
 * @private
 * @description Checks whether a hand's unique rank values form a poker straight.
 * @param {readonly Card[]} cards - The cards to inspect.
 * @returns {boolean} True when the cards form a straight.
 * @example
 * isStraight(createDeck().slice(0, 5));
 */
function isStraight(cards: readonly Card[]): boolean {
  const values = [...new Set(cards.map((card) => RANK_VALUES[card.rank]))].sort((a, b) => a - b);
  if (values.length !== 5) {
    return false;
  }
  if (values.join(',') === '2,3,4,5,14') {
    return true;
  }
  return values.every((value, index) => index === 0 || value === values[index - 1] + 1);
}

/**
 * @private
 * @description Checks whether a hand contains exactly ten through ace.
 * @param {readonly Card[]} cards - The cards to inspect.
 * @returns {boolean} True when the hand contains a royal rank set.
 * @example
 * isRoyal([
 *   { rank: '10', suit: 'spades' },
 *   { rank: 'J', suit: 'spades' },
 *   { rank: 'Q', suit: 'spades' },
 *   { rank: 'K', suit: 'spades' },
 *   { rank: 'A', suit: 'spades' },
 * ]);
 */
function isRoyal(cards: readonly Card[]): boolean {
  const ranks = new Set(cards.map((card) => card.rank));
  return ranks.size === 5 && ['10', 'J', 'Q', 'K', 'A'].every((rank) => ranks.has(rank as Rank));
}

/**
 * @public
 * @description Evaluates a five-card Jacks-or-Better hand from strongest to weakest rank.
 * @param {readonly Card[]} cards - The five cards to evaluate.
 * @returns {HandRank} The best matching hand rank.
 * @example
 * evaluateHand([
 *   { rank: 'J', suit: 'clubs' },
 *   { rank: 'J', suit: 'spades' },
 *   { rank: '2', suit: 'diamonds' },
 *   { rank: '7', suit: 'hearts' },
 *   { rank: '9', suit: 'clubs' },
 * ]);
 */
export function evaluateHand(cards: readonly Card[]): HandRank {
  assertValidHand(cards);

  const flush = cards.every((card) => card.suit === cards[0]?.suit);
  const straight = isStraight(cards);
  const countsByRank = new Map<Rank, number>();
  for (const card of cards) {
    countsByRank.set(card.rank, (countsByRank.get(card.rank) ?? 0) + 1);
  }
  const counts = [...countsByRank.values()].sort((a, b) => b - a);

  if (flush && isRoyal(cards)) {
    return 'royalFlush';
  }
  if (flush && straight) {
    return 'straightFlush';
  }
  if (counts[0] === 4) {
    return 'fourOfAKind';
  }
  if (counts[0] === 3 && counts[1] === 2) {
    return 'fullHouse';
  }
  if (flush) {
    return 'flush';
  }
  if (straight) {
    return 'straight';
  }
  if (counts[0] === 3) {
    return 'threeOfAKind';
  }
  if (counts[0] === 2 && counts[1] === 2) {
    return 'twoPair';
  }
  if (counts[0] === 2) {
    const pairRank = [...countsByRank.entries()].find(([, count]) => count === 2)?.[0];
    if (pairRank && ['J', 'Q', 'K', 'A'].includes(pairRank)) {
      return 'jacksOrBetter';
    }
  }

  return 'nothing';
}

/**
 * @public
 * @description Returns the configured payout for a hand rank and a one-to-five credit bet.
 * @param {HandRank} handRank - The evaluated hand rank.
 * @param {number} bet - The credit bet from one through five.
 * @returns {CreditAmount} The payout for the hand rank and bet size.
 * @example
 * getPayout('royalFlush', 5);
 */
export function getPayout(handRank: HandRank, bet: number, payTable: PayTableConfig = PAY_TABLE): CreditAmount {
  if (!Number.isInteger(bet) || bet < 1 || bet > 5) {
    throw new EngineError('invalidBet');
  }
  return payTable[handRank][bet - 1];
}

/**
 * @public
 * @description Validates that a game config matches the supported Jacks-or-Better rules.
 * @param {GameConfig} config - The game configuration to validate.
 * @param {'JacksOrBetter'} config.variant - The supported game variant.
 * @param {1} config.minBetCredits - The minimum allowed bet.
 * @param {5} config.maxBetCredits - The maximum allowed bet.
 * @param {CreditAmount} config.initialCredits - The starting credit balance.
 * @param {Rng} [config.rng] - Optional RNG for deterministic shuffles.
 * @returns void
 * @example
 * validateConfig({ variant: 'JacksOrBetter', minBetCredits: 1, maxBetCredits: 5, initialCredits: 100 });
 */
export function validateConfig(config: GameConfig): void {
  if (config.variant !== 'JacksOrBetter' || config.minBetCredits !== 1 || config.maxBetCredits !== 5) {
    throw new EngineError('invalidConfig');
  }
  assertSafeNonNegativeInteger(config.initialCredits, 'invalidCreditAmount');
  if (config.payTable) {
    clonePayTable(config.payTable);
  }
}

/**
 * @public
 * @description Validates, deduplicates, and sorts held indexes for a draw request.
 * @param {readonly CardIndex[]} heldIndexes - The zero-based card indexes to hold.
 * @returns {CardIndex[]} Sorted held indexes.
 * @example
 * normalizeHeldIndexes([4, 0, 2]);
 */
export function normalizeHeldIndexes(heldIndexes: readonly CardIndex[]): CardIndex[] {
  const normalized: number[] = [];
  const seen = new Set<number>();

  for (const index of heldIndexes) {
    if (!Number.isInteger(index) || index < 0 || index > 4) {
      throw new EngineError('invalidHeldIndexes');
    }
    if (seen.has(index)) {
      throw new EngineError('invalidHeldIndexes');
    }
    seen.add(index);
    normalized.push(index);
  }

  return normalized.sort((a, b) => a - b) as CardIndex[];
}

/**
 * @public
 * @description Creates a detached copy of a completed hand result.
 * @param {HandResult} result - The completed result to copy.
 * @param {'complete'} result.phase - The completed phase marker.
 * @param {readonly Card[]} result.finalHand - The final hand cards.
 * @param {readonly CardIndex[]} result.heldIndexes - The card indexes held through the draw.
 * @param {HandRank} result.handRank - The evaluated hand rank.
 * @param {CreditAmount} result.bet - The settled bet.
 * @param {CreditAmount} result.payout - The awarded payout.
 * @param {CreditAmount} result.netCredits - The payout minus the bet.
 * @param {CreditAmount} result.credits - The credit balance after settlement.
 * @returns {HandResult} A new result object with copied card and index arrays.
 * @example
 * cloneResult(result);
 */
export function cloneResult(result: HandResult): HandResult {
  return {
    phase: 'complete',
    finalHand: cloneCards(result.finalHand),
    heldIndexes: [...result.heldIndexes],
    handRank: result.handRank,
    bet: result.bet,
    payout: result.payout,
    netCredits: result.netCredits,
    credits: result.credits,
  };
}

/**
 * @public
 * @description Builds a dealt-hand response with a detached hand copy.
 * @param {CreditAmount} credits - The remaining credits after the bet.
 * @param {CreditAmount} bet - The active bet for the dealt hand.
 * @param {readonly Card[]} hand - The dealt cards.
 * @returns {DealtHand} A dealt-hand response with copied cards.
 * @example
 * makeDealtHand(95, 5, createDeck().slice(0, 5));
 */
export function makeDealtHand(credits: CreditAmount, bet: CreditAmount, hand: readonly Card[]): DealtHand {
  return {
    phase: 'dealt',
    credits,
    bet,
    hand: cloneCards(hand),
  };
}
