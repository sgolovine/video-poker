import {Box, Text} from 'ink';
import Image from 'ink-picture';
import {theme} from '../theme.js';
import type {Card} from '../types/ui.js';
import {getCardImageDimensions, getCardImagePath} from '../utils/card-images.js';
import {padCenter} from '../utils/format.js';

const cardImageDimensions = getCardImageDimensions();
const cardWidth = cardImageDimensions.columns;
const cardHeight = cardImageDimensions.rows;
const cardFrameWidth = cardWidth + 2;
const cardFrameHeight = cardHeight + 2;

type PlayingCardProps = {
	active: boolean;
	card: Card;
	index: number;
};

export function PlayingCard({active, card, index}: PlayingCardProps) {
	return (
		<Box flexDirection="column" width={cardFrameWidth}>
			<Box width={cardFrameWidth} justifyContent="center">
				<Text color={theme.heldText}>{padCenter(card.held && !card.faceDown ? 'HELD' : '', cardFrameWidth)}</Text>
			</Box>
			<Box
				borderColor={theme.cardBorder}
				borderStyle="bold"
				width={cardFrameWidth}
				height={cardFrameHeight}
			>
				<Box width={cardWidth} height={cardHeight} marginTop={1} paddingBottom={0}>
					<Image
						src={getCardImagePath(card)}
						width={cardWidth}
						height={cardHeight}
						alt=" "
						protocol="auto"
					/>
				</Box>
			</Box>
			<Box width={cardFrameWidth} justifyContent="center">
				<Text color={active ? theme.heldText : theme.secondaryText}>[{index}]</Text>
			</Box>
		</Box>
	);
}
