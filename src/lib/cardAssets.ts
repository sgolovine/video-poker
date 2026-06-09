import jokerCardUrl from '../assets/cards/JOKER-1.svg?url';
import type { Card, Rank, Suit } from '../engine/types';
import { isJokerCard } from '../engine/util';

const FACE_CARD_URLS = import.meta.glob('../assets/cards/{CLUB,DIAMOND,HEART,SPADE}-*.svg', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const BACK_CARD_URLS = import.meta.glob('../assets/cards/backs/*.svg', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const SUIT_FILE_NAMES: Readonly<Record<Suit, string>> = {
  clubs: 'CLUB',
  diamonds: 'DIAMOND',
  hearts: 'HEART',
  spades: 'SPADE',
};

const RANK_FILE_NAMES: Readonly<Record<Rank, string>> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  J: '11-JACK',
  Q: '12-QUEEN',
  K: '13-KING',
  A: '1',
};

export interface CardBackOption {
  readonly id: string;
  readonly label: string;
  readonly url: string;
}

export const CARD_BACKS: readonly CardBackOption[] = Object.freeze(
  Object.entries(BACK_CARD_URLS)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, url]) => {
      const id = path.match(/\/([^/]+)\.svg$/)?.[1] ?? path;
      return {
        id,
        label: `Back ${id.replace('back-', '')}`,
        url,
      };
    }),
);

export const DEFAULT_CARD_BACK_ID = CARD_BACKS[0]?.id ?? 'back-01';

export function isCardBackId(value: unknown): value is string {
  return typeof value === 'string' && CARD_BACKS.some((cardBack) => cardBack.id === value);
}

function getCardBackImage(cardBackId: string): string {
  return CARD_BACKS.find((cardBack) => cardBack.id === cardBackId)?.url ?? requireAsset(CARD_BACKS[0]?.url);
}

export function getCardImage(card?: Card, cardBackId = DEFAULT_CARD_BACK_ID): string {
  if (!card) {
    return getCardBackImage(cardBackId);
  }

  if (isJokerCard(card)) {
    return jokerCardUrl;
  }

  const suit = SUIT_FILE_NAMES[card.suit];
  const rank = RANK_FILE_NAMES[card.rank];
  return requireAsset(FACE_CARD_URLS[`../assets/cards/${suit}-${rank}.svg`]);
}

function requireAsset(url: string | undefined): string {
  if (!url) {
    throw new Error('Missing card asset.');
  }
  return url;
}
