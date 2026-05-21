import {Box} from 'ink';
import type {Card} from '../types/ui.js';
import {PlayingCard} from './PlayingCard.js';

type CardRowProps = {
	activeIndex: number;
	cards: Card[];
	gap: number;
	wrap: boolean;
};

export function CardRow({activeIndex, cards, gap, wrap}: CardRowProps) {
	return (
		<Box flexDirection="row" flexWrap={wrap ? 'wrap' : 'nowrap'}>
			{cards.map((card, index) => (
				<Box key={`${card.rank}-${card.suit}-${index}`} marginRight={index === cards.length - 1 ? 0 : gap} marginBottom={wrap ? 1 : 0}>
					<PlayingCard active={activeIndex === index} card={card} index={index + 1} />
				</Box>
			))}
		</Box>
	);
}
