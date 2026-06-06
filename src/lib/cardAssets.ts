import type { Card, Rank } from '../../engine';

const CARD_URLS = import.meta.glob('../../assets/cards/*.svg', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

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
  J: 'jack',
  Q: 'queen',
  K: 'king',
  A: 'ace',
};

export const CARD_BACK_URL = CARD_URLS['../../assets/cards/back.svg'];

export function getCardImage(card?: Card): string {
  if (!card) {
    return CARD_BACK_URL;
  }

  const rank = RANK_FILE_NAMES[card.rank];
  return CARD_URLS[`../../assets/cards/${rank}_of_${card.suit}.svg`];
}
