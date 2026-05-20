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
  type Rank,
  type Rng,
  type Suit,
} from './types.js';

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

type PayoutRow = readonly [number, number, number, number, number];

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

export function cloneCard(card: Card): Card {
  return { rank: card.rank, suit: card.suit };
}

export function cloneCards(cards: readonly Card[]): Card[] {
  return cards.map(cloneCard);
}

function cardKey(card: Card): string {
  return `${card.rank}-${card.suit}`;
}

export function assertSafeNonNegativeInteger(value: number, code: EngineErrorCode): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new EngineError(code);
  }
}

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

export function defaultRng(): Rng {
  return {
    nextInt(maxExclusive: number): number {
      return Math.floor(Math.random() * maxExclusive);
    },
  };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

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

function isRoyal(cards: readonly Card[]): boolean {
  const ranks = new Set(cards.map((card) => card.rank));
  return ranks.size === 5 && ['10', 'J', 'Q', 'K', 'A'].every((rank) => ranks.has(rank as Rank));
}

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

export function getPayout(handRank: HandRank, bet: number): CreditAmount {
  if (!Number.isInteger(bet) || bet < 1 || bet > 5) {
    throw new EngineError('invalidBet');
  }
  return PAY_TABLE[handRank][bet - 1];
}

export function validateConfig(config: GameConfig): void {
  if (config.variant !== 'JacksOrBetter' || config.minBetCredits !== 1 || config.maxBetCredits !== 5) {
    throw new EngineError('invalidConfig');
  }
  assertSafeNonNegativeInteger(config.initialCredits, 'invalidCreditAmount');
}

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

export function makeDealtHand(credits: CreditAmount, bet: CreditAmount, hand: readonly Card[]): DealtHand {
  return {
    phase: 'dealt',
    credits,
    bet,
    hand: cloneCards(hand),
  };
}
