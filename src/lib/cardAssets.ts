import { isJokerCard, type Card, type Rank, type Suit } from '../engine';
import jokerCardUrl from '../../new_cards/JOKER-1.svg?url';

const FACE_CARD_URLS = import.meta.glob('../../new_cards/{CLUB,DIAMOND,HEART,SPADE}-*.svg', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const BACK_CARD_URLS = import.meta.glob('../../assets/cards/backs/*.svg', {
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

export const CARD_BACKS: readonly string[] = Object.freeze(
  Object.entries(BACK_CARD_URLS)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, url]) => url),
);

export const DEFAULT_CARD_BACK_URL = CARD_BACKS[0];
export const CARD_BACK_URL = DEFAULT_CARD_BACK_URL;

export function getCardImage(card?: Card): string {
  if (!card) {
    return DEFAULT_CARD_BACK_URL;
  }

  if (isJokerCard(card)) {
    return jokerCardUrl;
  }

  const suit = SUIT_FILE_NAMES[card.suit];
  const rank = RANK_FILE_NAMES[card.rank];
  return requireAsset(FACE_CARD_URLS[`../../new_cards/${suit}-${rank}.svg`]);
}

function requireAsset(url: string | undefined): string {
  if (!url) {
    throw new Error('Missing card asset.');
  }
  return url;
}
