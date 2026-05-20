#!/usr/bin/env node
import {useCallback, useState} from 'react';
import {Box, Text, render, useApp, useInput, useStdin} from 'ink';
import Image, {TerminalInfoProvider, useTerminalCapabilities} from 'ink-picture';
import {cardHeight, cardSpacing, cardWidth, displayedCards} from './rendered-cards.js';
import type {MouseClick} from './types/mouse-click.js';
import {useMouse} from './util/use-mouse.js';

const cardOuterHeight = cardHeight + 3;
const cardOuterWidth = cardWidth + 2;
const firstCardColumn = 1;
const firstCardRow = 4;

type CardImagesProps = {
	activeIndex: number;
	selectedIndexes: ReadonlySet<number>;
};

function CardImages({activeIndex, selectedIndexes}: CardImagesProps) {
	return (
		<Box flexDirection="row">
			{displayedCards.map((card, index) => (
				<Box
					key={card.fileName}
					width={cardOuterWidth}
					height={cardOuterHeight}
					marginRight={index === displayedCards.length - 1 ? 0 : cardSpacing}
					flexDirection="column"
					flexShrink={0}
					justifyContent="space-between"
				>
					<Box
						width={cardOuterWidth}
						height={cardHeight + 2}
						borderStyle={activeIndex === index ? 'single' : undefined}
						borderColor="cyan"
						paddingX={activeIndex === index ? 0 : 1}
						paddingY={activeIndex === index ? 0 : 1}
					>
						<Image src={card.path} width={cardWidth} height={cardHeight} alt={card.fileName} />
					</Box>
					<Box width={cardOuterWidth} height={1} justifyContent="center">
						{selectedIndexes.has(index) ? (
							<Text color="yellow" bold>
								SELECTED
							</Text>
						) : (
							<Text> </Text>
						)}
					</Box>
				</Box>
			))}
		</Box>
	);
}

function App() {
	const {exit} = useApp();
	const {isRawModeSupported} = useStdin();
	const canUseRawInput = Boolean(process.stdin.isTTY && isRawModeSupported);
	const [activeCardIndex, setActiveCardIndex] = useState(0);
	const [selectedCardIndexes, setSelectedCardIndexes] = useState<ReadonlySet<number>>(() => new Set());
	const capabilities = useTerminalCapabilities()

	const canRenderImages = capabilities?.supportsITerm2Graphics || capabilities?.supportsKittyGraphics || capabilities?.supportsSixelGraphics;

	const moveActiveCard = useCallback((delta: number) => {
		setActiveCardIndex(index => (index + delta + displayedCards.length) % displayedCards.length);
	}, []);

	const toggleSelectedCard = useCallback((index: number) => {
		setSelectedCardIndexes(currentIndexes => {
			const nextIndexes = new Set(currentIndexes);

			if (nextIndexes.has(index)) {
				nextIndexes.delete(index);
			} else {
				nextIndexes.add(index);
			}

			return nextIndexes;
		});
	}, []);

	useInput(
		(input, key) => {
			if (input === 'q' || key.escape) {
				exit();
				return;
			}

			if (key.rightArrow || key.downArrow || key.tab) {
				moveActiveCard(1);
				return;
			}

			if (key.leftArrow || key.upArrow) {
				moveActiveCard(-1);
				return;
			}

			if (input === ' ') {
				toggleSelectedCard(activeCardIndex);
			}
		},
		{isActive: canUseRawInput},
	);

	const handleMouseClick = useCallback((click: MouseClick) => {
		if (click.y < firstCardRow || click.y >= firstCardRow + cardHeight + 2) {
			return;
		}

		const cardStride = cardOuterWidth + cardSpacing;
		const clickedIndex = Math.floor((click.x - firstCardColumn) / cardStride);
		const clickedCardStart = firstCardColumn + clickedIndex * cardStride;
		const clickedInsideCard =
			clickedIndex >= 0 &&
			clickedIndex < displayedCards.length &&
			click.x >= clickedCardStart &&
			click.x < clickedCardStart + cardOuterWidth;

		if (clickedInsideCard) {
			setActiveCardIndex(clickedIndex);
			toggleSelectedCard(clickedIndex);
		}
	}, [toggleSelectedCard]);

	useMouse(handleMouseClick);

	return (
		<Box flexDirection="column">
			<Text bold>Video Poker CLI</Text>
			<Text dimColor>Use arrow keys to move, space to select, q to quit.</Text>
			{!canRenderImages && <Text>Your terminal does not support images!</Text>}
			<Box marginTop={1}>
				<CardImages
					activeIndex={activeCardIndex}
					selectedIndexes={selectedCardIndexes}
				/>
			</Box>
		</Box>
	);
}

render(
	<TerminalInfoProvider>
		<App />
	</TerminalInfoProvider>,
	{
		alternateScreen: true,
		interactive: true,
	},
);
