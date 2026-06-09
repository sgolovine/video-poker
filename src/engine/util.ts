import pokersolver from 'pokersolver';
import {
  EngineError,
  type Card,
  type CardIndex,
  type CreditAmount,
  type DealtHand,
  type EngineErrorCode,
  type GameConfig,
  type GameVariant,
  type GameVariantDefinition,
  type HandRank,
  type HandResult,
  type JokerCard,
  type PayTableConfig,
  type PayoutRow,
  type Rank,
  type Rng,
  type StandardCard,
  type StandardRank,
  type Suit,
  type VariantPayTables,
} from './types';

const { Hand } = pokersolver;

export const SUITS: readonly Suit[] = Object.freeze(['clubs', 'diamonds', 'hearts', 'spades']);
export const RANKS: readonly Rank[] = Object.freeze(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
export const GAME_VARIANTS: readonly GameVariant[] = Object.freeze(['JacksOrBetter', 'DeucesWild', 'JokerPoker']);

const ROYAL_RANKS: ReadonlySet<StandardRank> = new Set(['10', 'J', 'Q', 'K', 'A']);
const HIGH_PAIR_RANKS: ReadonlySet<StandardRank> = new Set(['J', 'Q', 'K', 'A']);
const KINGS_OR_BETTER_RANKS: ReadonlySet<StandardRank> = new Set(['K', 'A']);

const SUIT_TO_SOLVER: Readonly<Record<Suit, string>> = Object.freeze({
  clubs: 'c',
  diamonds: 'd',
  hearts: 'h',
  spades: 's',
});

const RANK_TO_SOLVER: Readonly<Record<Rank, string>> = Object.freeze({
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': 'T',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
});

function payoutRow(row: [number, number, number, number, number]): PayoutRow {
  return Object.freeze(row);
}

function handRankList<T extends readonly HandRank[]>(ranks: T): T {
  return Object.freeze([...ranks]) as unknown as T;
}

export const JACKS_OR_BETTER_PAY_TABLE: PayTableConfig = Object.freeze({
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

export const DEUCES_WILD_PAY_TABLE: PayTableConfig = Object.freeze({
  royalFlush: payoutRow([250, 500, 750, 1000, 4000]),
  fourDeuces: payoutRow([200, 400, 600, 800, 1000]),
  wildRoyalFlush: payoutRow([25, 50, 75, 100, 125]),
  fiveOfAKind: payoutRow([15, 30, 45, 60, 75]),
  straightFlush: payoutRow([9, 18, 27, 36, 45]),
  fourOfAKind: payoutRow([5, 10, 15, 20, 25]),
  fullHouse: payoutRow([3, 6, 9, 12, 15]),
  flush: payoutRow([2, 4, 6, 8, 10]),
  straight: payoutRow([2, 4, 6, 8, 10]),
  threeOfAKind: payoutRow([1, 2, 3, 4, 5]),
  nothing: payoutRow([0, 0, 0, 0, 0]),
});

export const JOKER_POKER_PAY_TABLE: PayTableConfig = Object.freeze({
  royalFlush: payoutRow([250, 500, 750, 1000, 4000]),
  fiveOfAKind: payoutRow([200, 400, 600, 800, 1000]),
  wildRoyalFlush: payoutRow([100, 200, 300, 400, 500]),
  straightFlush: payoutRow([50, 100, 150, 200, 250]),
  fourOfAKind: payoutRow([20, 40, 60, 80, 100]),
  fullHouse: payoutRow([7, 14, 21, 28, 35]),
  flush: payoutRow([5, 10, 15, 20, 25]),
  straight: payoutRow([3, 6, 9, 12, 15]),
  threeOfAKind: payoutRow([2, 4, 6, 8, 10]),
  twoPair: payoutRow([1, 2, 3, 4, 5]),
  kingsOrBetter: payoutRow([1, 2, 3, 4, 5]),
  nothing: payoutRow([0, 0, 0, 0, 0]),
});

export const DEFAULT_PAY_TABLES: VariantPayTables = Object.freeze({
  JacksOrBetter: JACKS_OR_BETTER_PAY_TABLE,
  DeucesWild: DEUCES_WILD_PAY_TABLE,
  JokerPoker: JOKER_POKER_PAY_TABLE,
});

export const GAME_DEFINITIONS: Readonly<Record<GameVariant, GameVariantDefinition>> = Object.freeze({
  JacksOrBetter: Object.freeze({
    variant: 'JacksOrBetter',
    label: 'Jacks or Better',
    solverGame: 'jacksbetter',
    deckType: 'standard52',
    handOrder: handRankList([
      'royalFlush',
      'straightFlush',
      'fourOfAKind',
      'fullHouse',
      'flush',
      'straight',
      'threeOfAKind',
      'twoPair',
      'jacksOrBetter',
    ] as const),
    payTableRanks: handRankList([
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
    ] as const),
    defaultPayTable: JACKS_OR_BETTER_PAY_TABLE,
  }),
  DeucesWild: Object.freeze({
    variant: 'DeucesWild',
    label: 'Deuces Wild',
    solverGame: 'deuceswild',
    deckType: 'standard52',
    handOrder: handRankList([
      'royalFlush',
      'fourDeuces',
      'wildRoyalFlush',
      'fiveOfAKind',
      'straightFlush',
      'fourOfAKind',
      'fullHouse',
      'flush',
      'straight',
      'threeOfAKind',
    ] as const),
    payTableRanks: handRankList([
      'royalFlush',
      'fourDeuces',
      'wildRoyalFlush',
      'fiveOfAKind',
      'straightFlush',
      'fourOfAKind',
      'fullHouse',
      'flush',
      'straight',
      'threeOfAKind',
      'nothing',
    ] as const),
    defaultPayTable: DEUCES_WILD_PAY_TABLE,
  }),
  JokerPoker: Object.freeze({
    variant: 'JokerPoker',
    label: 'Joker Poker',
    solverGame: 'joker',
    deckType: 'standard52PlusJoker',
    handOrder: handRankList([
      'royalFlush',
      'fiveOfAKind',
      'wildRoyalFlush',
      'straightFlush',
      'fourOfAKind',
      'fullHouse',
      'flush',
      'straight',
      'threeOfAKind',
      'twoPair',
      'kingsOrBetter',
    ] as const),
    payTableRanks: handRankList([
      'royalFlush',
      'fiveOfAKind',
      'wildRoyalFlush',
      'straightFlush',
      'fourOfAKind',
      'fullHouse',
      'flush',
      'straight',
      'threeOfAKind',
      'twoPair',
      'kingsOrBetter',
      'nothing',
    ] as const),
    defaultPayTable: JOKER_POKER_PAY_TABLE,
  }),
});

export const PAY_TABLE = JACKS_OR_BETTER_PAY_TABLE;

export function standardCard(rank: Rank, suit: Suit): StandardCard {
  return { kind: 'standard', rank, suit };
}

export function jokerCard(): JokerCard {
  return { kind: 'joker', rank: 'JOKER', suit: 'joker' };
}

export function isJokerCard(card: Card): card is JokerCard {
  return card.kind === 'joker';
}

export function assertSafeNonNegativeInteger(value: number, code: EngineErrorCode): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new EngineError(code);
  }
}

export function getGameDefinition(variant: GameVariant): GameVariantDefinition {
  const definition = GAME_DEFINITIONS[variant];
  if (!definition) {
    throw new EngineError('invalidConfig');
  }
  return definition;
}

export function getDefaultPayTable(variant: GameVariant): PayTableConfig {
  return clonePayTable(variant, getGameDefinition(variant).defaultPayTable);
}

export function clonePayTable(variant: GameVariant, payTable: PayTableConfig): PayTableConfig {
  const definition = getGameDefinition(variant);
  const expectedRanks = new Set<HandRank>(definition.payTableRanks);
  const suppliedRanks = Object.keys(payTable) as HandRank[];

  if (suppliedRanks.some((rank) => !expectedRanks.has(rank))) {
    throw new EngineError('invalidConfig');
  }

  const nextPayTable: Partial<Record<HandRank, PayoutRow>> = {};
  for (const rank of definition.payTableRanks) {
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

export function cloneCard(card: Card): Card {
  return isJokerCard(card) ? jokerCard() : standardCard(card.rank, card.suit);
}

export function cloneCards(cards: readonly Card[]): Card[] {
  return cards.map(cloneCard);
}

export function cardKey(card: Card): string {
  return isJokerCard(card) ? 'JOKER' : `${card.rank}-${card.suit}`;
}

export function createDeck(variant: GameVariant): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(standardCard(rank, suit));
    }
  }
  if (getGameDefinition(variant).deckType === 'standard52PlusJoker') {
    deck.push(jokerCard());
  }
  return deck;
}

export function assertValidDeck(variant: GameVariant, cards: readonly Card[]): void {
  const expectedLength = getGameDefinition(variant).deckType === 'standard52PlusJoker' ? 53 : 52;
  assertValidCards(variant, cards, expectedLength);
}

export function assertValidHand(variant: GameVariant, cards: readonly Card[]): void {
  assertValidCards(variant, cards, 5);
}

function assertValidCards(variant: GameVariant, cards: readonly Card[], expectedLength: number): void {
  if (cards.length !== expectedLength) {
    throw new EngineError('invalidDeck');
  }
  const allowsJoker = getGameDefinition(variant).deckType === 'standard52PlusJoker';
  const seen = new Set<string>();
  for (const card of cards) {
    if (isJokerCard(card)) {
      if (!allowsJoker) {
        throw new EngineError('invalidDeck');
      }
    } else if (!RANKS.includes(card.rank) || !SUITS.includes(card.suit)) {
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

export function shuffleDeck(variant: GameVariant, deck: readonly Card[], rng: Rng): Card[] {
  const shuffled = cloneCards(deck);
  assertValidDeck(variant, shuffled);

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    if (!Number.isInteger(j) || j < 0 || j >= i + 1) {
      throw new EngineError('invalidRngOutput');
    }
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  assertValidDeck(variant, shuffled);
  return shuffled;
}

export function cardToSolverNotation(card: Card): string {
  if (isJokerCard(card)) {
    return 'Or';
  }
  return `${RANK_TO_SOLVER[card.rank]}${SUIT_TO_SOLVER[card.suit]}`;
}

export function evaluateHand(variant: GameVariant, cards: readonly Card[]): HandRank {
  assertValidHand(variant, cards);

  const definition = getGameDefinition(variant);
  const solved = Hand.solve(cards.map(cardToSolverNotation), definition.solverGame, variant !== 'DeucesWild');

  if (isNaturalRoyal(cards)) {
    return 'royalFlush';
  }

  if (variant === 'DeucesWild' && countDeuces(cards) === 4) {
    return 'fourDeuces';
  }

  if (solved.name === 'Five of a Kind') {
    return 'fiveOfAKind';
  }

  if (solved.descr === 'Wild Royal Flush') {
    return 'wildRoyalFlush';
  }

  if (variant === 'JokerPoker' && solved.name === 'High Card' && hasKingsOrBetterPair(cards)) {
    return 'kingsOrBetter';
  }

  return mapSolverRank(variant, solved.name, cards);
}

function mapSolverRank(variant: GameVariant, name: string, cards: readonly Card[]): HandRank {
  switch (name) {
    case 'Straight Flush':
      return 'straightFlush';
    case 'Four of a Kind':
      return 'fourOfAKind';
    case 'Full House':
      return 'fullHouse';
    case 'Flush':
      return 'flush';
    case 'Straight':
      return 'straight';
    case 'Three of a Kind':
      return 'threeOfAKind';
    case 'Two Pair':
      return 'twoPair';
    case 'Pair':
      return variant === 'JacksOrBetter' && hasJacksOrBetterPair(cards) ? 'jacksOrBetter' : 'nothing';
    default:
      return 'nothing';
  }
}

function isNaturalRoyal(cards: readonly Card[]): boolean {
  const standardCards = cards.filter((card): card is StandardCard => !isJokerCard(card));
  if (standardCards.length !== 5) {
    return false;
  }
  const firstSuit = standardCards[0]?.suit;
  return (
    standardCards.every((card) => card.suit === firstSuit) &&
    new Set(standardCards.map((card) => card.rank)).size === 5 &&
    standardCards.every((card) => ROYAL_RANKS.has(card.rank))
  );
}

function countDeuces(cards: readonly Card[]): number {
  return cards.filter((card) => !isJokerCard(card) && card.rank === '2').length;
}

function pairRanks(cards: readonly Card[]): StandardRank[] {
  const counts = new Map<StandardRank, number>();
  for (const card of cards) {
    if (!isJokerCard(card)) {
      counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, count]) => count >= 2).map(([rank]) => rank);
}

function hasJacksOrBetterPair(cards: readonly Card[]): boolean {
  return pairRanks(cards).some((rank) => HIGH_PAIR_RANKS.has(rank));
}

function hasKingsOrBetterPair(cards: readonly Card[]): boolean {
  const naturalPair = pairRanks(cards).some((rank) => KINGS_OR_BETTER_RANKS.has(rank));
  if (naturalPair) {
    return true;
  }
  return cards.some(isJokerCard) && cards.some((card) => !isJokerCard(card) && KINGS_OR_BETTER_RANKS.has(card.rank));
}

export function getPayout(
  variant: GameVariant,
  handRank: HandRank,
  bet: number,
  payTable: PayTableConfig = getDefaultPayTable(variant),
): CreditAmount {
  if (!Number.isInteger(bet) || bet < 1 || bet > 5) {
    throw new EngineError('invalidBet');
  }
  const row = clonePayTable(variant, payTable)[handRank];
  if (!row) {
    throw new EngineError('invalidConfig');
  }
  return row[bet - 1];
}

export function validateConfig(config: GameConfig): void {
  getGameDefinition(config.variant);
  if (config.minBetCredits !== 1 || config.maxBetCredits !== 5) {
    throw new EngineError('invalidConfig');
  }
  assertSafeNonNegativeInteger(config.initialCredits, 'invalidCreditAmount');
  if (config.payTable) {
    clonePayTable(config.variant, config.payTable);
  }
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
    variant: result.variant,
    finalHand: cloneCards(result.finalHand),
    heldIndexes: [...result.heldIndexes],
    handRank: result.handRank,
    bet: result.bet,
    payout: result.payout,
    netCredits: result.netCredits,
    credits: result.credits,
  };
}

export function makeDealtHand(
  variant: GameVariant,
  credits: CreditAmount,
  bet: CreditAmount,
  hand: readonly Card[],
): DealtHand {
  return {
    phase: 'dealt',
    variant,
    credits,
    bet,
    hand: cloneCards(hand),
  };
}
