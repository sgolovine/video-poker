export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export type CreditAmount = number;
export type CardIndex = 0 | 1 | 2 | 3 | 4;

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
}

export type GamePhase = 'ready' | 'dealt' | 'complete';

export type HandRank =
  | 'royalFlush'
  | 'straightFlush'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'flush'
  | 'straight'
  | 'threeOfAKind'
  | 'twoPair'
  | 'jacksOrBetter'
  | 'nothing';

export interface Rng {
  nextInt(maxExclusive: number): number;
}

export interface GameConfig {
  readonly variant: 'JacksOrBetter';
  readonly minBetCredits: 1;
  readonly maxBetCredits: 5;
  readonly initialCredits: CreditAmount;
  readonly rng?: Rng;
}

export interface GameSnapshot {
  readonly phase: GamePhase;
  readonly credits: CreditAmount;
  readonly activeBet?: CreditAmount;
  readonly hand?: readonly Card[];
  readonly heldIndexes?: readonly CardIndex[];
  readonly lastResult?: HandResult;
}

export interface DealtHand {
  readonly phase: 'dealt';
  readonly credits: CreditAmount;
  readonly bet: CreditAmount;
  readonly hand: readonly Card[];
}

export interface HandResult {
  readonly phase: 'complete';
  readonly finalHand: readonly Card[];
  readonly heldIndexes: readonly CardIndex[];
  readonly handRank: HandRank;
  readonly bet: CreditAmount;
  readonly payout: CreditAmount;
  readonly netCredits: CreditAmount;
  readonly credits: CreditAmount;
}

export interface VideoPokerEngine {
  snapshot(): GameSnapshot;
  addCredits(amount: CreditAmount): GameSnapshot;
  deal(bet: CreditAmount): DealtHand;
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

  constructor(code: EngineErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'EngineError';
    this.code = code;
  }
}
