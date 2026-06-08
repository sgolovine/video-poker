import { describe, expect, it } from 'vitest';
import {
  EngineError,
  GameConfig,
  JacksOrBetterVideoPokerEngine,
  VideoPokerEngine,
  PAY_TABLE,
  clonePayTable,
  createDeck,
  evaluateHand,
  getPayout,
  shuffleDeck,
  type Card,
  type CardIndex,
  type EngineErrorCode,
  type GameSnapshot,
  type HandRank,
  type Rng,
} from './index';

function createVideoPokerEngine(config: GameConfig): VideoPokerEngine {
  return new JacksOrBetterVideoPokerEngine(config);
}

class ScriptedRng implements Rng {
  readonly maxExclusiveCalls: number[] = [];
  private cursor = 0;

  constructor(private readonly values: readonly number[]) {}

  nextInt(maxExclusive: number): number {
    this.maxExclusiveCalls.push(maxExclusive);
    if (this.cursor >= this.values.length) {
      throw new Error('ScriptedRng exhausted');
    }
    const value = this.values[this.cursor];
    this.cursor += 1;
    return value;
  }
}

const identityRng = (): Rng => ({
  nextInt(maxExclusive: number) {
    return maxExclusive - 1;
  },
});

function card(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

function parseCard(value: string): Card {
  const suitMap = {
    C: 'clubs',
    D: 'diamonds',
    H: 'hearts',
    S: 'spades',
  } as const;
  const suit = suitMap[value.at(-1) as keyof typeof suitMap];
  const rank = value.slice(0, -1) as Card['rank'];
  return card(rank, suit);
}

function hand(values: string): Card[] {
  return values.split(/\s+/u).map(parseCard);
}

function key(cardValue: Card): string {
  return `${cardValue.rank}-${cardValue.suit}`;
}

function expectEngineError(code: EngineErrorCode, action: () => unknown): void {
  try {
    action();
    throw new Error('Expected EngineError');
  } catch (error) {
    expect(error).toBeInstanceOf(EngineError);
    expect((error as EngineError).code).toBe(code);
  }
}

function expectNoKey(snapshot: GameSnapshot, keyName: keyof GameSnapshot): void {
  expect(Object.prototype.hasOwnProperty.call(snapshot, keyName)).toBe(false);
}

function snapshotClone(snapshot: GameSnapshot): GameSnapshot {
  return structuredClone(snapshot);
}

function expectStateUnchanged(before: GameSnapshot, engine: ReturnType<typeof createVideoPokerEngine>): void {
  expect(engine.snapshot()).toEqual(before);
}

function rngValuesForFinalDeck(targetPrefix: readonly Card[]): number[] {
  const canonical = createDeck();
  const targetKeys = new Set(targetPrefix.map(key));
  const remaining = canonical.filter((deckCard) => !targetKeys.has(key(deckCard)));
  const desiredDeck = [...targetPrefix, ...remaining];
  const working = canonical.map(key);
  const desired = desiredDeck.map(key);
  const values: number[] = [];

  for (let i = working.length - 1; i > 0; i -= 1) {
    const wanted = desired[i];
    const j = working.indexOf(wanted);
    values.push(j);
    [working[i], working[j]] = [working[j], working[i]];
  }

  expect(working).toEqual(desired);
  return values;
}

function rngForFinalDeck(targetPrefix: readonly Card[]): ScriptedRng {
  return new ScriptedRng(rngValuesForFinalDeck(targetPrefix));
}

function rngForFinalDecks(...targetPrefixes: Array<readonly Card[]>): ScriptedRng {
  return new ScriptedRng(targetPrefixes.flatMap(rngValuesForFinalDeck));
}

describe('configuration validation', () => {
  it('accepts only JacksOrBetter with fixed 1..5 bet range', () => {
    const engine = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 0,
      rng: identityRng(),
    });

    expect(engine.snapshot()).toEqual({ phase: 'ready', credits: 0 });
    expectEngineError('invalidConfig', () =>
      createVideoPokerEngine({
        variant: 'DeucesWild' as 'JacksOrBetter',
        minBetCredits: 1,
        maxBetCredits: 5,
        initialCredits: 0,
      }),
    );
    expectEngineError('invalidConfig', () =>
      createVideoPokerEngine({
        variant: 'JacksOrBetter',
        minBetCredits: 0 as 1,
        maxBetCredits: 5,
        initialCredits: 0,
      }),
    );
    expectEngineError('invalidConfig', () =>
      createVideoPokerEngine({
        variant: 'JacksOrBetter',
        minBetCredits: 1,
        maxBetCredits: 6 as 5,
        initialCredits: 0,
      }),
    );
  });

  it('rejects invalid initial credit amounts', () => {
    for (const initialCredits of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
      expectEngineError('invalidCreditAmount', () =>
        createVideoPokerEngine({
          variant: 'JacksOrBetter',
          minBetCredits: 1,
          maxBetCredits: 5,
          initialCredits,
        }),
      );
    }
  });
});

describe('deck construction, shuffle, and rng validation', () => {
  it('creates exactly 52 unique cards in canonical suit and rank order', () => {
    const deck = createDeck();

    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(key)).size).toBe(52);
    expect(deck.slice(0, 13)).toEqual([
      card('2', 'clubs'),
      card('3', 'clubs'),
      card('4', 'clubs'),
      card('5', 'clubs'),
      card('6', 'clubs'),
      card('7', 'clubs'),
      card('8', 'clubs'),
      card('9', 'clubs'),
      card('10', 'clubs'),
      card('J', 'clubs'),
      card('Q', 'clubs'),
      card('K', 'clubs'),
      card('A', 'clubs'),
    ]);
    expect(deck.at(13)).toEqual(card('2', 'diamonds'));
    expect(deck.at(26)).toEqual(card('2', 'hearts'));
    expect(deck.at(39)).toEqual(card('2', 'spades'));
  });

  it('uses Fisher-Yates with maxExclusive values from 52 down to 2', () => {
    const rng = new ScriptedRng(Array.from({ length: 51 }, () => 0));

    const shuffled = shuffleDeck(createDeck(), rng);

    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled.map(key)).size).toBe(52);
    expect(rng.maxExclusiveCalls).toEqual(Array.from({ length: 51 }, (_, i) => 52 - i));
  });

  it('rejects non-integer and out-of-range RNG outputs without changing deal state', () => {
    const invalidValues = [52, -1, 1.25, Number.NaN];

    for (const value of invalidValues) {
      const engine = createVideoPokerEngine({
        variant: 'JacksOrBetter',
        minBetCredits: 1,
        maxBetCredits: 5,
        initialCredits: 10,
        rng: new ScriptedRng([value]),
      });
      const before = snapshotClone(engine.snapshot());

      expectEngineError('invalidRngOutput', () => engine.deal(5));
      expectStateUnchanged(before, engine);
    }
  });
});

describe('hand evaluation', () => {
  const cases: Array<[HandRank, string[]]> = [
    ['royalFlush', ['10H JH QH KH AH', '10S JS QS KS AS']],
    ['straightFlush', ['AH 2H 3H 4H 5H', '6C 7C 8C 9C 10C']],
    ['fourOfAKind', ['7C 7D 7H 7S 2C', 'AC AD AH AS KD']],
    ['fullHouse', ['KC KD KH 4S 4D', '2C 2D 2S AH AD']],
    ['flush', ['2S 5S 8S JS KS', '3D 6D 9D QD AD']],
    ['straight', ['AC 2D 3H 4S 5C', '10C JD QH KS AC']],
    ['threeOfAKind', ['5C 5D 5S 9H QC', 'AC AD AS 7D 2H']],
    ['twoPair', ['3C 3D QH QS 8C', 'AC AD 7H 7S 2D']],
    ['jacksOrBetter', ['JC JD 2H 7S 9C', 'AC AD 2H 7S 9C']],
    ['nothing', ['10C 10D 2H 7S 9C', '2C 5D 8H JS AC']],
  ];

  it.each(cases)('recognizes %s positive cases', (rankName, hands) => {
    for (const handText of hands) {
      expect(evaluateHand(hand(handText))).toBe(rankName);
    }
  });

  const closeCases: Array<[string, HandRank]> = [
    ['9H 10H JH QH KH', 'straightFlush'],
    ['10H JH QH KH AD', 'straight'],
    ['9H 10H JH QH AH', 'flush'],
    ['10H JH QH KH AH', 'royalFlush'],
    ['6C 7C 8C 9C 10D', 'straight'],
    ['2S 5S 8S JS KS', 'flush'],
    ['KC KD KH 4S 4D', 'fullHouse'],
    ['5C 5D 5S 9H QC', 'threeOfAKind'],
    ['3C 3D QH QS 8C', 'twoPair'],
    ['7C 7D 7H 7S 2C', 'fourOfAKind'],
    ['KC KD KH 4S 9D', 'threeOfAKind'],
    ['KC KD 4H 4S 9D', 'twoPair'],
    ['AH 2H 3H 4H 5H', 'straightFlush'],
    ['2S 5S 8S JD KS', 'nothing'],
    ['AC 2D 3H 4S 6C', 'nothing'],
    ['5C 5D 9S 9H QC', 'twoPair'],
    ['JC JD 2H 7S 9C', 'jacksOrBetter'],
    ['3C 3D 5H QS 8C', 'nothing'],
    ['10C 10D 2H 7S 9C', 'nothing'],
    ['JC JD 2H 2S 9C', 'twoPair'],
    ['QH QD QS 7C 2D', 'threeOfAKind'],
    ['AC 2D 3H 4S 5C', 'straight'],
  ];

  it.each(closeCases)('evaluates close case %s as %s', (handText, expectedRank) => {
    expect(evaluateHand(hand(handText))).toBe(expectedRank);
  });

  it('ignores card order and rejects invalid hands', () => {
    expect(evaluateHand(hand('KH 10H AH QH JH'))).toBe('royalFlush');
    expectEngineError('invalidDeck', () => evaluateHand(hand('KH 10H AH QH')));
    expectEngineError('invalidDeck', () => evaluateHand(hand('KH KH AH QH JH')));
  });
});

describe('pay table', () => {
  const expected = {
    royalFlush: [250, 500, 750, 1000, 4000],
    straightFlush: [50, 100, 150, 200, 250],
    fourOfAKind: [25, 50, 75, 100, 125],
    fullHouse: [9, 18, 27, 36, 45],
    flush: [6, 12, 18, 24, 30],
    straight: [4, 8, 12, 16, 20],
    threeOfAKind: [3, 6, 9, 12, 15],
    twoPair: [2, 4, 6, 8, 10],
    jacksOrBetter: [1, 2, 3, 4, 5],
    nothing: [0, 0, 0, 0, 0],
  } satisfies Record<HandRank, number[]>;

  it('returns every full-pay Jacks-or-Better payout for bets 1..5', () => {
    for (const [rankName, payouts] of Object.entries(expected) as Array<[HandRank, number[]]>) {
      for (const [index, payout] of payouts.entries()) {
        expect(getPayout(rankName, index + 1)).toBe(payout);
      }
    }
  });

  it('returns configured payouts when a custom table is supplied', () => {
    const customPayTable = clonePayTable({
      ...PAY_TABLE,
      jacksOrBetter: [2, 4, 6, 8, 10],
    });

    expect(getPayout('jacksOrBetter', 5, customPayTable)).toBe(10);
  });
});

describe('public engine flow', () => {
  it('reports exact ready, dealt, and complete snapshot fields', () => {
    const engine = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 10,
      rng: identityRng(),
    });

    const ready = engine.snapshot();
    expect(ready).toEqual({ phase: 'ready', credits: 10 });
    for (const keyName of ['activeBet', 'hand', 'heldIndexes', 'lastResult'] as const) {
      expectNoKey(ready, keyName);
    }

    const dealt = engine.deal(5);
    expect(dealt.phase).toBe('dealt');
    expect(dealt.bet).toBe(5);
    expect(dealt.credits).toBe(5);
    expect(dealt.hand).toHaveLength(5);
    expect(new Set(dealt.hand.map(key)).size).toBe(5);
    expect(engine.snapshot()).toEqual({
      phase: 'dealt',
      credits: 5,
      activeBet: 5,
      hand: dealt.hand,
    });
    const dealtSnapshot = engine.snapshot();
    for (const keyName of ['heldIndexes', 'lastResult'] as const) {
      expectNoKey(dealtSnapshot, keyName);
    }

    const result = engine.draw([]);
    expect(result.phase).toBe('complete');
    expect(engine.snapshot()).toEqual({
      phase: 'complete',
      credits: result.credits,
      lastResult: result,
    });
    const complete = engine.snapshot();
    for (const keyName of ['activeBet', 'hand', 'heldIndexes'] as const) {
      expectNoKey(complete, keyName);
    }
  });

  it('handles credit additions and rejects invalid credit operations atomically', () => {
    const engine = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 0,
      rng: identityRng(),
    });

    expect(engine.addCredits(0)).toEqual({ phase: 'ready', credits: 0 });
    expect(engine.addCredits(7)).toEqual({ phase: 'ready', credits: 7 });

    for (const amount of [-1, 1.5, Number.NaN]) {
      const before = snapshotClone(engine.snapshot());
      expectEngineError('invalidCreditAmount', () => engine.addCredits(amount));
      expectStateUnchanged(before, engine);
    }

    const nearlyFull = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: Number.MAX_SAFE_INTEGER,
      rng: identityRng(),
    });
    expectEngineError('invalidCreditAmount', () => nearlyFull.addCredits(1));

    engine.deal(5);
    const before = snapshotClone(engine.snapshot());
    expectEngineError('invalidPhase', () => engine.addCredits(1));
    expectStateUnchanged(before, engine);
  });

  it('settles draws from the configured pay table', () => {
    const engine = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 100,
      payTable: clonePayTable({
        ...PAY_TABLE,
        jacksOrBetter: [2, 4, 6, 8, 10],
      }),
      rng: rngForFinalDeck(hand('JC JD 2H 7S 9C')),
    });

    engine.deal(5);

    expect(engine.draw([0, 1, 2, 3, 4]).payout).toBe(10);
  });

  it('uses updated pay settings for future settlements', () => {
    const engine = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 100,
      rng: rngForFinalDeck(hand('JC JD 2H 7S 9C')),
    });

    engine.setPayTable(
      clonePayTable({
        ...PAY_TABLE,
        jacksOrBetter: [3, 6, 9, 12, 15],
      }),
    );
    engine.deal(5);

    expect(engine.draw([0, 1, 2, 3, 4]).payout).toBe(15);
  });

  it('validates bets and invalid phases without mutation', () => {
    for (const bet of [1, 2, 3, 4, 5]) {
      const engine = createVideoPokerEngine({
        variant: 'JacksOrBetter',
        minBetCredits: 1,
        maxBetCredits: 5,
        initialCredits: 5,
        rng: identityRng(),
      });
      expect(engine.deal(bet).bet).toBe(bet);
    }

    const engine = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 2,
      rng: identityRng(),
    });

    for (const bet of [0, -1, 1.5, 6]) {
      const before = snapshotClone(engine.snapshot());
      expectEngineError('invalidBet', () => engine.deal(bet));
      expectStateUnchanged(before, engine);
    }

    expectEngineError('insufficientCredits', () => engine.deal(3));
    const dealt = engine.deal(2);
    const beforeSecondDeal = snapshotClone(engine.snapshot());
    expectEngineError('invalidPhase', () => engine.deal(1));
    expectStateUnchanged(beforeSecondDeal, engine);

    expectEngineError('invalidPhase', () =>
      createVideoPokerEngine({
        variant: 'JacksOrBetter',
        minBetCredits: 1,
        maxBetCredits: 5,
        initialCredits: 2,
      }).draw([]),
    );

    engine.draw([0, 1, 2, 3, 4]);
    expect(dealt.hand).toHaveLength(5);
    expectEngineError('invalidPhase', () => engine.draw([]));
  });

  it('replaces no-held, all-held, and partial-held positions correctly', () => {
    const prefix = hand('2C 3C 4C 5C 6C 7C 8C 9C 10C JC');

    const noHold = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 10,
      rng: rngForFinalDeck(prefix),
    });
    noHold.deal(1);
    expect(noHold.draw([]).finalHand).toEqual(prefix.slice(5, 10));

    const allHold = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 10,
      rng: rngForFinalDeck(prefix),
    });
    const dealt = allHold.deal(1);
    expect(allHold.draw([4, 3, 2, 1, 0]).finalHand).toEqual(dealt.hand);
    expect(allHold.snapshot().lastResult?.heldIndexes).toEqual([0, 1, 2, 3, 4]);

    const partial = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 10,
      rng: rngForFinalDeck(prefix),
    });
    const partialDeal = partial.deal(1);
    const result = partial.draw([4, 1]);
    expect(result.heldIndexes).toEqual([1, 4]);
    expect(result.finalHand).toEqual([prefix[5], partialDeal.hand[1], prefix[6], prefix[7], partialDeal.hand[4]]);
  });

  it('validates held indexes and leaves state unchanged after failures', () => {
    const acceptedSubsets: CardIndex[][] = Array.from({ length: 32 }, (_, mask) =>
      ([0, 1, 2, 3, 4] as CardIndex[]).filter((index) => (mask & (1 << index)) !== 0),
    );

    for (const heldIndexes of acceptedSubsets) {
      const engine = createVideoPokerEngine({
        variant: 'JacksOrBetter',
        minBetCredits: 1,
        maxBetCredits: 5,
        initialCredits: 10,
        rng: identityRng(),
      });
      engine.deal(1);
      expect(engine.draw(heldIndexes).heldIndexes).toEqual([...heldIndexes].sort((a, b) => a - b));
    }

    for (const heldIndexes of [[1, 1], [-1], [5], [1.5]]) {
      const engine = createVideoPokerEngine({
        variant: 'JacksOrBetter',
        minBetCredits: 1,
        maxBetCredits: 5,
        initialCredits: 10,
        rng: identityRng(),
      });
      engine.deal(1);
      const before = snapshotClone(engine.snapshot());
      expectEngineError('invalidHeldIndexes', () => engine.draw(heldIndexes as CardIndex[]));
      expectStateUnchanged(before, engine);
    }
  });

  it.each([
    ['10C 10D 2H 7S 9C', 100, 5, 0, 95, -5],
    ['JC JD 2H 7S 9C', 100, 5, 5, 100, 0],
    ['3C 3D QH QS 8C', 100, 5, 10, 105, 5],
    ['10H JH QH KH AH', 100, 5, 4000, 4095, 3995],
  ])('settles a completed %s public round with gross payout semantics', (finalHandText, initialCredits, bet, payout, endingCredits, netCredits) => {
    const engine = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits,
      rng: rngForFinalDeck(hand(finalHandText)),
    });

    const dealt = engine.deal(bet);
    expect(dealt.credits).toBe(initialCredits - bet);
    const result = engine.draw([0, 1, 2, 3, 4]);

    expect(result.payout).toBe(payout);
    expect(result.credits).toBe(endingCredits);
    expect(result.netCredits).toBe(netCredits);
  });

  it('preserves completed result after adding credits and clears it on the next deal', () => {
    const engine = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 100,
      rng: rngForFinalDecks(hand('JC JD 2H 7S 9C'), hand('3C 4C 5C 6C 7C')),
    });
    engine.deal(5);
    const result = engine.draw([0, 1, 2, 3, 4]);

    expect(result.credits).toBe(100);
    const credited = engine.addCredits(10);
    expect(credited.credits).toBe(110);
    expect(credited.lastResult?.credits).toBe(100);

    const dealt = engine.deal(5);
    expect(dealt.credits).toBe(105);
    const snapshot = engine.snapshot();
    expect(snapshot.phase).toBe('dealt');
    expectNoKey(snapshot, 'lastResult');
  });

  it('rejects payout overflow atomically', () => {
    const engine = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: Number.MAX_SAFE_INTEGER,
      rng: rngForFinalDeck(hand('10H JH QH KH AH')),
    });

    engine.deal(5);
    const before = snapshotClone(engine.snapshot());
    expectEngineError('invalidCreditAmount', () => engine.draw([0, 1, 2, 3, 4]));
    expectStateUnchanged(before, engine);
  });
});

describe('immutability', () => {
  it('does not allow returned snapshots, arrays, cards, or results to mutate engine state', () => {
    const engine = createVideoPokerEngine({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 10,
      rng: identityRng(),
    });

    const ready = engine.snapshot() as { credits: number };
    ready.credits = 99;
    expect(engine.snapshot().credits).toBe(10);

    const dealt = engine.deal(1) as unknown as { hand: Card[] };
    const firstCard = dealt.hand[0];
    dealt.hand[0] = card('A', 'spades');
    (firstCard as { rank: Card['rank'] }).rank = 'A';

    const activeHand = engine.snapshot().hand;
    expect(activeHand?.[0]).not.toEqual(card('A', 'spades'));
    expect(activeHand).toHaveLength(5);

    const result = engine.draw([]) as unknown as { finalHand: Card[]; heldIndexes: CardIndex[]; credits: number };
    result.finalHand[0] = card('K', 'spades');
    result.heldIndexes.push(0);
    result.credits = 999;

    const finalSnapshot = engine.snapshot();
    expect(finalSnapshot.credits).not.toBe(999);
    expect(finalSnapshot.lastResult?.heldIndexes).toEqual([]);
    expect(finalSnapshot.lastResult?.finalHand[0]).not.toEqual(card('K', 'spades'));
  });
});
