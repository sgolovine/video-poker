import type { GameVariant, HandRank } from '../engine/types';
import { GAME_DEFINITIONS } from '../engine/util';

export const HAND_LABELS: Readonly<Record<HandRank, string>> = Object.freeze({
  royalFlush: 'ROYAL FLUSH',
  fourDeuces: 'FOUR DEUCES',
  wildRoyalFlush: 'WILD ROYAL FLUSH',
  fiveOfAKind: 'FIVE OF A KIND',
  straightFlush: 'STRAIGHT FLUSH',
  fourOfAKind: 'FOUR OF A KIND',
  fullHouse: 'FULL HOUSE',
  flush: 'FLUSH',
  straight: 'STRAIGHT',
  threeOfAKind: 'THREE OF A KIND',
  twoPair: 'TWO PAIR',
  jacksOrBetter: 'JACKS OR BETTER',
  kingsOrBetter: 'KINGS OR BETTER',
  nothing: 'GAME OVER',
});

export function getHandOrder(variant: GameVariant): readonly HandRank[] {
  return GAME_DEFINITIONS[variant].handOrder;
}

export function getPayTableRanks(variant: GameVariant): readonly HandRank[] {
  return GAME_DEFINITIONS[variant].payTableRanks;
}

export function getGameLabel(variant: GameVariant): string {
  return GAME_DEFINITIONS[variant].label.toUpperCase();
}
