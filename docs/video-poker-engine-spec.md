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

1. The player starts in a state that allows a new deal: `ready` for the first round, or `complete` after a prior round.
2. The player chooses a bet from 1 to 5 credits.
3. The engine validates the bet and, on a successful deal, deducts it.
4. The engine shuffles a fresh 52-card deck and deals five cards.
5. The player chooses which card indexes to hold.
6. The engine replaces all unheld cards from the same remaining deck.
7. The engine evaluates the final five-card hand.
8. The engine calculates the gross payout from the Jacks or Better pay table.
9. The engine adds the payout to the player's credit balance.
10. The round ends and a new round may begin.

Discarding all five cards is legal. Holding all five cards is legal. The draw step may happen exactly once per round.

Card indexes are zero-based positions in the visible five-card hand. `heldIndexes` is treated as an unordered set supplied by the caller. The engine must normalize valid held indexes by sorting them in ascending order before returning them. During draw, replacement cards are dealt into unheld positions in ascending index order, and held cards remain in their original positions. The final hand must always contain exactly five cards in indexes `0..4`.

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

Required public engine API:

```ts
interface VideoPokerEngine {
  snapshot(): GameSnapshot;
  addCredits(amount: CreditAmount): GameSnapshot;
  deal(bet: CreditAmount): DealtHand;
  draw(heldIndexes: readonly CardIndex[]): HandResult;
}
```

An implementation must expose a constructor or factory that accepts `GameConfig`, or equivalent parameters containing the same fields, and creates a `VideoPokerEngine`.

The engine may be implemented as a class, closure, reducer, or pure state transition module, but the observable behavior must match this specification.

`variant`, `minBetCredits`, and `maxBetCredits` are fixed Jacks-or-Better constants. Runtime inputs that attempt to configure another variant or another bet range must be rejected.

All public snapshots, dealt hands, results, cards, and arrays must be immutable from the caller's perspective. Mutating an object or array returned by the engine must not be able to mutate internal engine state.

## Credit and Betting Rules

Credits are abstract game credits, not currency. The engine must not contain fiat currency, payment, wallet, or exchange-rate logic.

`initialCredits`, added credits, bets, payouts, and balances must be safe integers. A non-negative safe integer is an integer `n` where `0 <= n <= Number.MAX_SAFE_INTEGER`. `initialCredits` may be zero. `addCredits(0)` is valid and is a no-op except for returning the current snapshot.

Bets must be positive integers from 1 to 5 credits. A bet greater than the current credit balance must be rejected. Any operation that would produce a balance above `Number.MAX_SAFE_INTEGER` must be rejected before state changes.

The bet is deducted when `deal` succeeds. The payout returned by `draw` is a gross payout added after the wager has already been deducted.

`deal` and `draw` state changes are atomic. A failed `deal` must not deduct the bet, even if deck construction, shuffling, or RNG validation fails after bet validation. A failed `draw` must not replace cards, update credits, or move the engine to `complete`.

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

Use the full-pay 9/6 Jacks or Better schedule. Payouts are gross credits returned for the given bet size. The pay table is fixed for this engine and must not be overridden or changed at runtime.

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

Hand evaluation ignores the order of input cards. A straight requires five distinct ranks matching one of these sequences: `A-2-3-4-5`, `2-3-4-5-6`, `3-4-5-6-7`, `4-5-6-7-8`, `5-6-7-8-9`, `6-7-8-9-10`, `7-8-9-10-J`, `8-9-10-J-Q`, `9-10-J-Q-K`, or `10-J-Q-K-A`.

Rank groups determine all pair and kind hands. `Three of a Kind` requires rank counts `3,1,1`; `Two Pair` requires `2,2,1`; `Jacks or Better` requires rank counts `2,1,1,1` where the paired rank is `J`, `Q`, `K`, or `A`. Kicker ranks do not affect payout and there is no tie-breaking between hands.

## Deck and Randomness

The engine must create a fresh 52-card deck for each round. The deck must contain every rank and suit combination exactly once.

For deterministic tests, the canonical unshuffled deck order is suits in this order: `clubs`, `diamonds`, `hearts`, `spades`; within each suit, ranks in this order: `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `J`, `Q`, `K`, `A`.

The engine must accept an injectable `Rng` so tests can produce deterministic deals. Production code may provide a default RNG, but shuffle logic must be isolated so it can be tested independently.

Required RNG behavior:

```ts
interface Rng {
  nextInt(maxExclusive: number): number;
}
```

`nextInt(maxExclusive)` must return an integer where `0 <= value < maxExclusive`. Invalid RNG output must throw an `EngineError` rather than silently biasing the deck.

The required shuffle is Fisher-Yates using the injected RNG:

```ts
for (let i = deck.length - 1; i > 0; i -= 1) {
  const j = rng.nextInt(i + 1);
  swap(deck[i], deck[j]);
}
```

For a 52-card deck, this calls `nextInt` exactly 51 times with `maxExclusive` values `52` down through `2`.

After shuffling, the initial hand is the first five cards in deck order. The draw pile starts at the sixth card. Replacement cards are consumed from the draw pile in order.

## State Machine

Valid phases:

| Phase | Meaning | Allowed Actions |
| --- | --- | --- |
| `ready` | No active hand | `addCredits`, `deal` |
| `dealt` | Five initial cards are visible and draw is pending | `draw` |
| `complete` | Last hand is complete | `addCredits`, `deal` |

A successful `deal` moves the engine to `dealt`. A successful `draw` moves the engine to `complete`. The engine initializes in `ready` with `credits` equal to the validated `initialCredits`.

`addCredits` does not change the current phase. If `addCredits` is called in `complete`, `snapshot().credits` changes but `snapshot().lastResult` remains the immutable result of the completed round; `lastResult.credits` is not rewritten after later credit additions.

Snapshot fields by phase:

| Phase | Required Snapshot Fields | Fields That Must Be Absent |
| --- | --- | --- |
| `ready` | `phase`, `credits` | `activeBet`, `hand`, `heldIndexes`, `lastResult` |
| `dealt` | `phase`, `credits`, `activeBet`, `hand` | `heldIndexes`, `lastResult` |
| `complete` | `phase`, `credits`, `lastResult` | `activeBet`, `hand`, `heldIndexes` |

A new `deal` from `complete` starts a fresh round, clears `lastResult` from the snapshot, deducts the new bet, and exposes only the new active hand.

Invalid transitions and validation failures must throw an `EngineError`. Failed operations must not mutate engine state.

## Validation and Error Cases

The engine must reject invalid input by throwing an `EngineError` with the required code:

| Case | Required Error Code |
| --- | --- |
| Deal while already in `dealt` phase | `invalidPhase` |
| `addCredits` while in `dealt` phase | `invalidPhase` |
| Draw before a successful deal | `invalidPhase` |
| Draw more than once in a round | `invalidPhase` |
| Config variant other than `JacksOrBetter` | `invalidConfig` |
| Config bet range other than `1..5` | `invalidConfig` |
| `initialCredits` is not a non-negative safe integer | `invalidCreditAmount` |
| Bet below 1 credit | `invalidBet` |
| Bet above 5 credits | `invalidBet` |
| Non-integer bet | `invalidBet` |
| Bet that exceeds current credits | `insufficientCredits` |
| Non-integer credit amount | `invalidCreditAmount` |
| Negative credit amount | `invalidCreditAmount` |
| Credit addition or payout would exceed `Number.MAX_SAFE_INTEGER` | `invalidCreditAmount` |
| Duplicate held indexes | `invalidHeldIndexes` |
| Non-integer held index | `invalidHeldIndexes` |
| Held index outside `0..4` | `invalidHeldIndexes` |
| Evaluated hand does not contain exactly five cards | `invalidDeck` |
| Final hand with duplicate cards | `invalidDeck` |
| Generated deck is not exactly 52 unique cards | `invalidDeck` |
| RNG output outside expected range | `invalidRngOutput` |
| RNG output is not an integer | `invalidRngOutput` |

Required error identifiers:

```ts
type EngineErrorCode =
  | 'invalidConfig'
  | 'invalidPhase'
  | 'invalidBet'
  | 'insufficientCredits'
  | 'invalidCreditAmount'
  | 'invalidHeldIndexes'
  | 'invalidDeck'
  | 'invalidRngOutput';

interface EngineError extends Error {
  readonly code: EngineErrorCode;
}
```

## Test Suite Requirements

A conforming implementation must include an automated test suite for the engine. The suite must run without network access, real randomness, timers, UI, persistence, or external services. Tests must be deterministic and must use an injected `Rng`, direct pure-helper tests, or other local test-only fixtures to control card order.

The test suite must cover the public engine API (`snapshot`, `addCredits`, `deal`, and `draw`) and any separately exported pure helpers for deck construction, shuffling, hand evaluation, payout lookup, input validation, and error creation. If a behavior can only be observed through the public API, the test must assert it through public snapshots, dealt hands, results, thrown `EngineError` values, and unchanged state after failures.

Recommended test helpers:

| Helper | Purpose |
| --- | --- |
| `ScriptedRng` | Returns a fixed sequence of integers and records every `maxExclusive` argument |
| `constantRng(0)` | Produces a deterministic Fisher-Yates order for simple repeatable deal/draw flow tests |
| `riggedDeck` or pure evaluator helper | Allows direct hand-rank tests without encoding every target hand through shuffle indexes |
| `expectEngineError(code)` | Asserts both that an operation throws and that the thrown error has the required `code` |
| `expectStateUnchanged(before)` | Verifies failed operations are atomic |

Minimum required test groups:

| Group | Required Coverage |
| --- | --- |
| Configuration validation | Accepts `JacksOrBetter` with fixed `1..5` bet range; rejects any other variant, minimum bet, maximum bet, or invalid initial credit amount |
| Snapshot phases | Verifies exact required and absent fields for `ready`, `dealt`, and `complete` snapshots |
| Credit operations | Covers `initialCredits: 0`, `addCredits(0)`, positive credit additions, non-integer additions, negative additions, overflow additions, and rejection of `addCredits` during `dealt` |
| Betting | Covers valid bets `1..5`, non-integer bets, bets below 1, bets above 5, and bets greater than available credits |
| Deal behavior | Deducts the bet atomically, creates a fresh 52-card deck, returns five unique cards, enters `dealt`, rejects a second deal while `dealt`, and clears `lastResult` when dealing after `complete` |
| Draw behavior | Draws exactly once, rejects draw before deal and after complete, replaces no-held/all-held/partially-held positions correctly, preserves held card positions, sorts held indexes, and consumes replacement cards in ascending index order |
| Held index validation | Accepts every unique subset of indexes `0..4`; rejects duplicate, non-integer, negative, and greater-than-4 indexes without mutating state |
| Hand evaluation | Covers every paying rank, `nothing`, rank-order independence, low-ace straights, high-ace straights, straight flush versus royal flush, low pair versus Jacks-or-Better pair, and precedence when multiple patterns could match |
| Pay table | Verifies all payout rows for bets `1..5`, including the 5-credit royal flush bonus and gross-payout semantics |
| Credit settlement | Verifies `creditsAfterDeal`, `payout`, `netCredits`, `creditsAfterRound`, zero-payout loss, break-even Jacks-or-Better pair, positive wins, and payout overflow rejection |
| Deck construction | Verifies exactly 52 unique cards, canonical suit order, canonical rank order, and no duplicate cards across a full round |
| Shuffle and RNG | Verifies Fisher-Yates calls `nextInt` exactly 51 times with `maxExclusive` values `52` down to `2`, rejects out-of-range and non-integer RNG outputs, and leaves state unchanged after RNG failure |
| Immutability | Verifies mutating returned snapshots, arrays, cards, dealt hands, and results cannot mutate internal engine state |
| Error shape | Verifies every validation failure throws an `EngineError` with one of the required codes |
| Atomicity | Verifies every failed `deal`, `draw`, and `addCredits` operation leaves phase, credits, active hand, held indexes, and last result unchanged |

Required concrete hand-evaluation test cases:

Each hand rank must have at least two positive cases that evaluate to that rank and at least three negative cases that are close enough to catch common evaluator mistakes. Negative cases must assert the actual expected rank shown below, not only that the hand is "not" the target rank.

| Target Rank | Correct Cases | Incorrect Cases |
| --- | --- | --- |
| `royalFlush` | `10H JH QH KH AH` -> `royalFlush`<br>`10S JS QS KS AS` -> `royalFlush` | `9H 10H JH QH KH` -> `straightFlush`<br>`10H JH QH KH AD` -> `straight`<br>`9H 10H JH QH AH` -> `flush` |
| `straightFlush` | `AH 2H 3H 4H 5H` -> `straightFlush`<br>`6C 7C 8C 9C 10C` -> `straightFlush` | `10H JH QH KH AH` -> `royalFlush`<br>`6C 7C 8C 9C JD` -> `straight`<br>`2S 5S 8S JS KS` -> `flush` |
| `fourOfAKind` | `7C 7D 7H 7S 2C` -> `fourOfAKind`<br>`AC AD AH AS KD` -> `fourOfAKind` | `KC KD KH 4S 4D` -> `fullHouse`<br>`5C 5D 5S 9H QC` -> `threeOfAKind`<br>`3C 3D QH QS 8C` -> `twoPair` |
| `fullHouse` | `KC KD KH 4S 4D` -> `fullHouse`<br>`2C 2D 2S AH AD` -> `fullHouse` | `7C 7D 7H 7S 2C` -> `fourOfAKind`<br>`KC KD KH 4S 9D` -> `threeOfAKind`<br>`KC KD 4H 4S 9D` -> `twoPair` |
| `flush` | `2S 5S 8S JS KS` -> `flush`<br>`3D 6D 9D QD AD` -> `flush` | `10H JH QH KH AH` -> `royalFlush`<br>`AH 2H 3H 4H 5H` -> `straightFlush`<br>`2S 5S 8S JD KS` -> `nothing` |
| `straight` | `AC 2D 3H 4S 5C` -> `straight`<br>`10C JD QH KS AC` -> `straight` | `AH 2H 3H 4H 5H` -> `straightFlush`<br>`10H JH QH KH AH` -> `royalFlush`<br>`AC 2D 3H 4S 6C` -> `nothing` |
| `threeOfAKind` | `5C 5D 5S 9H QC` -> `threeOfAKind`<br>`AC AD AS 7D 2H` -> `threeOfAKind` | `KC KD KH 4S 4D` -> `fullHouse`<br>`7C 7D 7H 7S 2C` -> `fourOfAKind`<br>`5C 5D 9S 9H QC` -> `twoPair` |
| `twoPair` | `3C 3D QH QS 8C` -> `twoPair`<br>`AC AD 7H 7S 2D` -> `twoPair` | `KC KD KH 4S 4D` -> `fullHouse`<br>`JC JD 2H 7S 9C` -> `jacksOrBetter`<br>`3C 3D 5H QS 8C` -> `nothing` |
| `jacksOrBetter` | `JC JD 2H 7S 9C` -> `jacksOrBetter`<br>`AC AD 2H 7S 9C` -> `jacksOrBetter` | `10C 10D 2H 7S 9C` -> `nothing`<br>`JC JD 2H 2S 9C` -> `twoPair`<br>`QH QD QS 7C 2D` -> `threeOfAKind` |
| `nothing` | `10C 10D 2H 7S 9C` -> `nothing`<br>`2C 5D 8H JS AC` -> `nothing` | `JC JD 2H 7S 9C` -> `jacksOrBetter`<br>`3C 3D QH QS 8C` -> `twoPair`<br>`AC 2D 3H 4S 5C` -> `straight` |

Required public-flow test cases:

| Scenario | Required Assertions |
| --- | --- |
| Initial engine with `initialCredits: 0` | Snapshot is exactly `ready` with `credits: 0` and no hand/result fields |
| Deal with `initialCredits: 10`, `bet: 5` | Returns `phase: dealt`, `bet: 5`, `credits: 5`, five unique cards, and snapshot matches the active hand |
| Draw with `heldIndexes: []` | Replaces all five cards from the remaining deck and returns `heldIndexes: []` |
| Draw with `heldIndexes: [0,1,2,3,4]` | Keeps every original card and returns all held indexes sorted |
| Draw with `heldIndexes: [4,1]` | Returns `heldIndexes: [1,4]`; positions `1` and `4` are unchanged; positions `0`, `2`, and `3` receive the next three draw cards in that order |
| Complete losing 5-credit round from 100 credits | Ending credits are `95`, `payout: 0`, `netCredits: -5` |
| Complete Jacks-or-Better 5-credit round from 100 credits | Ending credits are `100`, `payout: 5`, `netCredits: 0` |
| Complete two-pair 5-credit round from 100 credits | Ending credits are `105`, `payout: 10`, `netCredits: 5` |
| Complete royal-flush 5-credit round from 100 credits | Ending credits are `4095`, `payout: 4000`, `netCredits: 3995` |
| Add credits after `complete` | Snapshot credits change, but `lastResult.credits` remains the original round-ending balance |
| New deal after `complete` | Snapshot enters `dealt`, deducts the new bet, and no longer exposes `lastResult` |

## Acceptance Criteria

A conforming implementation must satisfy these behaviors:

| Scenario | Expected Result |
| --- | --- |
| Initial snapshot with `initialCredits: 0` | Returns `phase: ready`, `credits: 0`, and no active hand fields |
| `addCredits(0)` in `ready` | Returns current snapshot without changing credits |
| Initial deal with valid bet | Deducts bet, returns five unique cards, enters `dealt` |
| Invalid deal attempt | Throws `EngineError` and leaves credits and phase unchanged |
| `addCredits` while a hand is `dealt` | Throws `EngineError` and leaves credits and hand unchanged |
| Draw with no held cards | Replaces all five cards from remaining deck |
| Draw with all cards held | Keeps all five original cards |
| Draw with held indexes `[4, 1]` | Treats indexes as `{1,4}`, returns `heldIndexes: [1,4]`, and replaces indexes `0`, `2`, and `3` in that order |
| New deal after completed round | Clears `lastResult`, deducts the new bet, and exposes only the new dealt hand |
| Winning pair `J-J-2-7-9` with 5-credit bet | Pays 5 credits |
| Losing pair `10-10-2-7-9` with 5-credit bet | Pays 0 credits |
| Full house with 5-credit bet | Pays 45 credits |
| Flush with 5-credit bet | Pays 30 credits |
| Royal flush with 1-credit bet | Pays 250 credits |
| Royal flush with 5-credit bet | Pays 4000 credits |
| `A-2-3-4-5` mixed suits | Evaluates as `straight` |
| `A-2-3-4-5` same suit | Evaluates as `straightFlush` |
| `10-J-Q-K-A` same suit | Evaluates as `royalFlush` |
| Duplicate held indexes | Throws `EngineError` with `code: 'invalidHeldIndexes'` |
| RNG returns `maxExclusive` | Throws `EngineError` with `code: 'invalidRngOutput'` |

## Non-Goals

Do not implement strategy advice, optimal-hold suggestions, expected-value analysis, return-to-player calculations, game history storage, player identity, server synchronization, multiplayer play, jurisdictional compliance, real-money transactions, or non-Jacks-or-Better pay tables.
