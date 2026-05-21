import type {Card, Suit} from '../types/ui.js';

const suitSymbols: Record<Suit, string> = {
	spades: '♠',
	hearts: '♥',
	diamonds: '♦',
	clubs: '♣',
};

const asciiSuitSymbols: Record<Suit, string> = {
	spades: 'S',
	hearts: 'H',
	diamonds: 'D',
	clubs: 'C',
};

export function getSuitSymbol(suit: Suit, useAsciiSuits: boolean): string {
	return useAsciiSuits ? asciiSuitSymbols[suit] : suitSymbols[suit];
}

export function getCardLabel(card: Card, useAsciiSuits: boolean): string {
	return `${card.rank}${getSuitSymbol(card.suit, useAsciiSuits)}`;
}

export function getSuitColor(suit: Suit): 'red' | 'black' {
	return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}
