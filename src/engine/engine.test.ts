import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PAY_TABLES,
  DEUCES_WILD_PAY_TABLE,
  EngineError,
  GAME_DEFINITIONS,
  GAME_VARIANTS,
  JACKS_OR_BETTER_PAY_TABLE,
  JOKER_POKER_PAY_TABLE,
  JacksOrBetterVideoPokerEngine,
  PAY_TABLE,
  assertValidDeck,
  assertValidHand,
  cardKey,
  cardToSolverNotation,
  cloneCard,
  cloneCards,
  clonePayTable,
  cloneResult,
  createDeck,
  createVideoPokerEngine,
  defaultRng,
  evaluateHand,
  getDefaultPayTable,
  getGameDefinition,
  getPayout,
  isJokerCard,
  jokerCard,
  makeDealtHand,
  normalizeHeldIndexes,
  shuffleDeck,
  standardCard,
  validateConfig,
  type Card,
  type CardIndex,
  type CreditAmount,
  type EngineErrorCode,
  type GameConfig,
  type GameSnapshot,
  type GameVariant,
  type HandRank,
  type HandResult,
  type PayTableConfig,
  type PayoutRow,
  type Rank,
  type Rng,
  type StandardCard,
  type Suit,
  type VideoPokerEngine,
} from './index';

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

function card(rank: Rank, suit: Suit): StandardCard {
  return standardCard(rank, suit);
}

function parseCard(value: string): Card {
  if (value === 'X') {
    return jokerCard();
  }

  const suitMap: Readonly<Record<string, Suit>> = {
    C: 'clubs',
    D: 'diamonds',
    H: 'hearts',
    S: 'spades',
  };
  const suit = suitMap[value.at(-1) ?? ''];
  const rank = value.slice(0, -1) as Rank;

  if (!suit) {
    throw new Error(`Invalid test card: ${value}`);
  }

  return card(rank, suit);
}

function hand(values: string): Card[] {
  return values.split(/\s+/u).map(parseCard);
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
  expect(Object.hasOwn(snapshot, keyName)).toBe(false);
}

function snapshotClone(snapshot: GameSnapshot): GameSnapshot {
  return structuredClone(snapshot);
}

function expectStateUnchanged(before: GameSnapshot, engine: VideoPokerEngine): void {
  expect(engine.snapshot()).toEqual(before);
}

function createMachine(config: Partial<GameConfig> = {}): VideoPokerEngine {
  return createVideoPokerEngine({
    variant: 'JacksOrBetter',
    minBetCredits: 1,
    maxBetCredits: 5,
    initialCredits: 10,
    rng: identityRng(),
    ...config,
  });
}

function rngValuesForFinalDeck(variant: GameVariant, targetPrefix: readonly Card[]): number[] {
  const canonical = createDeck(variant);
  const targetKeys = new Set(targetPrefix.map(cardKey));
  const remaining = canonical.filter((deckCard) => !targetKeys.has(cardKey(deckCard)));
  const desiredDeck = [...targetPrefix, ...remaining];
  const working = canonical.map(cardKey);
  const desired = desiredDeck.map(cardKey);
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

function rngForFinalDeck(variant: GameVariant, targetPrefix: readonly Card[]): ScriptedRng {
  return new ScriptedRng(rngValuesForFinalDeck(variant, targetPrefix));
}

function rngForFinalDecks(variant: GameVariant, ...targetPrefixes: Array<readonly Card[]>): ScriptedRng {
  return new ScriptedRng(targetPrefixes.flatMap((targetPrefix) => rngValuesForFinalDeck(variant, targetPrefix)));
}

describe('variant metadata and configuration validation', () => {
  it('defines the supported variants, solver games, decks, paytable ranks, and defaults', () => {
    expect(GAME_VARIANTS).toEqual(['JacksOrBetter', 'DeucesWild', 'JokerPoker']);
    expect(GAME_DEFINITIONS.JacksOrBetter).toMatchObject({
      label: 'Jacks or Better',
      solverGame: 'jacksbetter',
      deckType: 'standard52',
    });
    expect(GAME_DEFINITIONS.DeucesWild).toMatchObject({
      label: 'Deuces Wild',
      solverGame: 'deuceswild',
      deckType: 'standard52',
    });
    expect(GAME_DEFINITIONS.JokerPoker).toMatchObject({
      label: 'Joker Poker',
      solverGame: 'joker',
      deckType: 'standard52PlusJoker',
    });
    expect(GAME_DEFINITIONS.DeucesWild.payTableRanks).not.toContain('twoPair');
    expect(GAME_DEFINITIONS.DeucesWild.payTableRanks).not.toContain('jacksOrBetter');
    expect(GAME_DEFINITIONS.JokerPoker.payTableRanks).not.toContain('fourDeuces');
    expect(DEFAULT_PAY_TABLES.JacksOrBetter).toEqual(JACKS_OR_BETTER_PAY_TABLE);
    expect(DEFAULT_PAY_TABLES.DeucesWild).toEqual(DEUCES_WILD_PAY_TABLE);
    expect(DEFAULT_PAY_TABLES.JokerPoker).toEqual(JOKER_POKER_PAY_TABLE);
  });

  it('accepts every supported variant and rejects invalid config values', () => {
    for (const variant of GAME_VARIANTS) {
      const engine = createMachine({ variant, initialCredits: 0 });
      expect(engine.snapshot()).toEqual({ phase: 'ready', variant, credits: 0 });
    }

    expectEngineError('invalidConfig', () => getGameDefinition('BadGame' as GameVariant));
    expectEngineError('invalidConfig', () =>
      createMachine({
        variant: 'BadGame' as GameVariant,
      }),
    );
    expectEngineError('invalidConfig', () =>
      createMachine({
        minBetCredits: 0 as 1,
      }),
    );
    expectEngineError('invalidConfig', () =>
      createMachine({
        maxBetCredits: 6 as 5,
      }),
    );
  });

  it('rejects invalid initial credit amounts and accepts validated custom paytables', () => {
    for (const initialCredits of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
      expectEngineError('invalidCreditAmount', () =>
        createMachine({
          initialCredits,
        }),
      );
    }

    validateConfig({
      variant: 'JacksOrBetter',
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 0,
      payTable: clonePayTable('JacksOrBetter', JACKS_OR_BETTER_PAY_TABLE),
    });
  });

  it('keeps the legacy Jacks-or-Better class pinned to that variant', () => {
    const engine = new JacksOrBetterVideoPokerEngine({
      minBetCredits: 1,
      maxBetCredits: 5,
      initialCredits: 12,
      rng: identityRng(),
    });

    expect(engine.snapshot()).toEqual({ phase: 'ready', variant: 'JacksOrBetter', credits: 12 });
  });
});

describe('deck construction, validation, shuffle, and solver notation', () => {
  it('creates canonical standard and Joker decks without duplicate standard cards', () => {
    for (const variant of ['JacksOrBetter', 'DeucesWild'] as const) {
      const deck = createDeck(variant);
      expect(deck).toHaveLength(52);
      expect(deck.some(isJokerCard)).toBe(false);
      expect(new Set(deck.map(cardKey)).size).toBe(52);
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
      assertValidDeck(variant, deck);
    }

    const jokerDeck = createDeck('JokerPoker');
    expect(jokerDeck).toHaveLength(53);
    expect(jokerDeck.filter(isJokerCard)).toHaveLength(1);
    expect(jokerDeck.at(-1)).toEqual(jokerCard());
    expect(new Set(jokerDeck.filter((deckCard) => !isJokerCard(deckCard)).map(cardKey)).size).toBe(52);
    assertValidDeck('JokerPoker', jokerDeck);
  });

  it('rejects invalid decks and hands for the selected variant', () => {
    const jacksDeck = createDeck('JacksOrBetter');
    const jokerDeck = createDeck('JokerPoker');

    expectEngineError('invalidDeck', () => assertValidDeck('JacksOrBetter', jacksDeck.slice(0, 51)));
    expectEngineError('invalidDeck', () => assertValidDeck('JacksOrBetter', [jacksDeck[0], ...jacksDeck.slice(0, 51)]));
    expectEngineError('invalidDeck', () => assertValidDeck('JacksOrBetter', [...jacksDeck.slice(0, 51), jokerCard()]));
    expectEngineError('invalidDeck', () =>
      assertValidDeck('JacksOrBetter', [{ kind: 'standard', rank: '1', suit: 'clubs' } as Card, ...jacksDeck.slice(1)]),
    );
    expectEngineError('invalidDeck', () =>
      assertValidDeck('JacksOrBetter', [{ kind: 'standard', rank: 'A', suit: 'stars' } as Card, ...jacksDeck.slice(1)]),
    );
    expectEngineError('invalidDeck', () => assertValidDeck('JacksOrBetter', [...jokerDeck.slice(0, 51), jokerCard()]));
    expectEngineError('invalidDeck', () => assertValidDeck('JokerPoker', jacksDeck));

    assertValidHand('JokerPoker', hand('X 7C 7D 7H 7S'));
    expectEngineError('invalidDeck', () => assertValidHand('JacksOrBetter', hand('X 7C 7D 7H 7S')));
    expectEngineError('invalidDeck', () => assertValidHand('DeucesWild', hand('X 7C 7D 7H 7S')));
    expectEngineError('invalidDeck', () => assertValidHand('JacksOrBetter', hand('KH 10H AH QH')));
    expectEngineError('invalidDeck', () => assertValidHand('JokerPoker', hand('X X 7D 7H 7S')));
  });

  it('uses Fisher-Yates with variant-aware deck sizes and validates rng output', () => {
    const jacksRng = new ScriptedRng(Array.from({ length: 51 }, () => 0));
    const jacksDeck = shuffleDeck('JacksOrBetter', createDeck('JacksOrBetter'), jacksRng);
    expect(jacksDeck).toHaveLength(52);
    expect(new Set(jacksDeck.map(cardKey)).size).toBe(52);
    expect(jacksRng.maxExclusiveCalls).toEqual(Array.from({ length: 51 }, (_, i) => 52 - i));

    const jokerRng = new ScriptedRng(Array.from({ length: 52 }, () => 0));
    const shuffledJokerDeck = shuffleDeck('JokerPoker', createDeck('JokerPoker'), jokerRng);
    expect(shuffledJokerDeck).toHaveLength(53);
    expect(new Set(shuffledJokerDeck.map(cardKey)).size).toBe(53);
    expect(jokerRng.maxExclusiveCalls).toEqual(Array.from({ length: 52 }, (_, i) => 53 - i));

    for (const value of [52, -1, 1.25, Number.NaN]) {
      expectEngineError('invalidRngOutput', () =>
        shuffleDeck('JacksOrBetter', createDeck('JacksOrBetter'), new ScriptedRng([value])),
      );
    }
    expectEngineError('invalidDeck', () => shuffleDeck('JacksOrBetter', createDeck('JokerPoker'), identityRng()));
  });

  it('converts engine cards to pokersolver notation and clones cards safely', () => {
    expect(cardToSolverNotation(card('10', 'hearts'))).toBe('Th');
    expect(cardToSolverNotation(card('A', 'spades'))).toBe('As');
    expect(cardToSolverNotation(jokerCard())).toBe('Or');
    expect(cardKey(jokerCard())).toBe('JOKER');

    const clonedJoker = cloneCard(jokerCard());
    const clonedCards = cloneCards([card('K', 'diamonds'), jokerCard()]);
    expect(clonedJoker).toEqual(jokerCard());
    expect(clonedJoker).not.toBe(jokerCard());
    expect(clonedCards).toEqual([card('K', 'diamonds'), jokerCard()]);
  });

  it('provides a default rng backed by Math.random', () => {
    const mathRandom = vi.spyOn(Math, 'random').mockReturnValue(0.42);

    try {
      expect(defaultRng().nextInt(10)).toBe(4);
    } finally {
      mathRandom.mockRestore();
    }
  });
});

describe('paytable validation and payout lookup', () => {
  const expectedPayTables: Readonly<Record<GameVariant, PayTableConfig>> = {
    JacksOrBetter: JACKS_OR_BETTER_PAY_TABLE,
    DeucesWild: DEUCES_WILD_PAY_TABLE,
    JokerPoker: JOKER_POKER_PAY_TABLE,
  };

  it('returns every configured payout for every variant and bet', () => {
    for (const variant of GAME_VARIANTS) {
      for (const rank of GAME_DEFINITIONS[variant].payTableRanks) {
        const row = expectedPayTables[variant][rank];
        expect(row).toBeDefined();
        row?.forEach((payout, index) => {
          expect(getPayout(variant, rank, index + 1)).toBe(payout);
        });
      }
    }
  });

  it('returns configured payouts and immutable cloned tables', () => {
    const customPayTable = clonePayTable('JacksOrBetter', {
      ...PAY_TABLE,
      jacksOrBetter: [2, 4, 6, 8, 10],
    });

    expect(getPayout('JacksOrBetter', 'jacksOrBetter', 5, customPayTable)).toBe(10);
    expect(Object.isFrozen(customPayTable)).toBe(true);
    expect(Object.isFrozen(customPayTable.jacksOrBetter)).toBe(true);
    expect(getDefaultPayTable('JacksOrBetter')).toEqual(JACKS_OR_BETTER_PAY_TABLE);
  });

  it('rejects invalid bets and rows from the wrong variant', () => {
    for (const bet of [0, -1, 1.5, 6]) {
      expectEngineError('invalidBet', () => getPayout('JacksOrBetter', 'royalFlush', bet));
    }

    expectEngineError('invalidConfig', () => clonePayTable('DeucesWild', JACKS_OR_BETTER_PAY_TABLE));
    expectEngineError('invalidConfig', () => clonePayTable('JokerPoker', DEUCES_WILD_PAY_TABLE));
    expectEngineError('invalidConfig', () => getPayout('DeucesWild', 'twoPair', 1, DEUCES_WILD_PAY_TABLE));
    expectEngineError('invalidConfig', () => getPayout('JokerPoker', 'fourDeuces', 1, JOKER_POKER_PAY_TABLE));
  });

  it('rejects incomplete, malformed, and unsafe payout rows', () => {
    const { flush: _missingFlush, ...missingRow } = JACKS_OR_BETTER_PAY_TABLE;
    const badRow = {
      ...JACKS_OR_BETTER_PAY_TABLE,
      flush: [1, 2, 3, 4] as unknown as PayoutRow,
    };

    expectEngineError('invalidConfig', () => clonePayTable('JacksOrBetter', missingRow));
    expectEngineError('invalidConfig', () => clonePayTable('JacksOrBetter', badRow));

    for (const payout of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
      expectEngineError('invalidConfig', () =>
        clonePayTable('JacksOrBetter', {
          ...JACKS_OR_BETTER_PAY_TABLE,
          flush: [payout, 2, 3, 4, 5],
        }),
      );
    }
  });
});

describe('hand evaluation', () => {
  const jacksCases: Array<[string, HandRank]> = [
    ['10H JH QH KH AH', 'royalFlush'],
    ['AH 2H 3H 4H 5H', 'straightFlush'],
    ['7C 7D 7H 7S 2C', 'fourOfAKind'],
    ['KC KD KH 4S 4D', 'fullHouse'],
    ['2S 5S 8S JS KS', 'flush'],
    ['10C JD QH KS AC', 'straight'],
    ['5C 5D 5S 9H QC', 'threeOfAKind'],
    ['3C 3D QH QS 8C', 'twoPair'],
    ['JC JD 2H 7S 9C', 'jacksOrBetter'],
    ['10C 10D 2H 7S 9C', 'nothing'],
  ];

  const deucesCases: Array<[string, HandRank]> = [
    ['10H JH QH KH AH', 'royalFlush'],
    ['2C 2D 2H 2S 9C', 'fourDeuces'],
    ['2C 10H JH QH KH', 'wildRoyalFlush'],
    ['2C 2D 7H 7S 7C', 'fiveOfAKind'],
    ['2C 4H 5H 6H 7H', 'straightFlush'],
    ['2C 9D 9H 9S KC', 'fourOfAKind'],
    ['2C 3D 3H 7S 7C', 'fullHouse'],
    ['2C 4H 7H 9H KH', 'flush'],
    ['2C 4D 5H 6S 8C', 'straight'],
    ['2C 4D 4H QS KC', 'threeOfAKind'],
    ['2C 4D 9H QS KC', 'nothing'],
    ['KC KD QH QS 8C', 'nothing'],
    ['AC AD 4H 7S 9C', 'nothing'],
  ];

  const jokerCases: Array<[string, HandRank]> = [
    ['10H JH QH KH AH', 'royalFlush'],
    ['X 7C 7D 7H 7S', 'fiveOfAKind'],
    ['X 10H JH QH KH', 'wildRoyalFlush'],
    ['6C 7C 8C 9C 10C', 'straightFlush'],
    ['9C 9D 9H 9S KC', 'fourOfAKind'],
    ['KC KD KH 4S 4D', 'fullHouse'],
    ['2S 5S 8S JS KS', 'flush'],
    ['10C JD QH KS AC', 'straight'],
    ['5C 5D 5S 9H QC', 'threeOfAKind'],
    ['3C 3D QH QS 8C', 'twoPair'],
    ['KC KD 2H 7S 9C', 'kingsOrBetter'],
    ['X KC 2H 7S 9C', 'kingsOrBetter'],
    ['QC QD 2H 7S 9C', 'nothing'],
    ['X QC 2H 7S 9C', 'nothing'],
  ];

  it.each(jacksCases)('recognizes Jacks-or-Better %s as %s', (handText, expectedRank) => {
    expect(evaluateHand('JacksOrBetter', hand(handText))).toBe(expectedRank);
  });

  it.each(deucesCases)('recognizes Deuces Wild %s as %s', (handText, expectedRank) => {
    expect(evaluateHand('DeucesWild', hand(handText))).toBe(expectedRank);
  });

  it.each(jokerCases)('recognizes Joker Poker %s as %s', (handText, expectedRank) => {
    expect(evaluateHand('JokerPoker', hand(handText))).toBe(expectedRank);
  });

  it('keeps game-specific rules isolated across variants', () => {
    expectEngineError('invalidDeck', () => evaluateHand('JacksOrBetter', hand('X 7C 7D 7H 7S')));
    expect(evaluateHand('JacksOrBetter', hand('2C 2D 7H 7S 9C'))).toBe('twoPair');
    expect(evaluateHand('DeucesWild', hand('2C 2D 7H 7S 9C'))).toBe('fourOfAKind');
    expect(evaluateHand('JokerPoker', hand('2C 2D 7H 7S 9C'))).toBe('twoPair');
    expect(evaluateHand('JokerPoker', hand('2C 2D 2H 2S 9C'))).toBe('fourOfAKind');
    expectEngineError('invalidDeck', () => evaluateHand('DeucesWild', hand('X 7C 7D 7H 7S')));
  });

  it('ignores card order and rejects invalid evaluated hands', () => {
    expect(evaluateHand('JacksOrBetter', hand('KH 10H AH QH JH'))).toBe('royalFlush');
    expectEngineError('invalidDeck', () => evaluateHand('JacksOrBetter', hand('KH 10H AH QH')));
    expectEngineError('invalidDeck', () => evaluateHand('JacksOrBetter', hand('KH KH AH QH JH')));
  });
});

describe('public engine flow', () => {
  it('reports exact ready, dealt, and complete snapshot fields', () => {
    const engine = createMachine({
      initialCredits: 10,
      rng: identityRng(),
    });

    const ready = engine.snapshot();
    expect(ready).toEqual({ phase: 'ready', variant: 'JacksOrBetter', credits: 10 });
    for (const keyName of ['activeBet', 'hand', 'heldIndexes', 'lastResult'] as const) {
      expectNoKey(ready, keyName);
    }

    const dealt = engine.deal(5);
    expect(dealt.phase).toBe('dealt');
    expect(dealt.variant).toBe('JacksOrBetter');
    expect(dealt.bet).toBe(5);
    expect(dealt.credits).toBe(5);
    expect(dealt.hand).toHaveLength(5);
    expect(new Set(dealt.hand.map(cardKey)).size).toBe(5);
    expect(engine.snapshot()).toEqual({
      phase: 'dealt',
      variant: 'JacksOrBetter',
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
    expect(result.variant).toBe('JacksOrBetter');
    expect(engine.snapshot()).toEqual({
      phase: 'complete',
      variant: 'JacksOrBetter',
      credits: result.credits,
      lastResult: result,
    });
    const complete = engine.snapshot();
    for (const keyName of ['activeBet', 'hand', 'heldIndexes'] as const) {
      expectNoKey(complete, keyName);
    }
  });

  it('handles credit additions and rejects invalid credit operations atomically', () => {
    const engine = createMachine({
      initialCredits: 0,
    });

    expect(engine.addCredits(0)).toEqual({ phase: 'ready', variant: 'JacksOrBetter', credits: 0 });
    expect(engine.addCredits(7)).toEqual({ phase: 'ready', variant: 'JacksOrBetter', credits: 7 });

    for (const amount of [-1, 1.5, Number.NaN]) {
      const before = snapshotClone(engine.snapshot());
      expectEngineError('invalidCreditAmount', () => engine.addCredits(amount));
      expectStateUnchanged(before, engine);
    }

    const nearlyFull = createMachine({
      initialCredits: Number.MAX_SAFE_INTEGER,
    });
    expectEngineError('invalidCreditAmount', () => nearlyFull.addCredits(1));

    engine.deal(5);
    const before = snapshotClone(engine.snapshot());
    expectEngineError('invalidPhase', () => engine.addCredits(1));
    expectStateUnchanged(before, engine);
  });

  it('settles draws from configured variant paytables', () => {
    const jacks = createMachine({
      initialCredits: 100,
      payTable: clonePayTable('JacksOrBetter', {
        ...PAY_TABLE,
        jacksOrBetter: [2, 4, 6, 8, 10],
      }),
      rng: rngForFinalDeck('JacksOrBetter', hand('JC JD 2H 7S 9C')),
    });
    jacks.deal(5);
    expect(jacks.draw([0, 1, 2, 3, 4]).payout).toBe(10);

    const deuces = createMachine({
      variant: 'DeucesWild',
      initialCredits: 100,
      rng: rngForFinalDeck('DeucesWild', hand('2C 2D 2H 2S 9C')),
    });
    deuces.deal(5);
    expect(deuces.draw([0, 1, 2, 3, 4]).payout).toBe(1000);

    const joker = createMachine({
      variant: 'JokerPoker',
      initialCredits: 100,
      rng: rngForFinalDeck('JokerPoker', hand('X 7C 7D 7H 7S')),
    });
    joker.deal(5);
    expect(joker.draw([0, 1, 2, 3, 4]).payout).toBe(1000);
  });

  it('uses updated pay settings for future settlements and rejects wrong-variant tables', () => {
    const engine = createMachine({
      initialCredits: 100,
      rng: rngForFinalDeck('JacksOrBetter', hand('JC JD 2H 7S 9C')),
    });

    engine.setPayTable(
      clonePayTable('JacksOrBetter', {
        ...PAY_TABLE,
        jacksOrBetter: [3, 6, 9, 12, 15],
      }),
    );
    engine.deal(5);

    expect(engine.draw([0, 1, 2, 3, 4]).payout).toBe(15);
    expectEngineError('invalidConfig', () => engine.setPayTable(DEUCES_WILD_PAY_TABLE));
  });

  it('validates bets and invalid phases without mutation', () => {
    for (const bet of [1, 2, 3, 4, 5]) {
      const engine = createMachine({
        initialCredits: 5,
      });
      expect(engine.deal(bet).bet).toBe(bet);
    }

    const engine = createMachine({
      initialCredits: 2,
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

    expectEngineError('invalidPhase', () => createMachine({ initialCredits: 2 }).draw([]));

    engine.draw([0, 1, 2, 3, 4]);
    expect(dealt.hand).toHaveLength(5);
    expectEngineError('invalidPhase', () => engine.draw([]));
  });

  it('uses the default constructor rng when no rng is supplied', () => {
    const mathRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    try {
      const engine = createVideoPokerEngine({
        variant: 'JacksOrBetter',
        minBetCredits: 1,
        maxBetCredits: 5,
        initialCredits: 1,
      });

      expect(engine.deal(1).hand).toHaveLength(5);
      expect(mathRandom).toHaveBeenCalled();
    } finally {
      mathRandom.mockRestore();
    }
  });

  it('replaces no-held, all-held, and partial-held positions correctly', () => {
    const prefix = hand('2C 3C 4C 5C 6C 7C 8C 9C 10C JC');

    const noHold = createMachine({
      initialCredits: 10,
      rng: rngForFinalDeck('JacksOrBetter', prefix),
    });
    noHold.deal(1);
    expect(noHold.draw([]).finalHand).toEqual(prefix.slice(5, 10));

    const allHold = createMachine({
      initialCredits: 10,
      rng: rngForFinalDeck('JacksOrBetter', prefix),
    });
    const dealt = allHold.deal(1);
    expect(allHold.draw([4, 3, 2, 1, 0]).finalHand).toEqual(dealt.hand);
    expect(allHold.snapshot().lastResult?.heldIndexes).toEqual([0, 1, 2, 3, 4]);

    const partial = createMachine({
      initialCredits: 10,
      rng: rngForFinalDeck('JacksOrBetter', prefix),
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
      const engine = createMachine({
        initialCredits: 10,
      });
      engine.deal(1);
      expect(engine.draw(heldIndexes).heldIndexes).toEqual([...heldIndexes].sort((a, b) => a - b));
    }

    for (const heldIndexes of [[1, 1], [-1], [5], [1.5]]) {
      const engine = createMachine({
        initialCredits: 10,
      });
      engine.deal(1);
      const before = snapshotClone(engine.snapshot());
      expectEngineError('invalidHeldIndexes', () => engine.draw(heldIndexes as CardIndex[]));
      expectStateUnchanged(before, engine);
    }

    expect(normalizeHeldIndexes([4, 0, 2])).toEqual([0, 2, 4]);
  });

  it.each([
    ['JacksOrBetter', '10C 10D 2H 7S 9C', 100, 5, 0, 95, -5],
    ['JacksOrBetter', 'JC JD 2H 7S 9C', 100, 5, 5, 100, 0],
    ['JacksOrBetter', '3C 3D QH QS 8C', 100, 5, 10, 105, 5],
    ['JacksOrBetter', '10H JH QH KH AH', 100, 5, 4000, 4095, 3995],
    ['DeucesWild', '2C 4D 4H QS KC', 100, 5, 5, 100, 0],
    ['JokerPoker', 'KC KD 2H 7S 9C', 100, 5, 5, 100, 0],
  ] as const)('settles a completed %s public round with gross payout semantics', (variant, finalHandText, initialCredits, bet, payout, endingCredits, netCredits) => {
    const engine = createMachine({
      variant,
      initialCredits,
      rng: rngForFinalDeck(variant, hand(finalHandText)),
    });

    const dealt = engine.deal(bet);
    expect(dealt.credits).toBe(initialCredits - bet);
    const result = engine.draw([0, 1, 2, 3, 4]);

    expect(result.payout).toBe(payout);
    expect(result.credits).toBe(endingCredits);
    expect(result.netCredits).toBe(netCredits);
  });

  it('preserves completed result after adding credits and clears it on the next deal', () => {
    const engine = createMachine({
      initialCredits: 100,
      rng: rngForFinalDecks('JacksOrBetter', hand('JC JD 2H 7S 9C'), hand('3C 4C 5C 6C 7C')),
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
    const engine = createMachine({
      initialCredits: Number.MAX_SAFE_INTEGER,
      rng: rngForFinalDeck('JacksOrBetter', hand('10H JH QH KH AH')),
    });

    engine.deal(5);
    const before = snapshotClone(engine.snapshot());
    expectEngineError('invalidCreditAmount', () => engine.draw([0, 1, 2, 3, 4]));
    expectStateUnchanged(before, engine);
  });

  it('guards private invalid-state branches defensively', () => {
    const readyEngine = createMachine();
    const readyInternals = readyEngine as unknown as {
      requireDeck: () => Card[];
      requireHand: () => Card[];
      requireLastResult: () => HandResult;
    };
    expectEngineError('invalidDeck', () => readyInternals.requireDeck());
    expectEngineError('invalidPhase', () => readyInternals.requireHand());
    expectEngineError('invalidPhase', () => readyInternals.requireLastResult());

    const badDeckEngine = createMachine({
      rng: rngForFinalDeck('JacksOrBetter', hand('2C 3C 4C 5C 6C')),
    });
    badDeckEngine.deal(1);
    (badDeckEngine as unknown as { deck: Card[] }).deck = [];
    expectEngineError('invalidDeck', () => badDeckEngine.draw([]));

    const missingCursorEngine = createMachine({
      rng: rngForFinalDeck('JacksOrBetter', hand('JC JD 2H 7S 9C')),
    });
    missingCursorEngine.deal(1);
    (missingCursorEngine as unknown as { drawCursor?: number }).drawCursor = undefined;
    expect(missingCursorEngine.draw([0, 1, 2, 3, 4]).handRank).toBe('jacksOrBetter');

    const missingBetEngine = createMachine({
      rng: rngForFinalDeck('JacksOrBetter', hand('JC JD 2H 7S 9C')),
    });
    missingBetEngine.deal(1);
    (missingBetEngine as unknown as { activeBet?: CreditAmount }).activeBet = undefined;
    expectEngineError('invalidBet', () => missingBetEngine.draw([0, 1, 2, 3, 4]));
  });
});

describe('immutability and exported builders', () => {
  it('does not allow returned snapshots, arrays, cards, or results to mutate engine state', () => {
    const engine = createMachine({
      initialCredits: 10,
    });

    const ready = engine.snapshot() as { credits: number };
    ready.credits = 99;
    expect(engine.snapshot().credits).toBe(10);

    const dealt = engine.deal(1) as unknown as { hand: Card[] };
    const firstCard = dealt.hand[0] as StandardCard;
    dealt.hand[0] = card('A', 'spades');
    (firstCard as { rank: Rank }).rank = 'A';

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

  it('returns cloned dealt hands and result objects from exported helpers', () => {
    const sourceHand = hand('X 7C 7D 7H 7S');
    const dealt = makeDealtHand('JokerPoker', 20, 5, sourceHand);
    const result: HandResult = {
      phase: 'complete',
      variant: 'JokerPoker',
      finalHand: sourceHand,
      heldIndexes: [0, 1],
      handRank: 'fiveOfAKind',
      bet: 5,
      payout: 1000,
      netCredits: 995,
      credits: 1020,
    };
    const clonedResult = cloneResult(result);

    expect(dealt).toEqual({
      phase: 'dealt',
      variant: 'JokerPoker',
      credits: 20,
      bet: 5,
      hand: sourceHand,
    });
    expect(dealt.hand).not.toBe(sourceHand);
    expect(clonedResult).toEqual(result);
    expect(clonedResult).not.toBe(result);
    expect(clonedResult.finalHand).not.toBe(result.finalHand);
    expect(clonedResult.heldIndexes).not.toBe(result.heldIndexes);
  });
});
