import type {PokerUIState} from '../types/ui.js';

export const mockPokerUIState: PokerUIState = {
	gameState: 'result',
	variant: 'Jacks or Better',
	cards: [
		{rank: '3', suit: 'spades', held: false, faceDown: false},
		{rank: 'Q', suit: 'diamonds', held: true, faceDown: false},
		{rank: 'Q', suit: 'clubs', held: true, faceDown: false},
		{rank: 'A', suit: 'hearts', held: true, faceDown: false},
		{rank: 'A', suit: 'spades', held: true, faceDown: false},
	],
	resultLabel: 'TWO PAIR',
	winAmount: 20,
	betAmount: 10,
	balanceAmount: 3010,
	selectedBetColumn: 1,
	speedLevel: 3,
};
