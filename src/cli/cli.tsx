#!/usr/bin/env node
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {useCallback, useEffect, useState} from 'react';
import {Box, Text, render, useApp, useInput, useStdin} from 'ink';
import terminalImage from 'terminal-image';
import {buttons} from './config/buttons.js';
import type {ButtonConfig} from './types/button-config.js';
import type {MouseClick} from './types/mouse-click.js';
import {useMouse} from './util/use-mouse.js';

const cliDirectory = dirname(fileURLToPath(import.meta.url));
const cardAssetDirectory = resolve(cliDirectory, '../assets/cards');
const cardImageWidth = 24;
const displayedCardFiles = ['ace_of_spades.png', 'king_of_hearts.png', 'queen_of_diamonds.png'] as const;

function ExampleButton({focused, label}: {focused: boolean; label: string}) {
	return (
		<Text color={focused ? 'black' : 'white'} backgroundColor={focused ? 'cyan' : undefined}>
			{focused ? '> ' : '  '}[ {label} ]
		</Text>
	);
}

function combineCardImages(cards: readonly string[]): string {
	const rows = cards.map(card => card.trimEnd().split('\n'));
	const height = Math.max(...rows.map(row => row.length));

	return Array.from({length: height}, (_, index) =>
		rows.map(row => row[index] ?? '').join('  '),
	).join('\n');
}

function CardImages({cards}: {cards: readonly string[]}) {
	if (cards.length === 0) {
		return <Text dimColor>Loading cards...</Text>;
	}

	return <Text>{combineCardImages(cards)}</Text>;
}

function App() {
	const {exit} = useApp();
	const {isRawModeSupported} = useStdin();
	const canUseRawInput = Boolean(process.stdin.isTTY && isRawModeSupported);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [message, setMessage] = useState('Ready');
	const [cards, setCards] = useState<readonly string[]>([]);

	const activate = (button: ButtonConfig) => {
		setFocusedIndex(buttons.indexOf(button));
		setMessage(button.action);
	};

	useEffect(() => {
		let active = true;

		const loadCards = async () => {
			const renderedCards = await Promise.all(
				displayedCardFiles.map(file => terminalImage.file(resolve(cardAssetDirectory, file), {width: cardImageWidth})),
			);

			if (active) {
				setCards(renderedCards);
			}
		};

		void loadCards().catch(error => {
			if (active) {
				setMessage(error instanceof Error ? error.message : 'Failed to load card images');
			}
		});

		return () => {
			active = false;
		};
	}, []);

	useInput(
		(input, key) => {
			if (input === 'q' || key.escape) {
				exit();
				return;
			}

			if (key.downArrow || key.tab) {
				setFocusedIndex(index => (index + 1) % buttons.length);
				return;
			}

			if (key.upArrow) {
				setFocusedIndex(index => (index - 1 + buttons.length) % buttons.length);
				return;
			}

			if (key.return || input === ' ') {
				activate(buttons[focusedIndex]);
			}
		},
		{isActive: canUseRawInput},
	);

	const handleMouseClick = useCallback((click: MouseClick) => {
		const button = buttons.find(candidate => candidate.row === click.y && click.x >= 1 && click.x <= 12);

		if (button) {
			activate(button);
		}
	}, []);

	useMouse(handleMouseClick);

	return (
		<Box flexDirection="column">
			<Text bold>Video Poker CLI</Text>
			<Text dimColor>PNG card preview from src/assets/cards.</Text>
			<Box marginTop={1}>
				<CardImages cards={cards} />
			</Box>
			<Box flexDirection="column" marginTop={1}>
				{buttons.map((button, index) => (
					<ExampleButton key={button.id} focused={focusedIndex === index} label={button.label} />
				))}
			</Box>
			<Box flexDirection="column" marginTop={1}>
				<Text>
					Last action: <Text color="green">{message}</Text>
				</Text>
				<Text dimColor>Use up/down, tab, enter, space, or click a button. Press q or escape to quit.</Text>
			</Box>
		</Box>
	);
}

render(<App />, {
	alternateScreen: true,
	interactive: true,
});
