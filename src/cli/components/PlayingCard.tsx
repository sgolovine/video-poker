import {Box, Text} from 'ink';
import Image from 'ink-picture';
import {theme} from '../theme.js';
import type {Card} from '../types/ui.js';
import {getCardImageDimensions, getCardImagePath} from '../utils/card-images.js';
import {padCenter} from '../utils/format.js';

const cardImageDimensions = getCardImageDimensions();
const cardWidth = cardImageDimensions.columns;
const cardInnerWidth = cardWidth;
const cardHeight = cardImageDimensions.rows;

type PlayingCardProps = {
	active: boolean;
	card: Card;
	index: number;
};

export function PlayingCard({active, card, index}: PlayingCardProps) {
	return (
		<Box flexDirection="column" width={cardWidth}>
			<Box width={cardWidth} justifyContent="center">
				<Text color={theme.heldText}>{padCenter(card.held && !card.faceDown ? 'HELD' : '', cardInnerWidth)}</Text>
			</Box>
			<Box
				flexDirection="column"
				width={cardWidth}
				height={cardHeight}
			>
				<Image
					src={getCardImagePath(card)}
					width={cardWidth}
					height={cardHeight}
					protocol="auto"
				/>
			</Box>
			<Box width={cardWidth} justifyContent="center">
				<Text color={active ? theme.heldText : theme.secondaryText}>[{index}]</Text>
			</Box>
		</Box>
	);
}
