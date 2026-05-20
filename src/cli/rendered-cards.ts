import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const cliDirectory = dirname(fileURLToPath(import.meta.url));
const cardAssetDirectory = resolve(cliDirectory, '../assets/cards');

export const cardHeight = 11;
export const cardSpacing = 2;
export const cardWidth = 14;

const displayedCardFiles = [
	'ace_of_spades.png',
	'king_of_hearts.png',
	'queen_of_diamonds.png',
	'jack_of_clubs.png',
	'10_of_hearts.png',
] as const;

export const displayedCards = displayedCardFiles.map(fileName => ({
	fileName,
	path: resolve(cardAssetDirectory, fileName),
}));
