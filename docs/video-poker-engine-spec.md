# Video Poker Engine Specification: Jacks or Better

## Reference

This specification is based on the standard video poker flow described by Wikipedia: a player bets credits, receives five cards, may discard zero to five cards, draws replacements from the same virtual deck, and is paid according to a posted pay table. The only implemented variant is full-pay Jacks or Better, where payoffs begin at a pair of jacks and the 9/6 schedule pays 9 credits per credit wagered for a full house and 6 credits per credit wagered for a flush.

Reference: https://en.wikipedia.org/wiki/Video_poker

## Purpose

Build a deterministic, testable TypeScript engine for single-hand video poker. The engine owns game rules, card dealing, betting, hand evaluation, and payout calculation. UI, persistence, accounts, real-money processing, casino compliance, and analytics are outside this specification.

## Variant Scope

The engine must implement exactly one variant: `JacksOrBetter`.

The engine must not implement or expose rules for Deuces Wild, Joker's Wild, Bonus Poker, Tens or Better, multi-play poker, progressive jackpots, side bets, wild cards, auto-hold, gamble/double-up features, or any other variant-specific behavior.

## Core Game Rules

Use a standard 52-card deck with four suits and thirteen ranks. No jokers, no wild cards, and no duplicate cards are allowed in a round.

Each round follows this sequence:

1. The player starts in a ready state with a credit balance.
2. The player chooses a bet from 1 to 5 credits.
3. The engine validates and deducts the bet.
4. The engine shuffles a fresh 52-card deck and deals five cards.
5. The player chooses which card indexes to hold.
6. The engine replaces all unheld cards from the same remaining deck.
7. The engine evaluates the final five-card hand.
8. The engine calculates the gross payout from the Jacks or Better pay table.
9. The engine adds the payout to the player's credit balance.
10. The round ends and a new round may begin.

Discarding all five cards is legal. Holding all five cards is legal. The draw step may happen exactly once per round.

## TypeScript Domain Model

```ts
type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

type CreditAmount = number;
type CardIndex = 0 | 1 | 2 | 3 | 4;

interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
}

type GamePhase = 'ready' | 'dealt' | 'complete';

type HandRank =
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

interface Rng {
  nextInt(maxExclusive: number): number;
}

interface GameConfig {
  readonly variant: 'JacksOrBetter';
  readonly minBetCredits: 1;
  readonly maxBetCredits: 5;
  readonly initialCredits: CreditAmount;
  readonly rng?: Rng;
}

interface GameSnapshot {
  readonly phase: GamePhase;
  readonly credits: CreditAmount;
  readonly activeBet?: CreditAmount;
  readonly hand?: readonly Card[];
  readonly heldIndexes?: readonly CardIndex[];
  readonly lastResult?: HandResult;
}

interface DealtHand {
  readonly phase: 'dealt';
  readonly credits: CreditAmount;
  readonly bet: CreditAmount;
  readonly hand: readonly Card[];
}

interface HandResult {
  readonly phase: 'complete';
  readonly finalHand: readonly Card[];
  readonly heldIndexes: readonly CardIndex[];
  readonly handRank: HandRank;
  readonly bet: CreditAmount;
  readonly payout: CreditAmount;
  readonly netCredits: CreditAmount;
  readonly credits: CreditAmount;
}
```

Recommended public engine API:

```ts
interface VideoPokerEngine {
  snapshot(): GameSnapshot;
  addCredits(amount: CreditAmount): GameSnapshot;
  deal(bet: CreditAmount): DealtHand;
  draw(heldIndexes: readonly CardIndex[]): HandResult;
}
```

The engine may be implemented as a class, closure, reducer, or pure state transition module, but the observable behavior must match this specification.

## Credit and Betting Rules

Credits are abstract game credits, not currency. The engine must not contain fiat currency, payment, wallet, or exchange-rate logic.

`initialCredits`, added credits, bets, payouts, and balances must be non-negative safe integers. Bets must be positive integers from 1 to 5 credits. A bet greater than the current credit balance must be rejected.

The bet is deducted when `deal` succeeds. The payout returned by `draw` is a gross payout added after the wager has already been deducted.

Credit formula:

```ts
creditsAfterDeal = creditsBeforeDeal - bet;
payout = payTable[handRank][bet];
creditsAfterRound = creditsAfterDeal + payout;
netCredits = payout - bet;
```

Examples:

| Starting Credits | Bet | Result | Payout | Ending Credits | Net |
| ---: | ---: | --- | ---: | ---: | ---: |
| 100 | 5 | nothing | 0 | 95 | -5 |
| 100 | 5 | jacksOrBetter | 5 | 100 | 0 |
| 100 | 5 | twoPair | 10 | 105 | +5 |
| 100 | 5 | royalFlush | 4000 | 4095 | +3995 |

## Jacks or Better Pay Table

Use the full-pay 9/6 Jacks or Better schedule. Payouts are gross credits returned for the given bet size.

| Hand | 1 Credit | 2 Credits | 3 Credits | 4 Credits | 5 Credits |
| --- | ---: | ---: | ---: | ---: | ---: |
| Royal Flush | 250 | 500 | 750 | 1000 | 4000 |
| Straight Flush | 50 | 100 | 150 | 200 | 250 |
| Four of a Kind | 25 | 50 | 75 | 100 | 125 |
| Full House | 9 | 18 | 27 | 36 | 45 |
| Flush | 6 | 12 | 18 | 24 | 30 |
| Straight | 4 | 8 | 12 | 16 | 20 |
| Three of a Kind | 3 | 6 | 9 | 12 | 15 |
| Two Pair | 2 | 4 | 6 | 8 | 10 |
| Jacks or Better | 1 | 2 | 3 | 4 | 5 |
| Nothing | 0 | 0 | 0 | 0 | 0 |

Royal Flush intentionally has a maximum-bet bonus: bets of 1 through 4 pay 250 credits per credit wagered, while a 5-credit bet pays 4000 credits total.

## Hand Evaluation Rules

Evaluate exactly five final cards. If multiple hand ranks match, return the highest rank in this order:

1. Royal Flush
2. Straight Flush
3. Four of a Kind
4. Full House
5. Flush
6. Straight
7. Three of a Kind
8. Two Pair
9. Jacks or Better
10. Nothing

Definitions:

| Hand Rank | Required Pattern |
| --- | --- |
| Royal Flush | `10`, `J`, `Q`, `K`, and `A`, all same suit |
| Straight Flush | Any five-card straight, all same suit, excluding Royal Flush |
| Four of a Kind | Four cards of the same rank |
| Full House | Three cards of one rank and two cards of another rank |
| Flush | Five cards of the same suit, not a straight or royal flush |
| Straight | Five sequential ranks, not all the same suit |
| Three of a Kind | Three cards of the same rank plus two unrelated kickers |
| Two Pair | Two cards of one rank, two cards of another rank, and one kicker |
| Jacks or Better | Exactly one pair of `J`, `Q`, `K`, or `A` |
| Nothing | Any non-paying hand, including low pairs from `2` through `10` |

Aces may be high in `10-J-Q-K-A` and low in `A-2-3-4-5`. A low ace straight is a straight or straight flush, not a royal flush.

## Deck and Randomness

The engine must create a fresh 52-card deck for each round. The deck must contain every rank and suit combination exactly once.

The engine should accept an injectable `Rng` so tests can produce deterministic deals. Production code may provide a default RNG, but shuffle logic must be isolated so it can be tested independently.

Required RNG behavior:

```ts
interface Rng {
  nextInt(maxExclusive: number): number;
}
```

`nextInt(maxExclusive)` must return an integer where `0 <= value < maxExclusive`. Invalid RNG output must throw an engine error rather than silently biasing the deck.

The recommended shuffle is Fisher-Yates using the injected RNG.

## State Machine

Valid phases:

| Phase | Meaning | Allowed Actions |
| --- | --- | --- |
| `ready` | No active hand | `addCredits`, `deal` |
| `dealt` | Five initial cards are visible and draw is pending | `draw` |
| `complete` | Last hand is complete | `addCredits`, `deal` |

A successful `deal` moves the engine to `dealt`. A successful `draw` moves the engine to `complete`. A new `deal` from `complete` starts a fresh round and replaces the previous active hand while preserving `lastResult` if the implementation chooses to expose it.

Invalid transitions must throw typed errors or return typed failures. The chosen error style must be consistent across the engine.

## Validation and Error Cases

The engine must reject:

| Case | Required Behavior |
| --- | --- |
| Deal while already in `dealt` phase | Error |
| Draw before a successful deal | Error |
| Draw more than once in a round | Error |
| Bet below 1 credit | Error |
| Bet above 5 credits | Error |
| Bet that exceeds current credits | Error |
| Non-integer credit amount | Error |
| Negative credit amount | Error |
| Duplicate held indexes | Error |
| Held index outside `0..4` | Error |
| Final hand with duplicate cards | Error |
| RNG output outside expected range | Error |

Recommended error identifiers:

```ts
type EngineErrorCode =
  | 'invalidPhase'
  | 'invalidBet'
  | 'insufficientCredits'
  | 'invalidCreditAmount'
  | 'invalidHeldIndexes'
  | 'invalidDeck'
  | 'invalidRngOutput';
```

## Acceptance Criteria

A conforming implementation must satisfy these behaviors:

| Scenario | Expected Result |
| --- | --- |
| Initial deal with valid bet | Deducts bet, returns five unique cards, enters `dealt` |
| Draw with no held cards | Replaces all five cards from remaining deck |
| Draw with all cards held | Keeps all five original cards |
| Winning pair `J-J-2-7-9` with 5-credit bet | Pays 5 credits |
| Losing pair `10-10-2-7-9` with 5-credit bet | Pays 0 credits |
| Full house with 5-credit bet | Pays 45 credits |
| Flush with 5-credit bet | Pays 30 credits |
| Royal flush with 1-credit bet | Pays 250 credits |
| Royal flush with 5-credit bet | Pays 4000 credits |
| `A-2-3-4-5` mixed suits | Evaluates as `straight` |
| `A-2-3-4-5` same suit | Evaluates as `straightFlush` |
| `10-J-Q-K-A` same suit | Evaluates as `royalFlush` |

## Non-Goals

Do not implement strategy advice, optimal-hold suggestions, expected-value analysis, return-to-player calculations, game history storage, player identity, server synchronization, multiplayer play, jurisdictional compliance, real-money transactions, or non-Jacks-or-Better pay tables.
