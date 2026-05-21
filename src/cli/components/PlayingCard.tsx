import {Box, Text} from 'ink';
import {theme} from '../theme.js';
import type {Card} from '../types/ui.js';
import {getCardLabel, getSuitColor, getSuitSymbol} from '../utils/cards.js';
import {padCenter, padLeft, padRight} from '../utils/format.js';

const cardInnerWidth = 14;

type PlayingCardProps = {
	card: Card;
	index: number;
	useAsciiSuits: boolean;
};

export function PlayingCard({card, index, useAsciiSuits}: PlayingCardProps) {
	const label = getCardLabel(card, useAsciiSuits);
	const suit = getSuitSymbol(card.suit, useAsciiSuits);
	const cardColor = getSuitColor(card.suit) === 'red' ? theme.cardTextRed : theme.cardTextBlack;

	return (
		<Box flexDirection="column" width={16}>
			<Box
				flexDirection="column"
				width={16}
				height={9}
				borderStyle="single"
				borderColor={theme.cardBorder}
				backgroundColor={theme.cardBackground}
			>
				{card.faceDown ? (
					<FaceDownCard />
				) : (
					<>
						<Text color={theme.heldText} backgroundColor={theme.cardBackground}>
							{padCenter(card.held ? 'HELD' : '', cardInnerWidth)}
						</Text>
						<Text color={cardColor} backgroundColor={theme.cardBackground}>
							{padRight(label, cardInnerWidth)}
						</Text>
						<Text backgroundColor={theme.cardBackground}>{' '.repeat(cardInnerWidth)}</Text>
						<Text color={cardColor} backgroundColor={theme.cardBackground}>
							{padCenter(suit, cardInnerWidth)}
						</Text>
						<Text backgroundColor={theme.cardBackground}>{' '.repeat(cardInnerWidth)}</Text>
						<Text color={cardColor} backgroundColor={theme.cardBackground}>
							{padLeft(label, cardInnerWidth)}
						</Text>
					</>
				)}
			</Box>
			<Box width={16} justifyContent="center">
				<Text color={theme.secondaryText}>[{index}]</Text>
			</Box>
		</Box>
	);
}

function FaceDownCard() {
	return (
		<>
			<Text color={theme.cardTextBlack} backgroundColor={theme.cardBackground}>
				{'░'.repeat(cardInnerWidth)}
			</Text>
			<Text color={theme.cardTextBlack} backgroundColor={theme.cardBackground}>
				{'░'.repeat(cardInnerWidth)}
			</Text>
			<Text color={theme.cardTextBlack} backgroundColor={theme.cardBackground}>
				{padCenter('VIDEO', cardInnerWidth).replaceAll(' ', '░')}
			</Text>
			<Text color={theme.cardTextBlack} backgroundColor={theme.cardBackground}>
				{padCenter('POKER', cardInnerWidth).replaceAll(' ', '░')}
			</Text>
			<Text color={theme.cardTextBlack} backgroundColor={theme.cardBackground}>
				{'░'.repeat(cardInnerWidth)}
			</Text>
			<Text color={theme.cardTextBlack} backgroundColor={theme.cardBackground}>
				{'░'.repeat(cardInnerWidth)}
			</Text>
		</>
	);
}
