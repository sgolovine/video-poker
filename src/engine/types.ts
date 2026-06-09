export type StandardSuit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type StandardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type GameVariant = 'JacksOrBetter' | 'DeucesWild' | 'JokerPoker';
export type DeckType = 'standard52' | 'standard52PlusJoker';
export type SolverGame = 'jacksbetter' | 'deuceswild' | 'joker';

export type Suit = StandardSuit;
export type Rank = StandardRank;
export type CreditAmount = number;
export type CardIndex = 0 | 1 | 2 | 3 | 4;
export type PayoutRow = readonly [CreditAmount, CreditAmount, CreditAmount, CreditAmount, CreditAmount];

export interface StandardCard {
  readonly kind: 'standard';
  readonly rank: StandardRank;
  readonly suit: StandardSuit;
}

export interface JokerCard {
  readonly kind: 'joker';
  readonly rank: 'JOKER';
  readonly suit: 'joker';
}

export type Card = StandardCard | JokerCard;

export type GamePhase = 'ready' | 'dealt' | 'complete';

export type HandRank =
  | 'royalFlush'
  | 'fourDeuces'
  | 'wildRoyalFlush'
  | 'fiveOfAKind'
  | 'straightFlush'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'flush'
  | 'straight'
  | 'threeOfAKind'
  | 'twoPair'
  | 'jacksOrBetter'
  | 'kingsOrBetter'
  | 'nothing';

export type PayTableConfig = Readonly<Partial<Record<HandRank, PayoutRow>>>;
export type VariantPayTables = Readonly<Record<GameVariant, PayTableConfig>>;

export interface GameVariantDefinition {
  readonly variant: GameVariant;
  readonly label: string;
  readonly solverGame: SolverGame;
  readonly deckType: DeckType;
  readonly handOrder: readonly HandRank[];
  readonly payTableRanks: readonly HandRank[];
  readonly defaultPayTable: PayTableConfig;
}

export interface Rng {
  /** Returns an integer in the half-open range [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
}

export interface GameConfig {
  readonly variant: GameVariant;
  readonly minBetCredits: 1;
  readonly maxBetCredits: 5;
  readonly initialCredits: CreditAmount;
  readonly payTable?: PayTableConfig;
  readonly rng?: Rng;
}

export interface GameSnapshot {
  readonly phase: GamePhase;
  readonly variant: GameVariant;
  readonly credits: CreditAmount;
  readonly activeBet?: CreditAmount;
  readonly hand?: readonly Card[];
  readonly heldIndexes?: readonly CardIndex[];
  readonly lastResult?: HandResult;
}

export interface DealtHand {
  readonly phase: 'dealt';
  readonly variant: GameVariant;
  readonly credits: CreditAmount;
  readonly bet: CreditAmount;
  readonly hand: readonly Card[];
}

export interface HandResult {
  readonly phase: 'complete';
  readonly variant: GameVariant;
  readonly finalHand: readonly Card[];
  readonly heldIndexes: readonly CardIndex[];
  readonly handRank: HandRank;
  readonly bet: CreditAmount;
  readonly payout: CreditAmount;
  readonly netCredits: CreditAmount;
  readonly credits: CreditAmount;
}

export interface VideoPokerEngine {
  /** Returns the current immutable game snapshot. */
  snapshot(): GameSnapshot;

  /** Adds credits outside an active deal and returns the updated snapshot. */
  addCredits(amount: CreditAmount): GameSnapshot;

  /** Replaces the payout table used when settling future draws. */
  setPayTable(payTable: PayTableConfig): GameSnapshot;

  /** Starts a round with a one-to-five credit bet. */
  deal(bet: CreditAmount): DealtHand;

  /** Completes a dealt round while preserving the supplied held card positions. */
  draw(heldIndexes: readonly CardIndex[]): HandResult;
}

export type EngineErrorCode =
  | 'invalidConfig'
  | 'invalidPhase'
  | 'invalidBet'
  | 'insufficientCredits'
  | 'invalidCreditAmount'
  | 'invalidHeldIndexes'
  | 'invalidDeck'
  | 'invalidRngOutput';

export class EngineError extends Error {
  readonly code: EngineErrorCode;

  /** Creates an engine error with a stable machine-readable code. */
  constructor(code: EngineErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'EngineError';
    this.code = code;
  }
}
