import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {Card, Rank} from '../types/ui.js';

const imageColumns = 12;
const imageRows = 9;
const cardAssetsDirectory = fileURLToPath(new URL('../../assets/cards/', import.meta.url));

const rankFileNames: Record<Rank, string> = {
	A: 'ace',
	K: 'king',
	Q: 'queen',
	J: 'jack',
	'10': '10',
	'9': '9',
	'8': '8',
	'7': '7',
	'6': '6',
	'5': '5',
	'4': '4',
	'3': '3',
	'2': '2',
};

export function getCardImageDimensions() {
	return {
		columns: imageColumns,
		rows: imageRows,
	};
}

export function getCardImageKey(card: Card): string {
	if (card.faceDown) {
		return 'back';
	}

	return `${rankFileNames[card.rank]}_of_${card.suit}`;
}

export function getCardImagePath(card: Card): string {
	return path.join(cardAssetsDirectory, `${getCardImageKey(card)}.png`);
}
