import type { HandRank } from '../engine';

export const HAND_ORDER: readonly HandRank[] = [
  'royalFlush',
  'straightFlush',
  'fourOfAKind',
  'fullHouse',
  'flush',
  'straight',
  'threeOfAKind',
  'twoPair',
  'jacksOrBetter',
];

export const HAND_LABELS: Readonly<Record<HandRank, string>> = {
  royalFlush: 'ROYAL FLUSH',
  straightFlush: 'STRAIGHT FLUSH',
  fourOfAKind: 'FOUR OF A KIND',
  fullHouse: 'FULL HOUSE',
  flush: 'FLUSH',
  straight: 'STRAIGHT',
  threeOfAKind: 'THREE OF A KIND',
  twoPair: 'TWO PAIR',
  jacksOrBetter: 'JACKS OR BETTER',
  nothing: 'GAME OVER',
};
