import {useCallback, useState} from 'react';
import {useApp, useInput, useStdin} from 'ink';
import {mockPokerUIState} from '../data/mock-ui-state.js';
import {useTerminalLayout} from '../hooks/use-terminal-layout.js';
import type {PokerUIState} from '../types/ui.js';
import {GameScreen} from './GameScreen.js';

export function App() {
	const {exit} = useApp();
	const {isRawModeSupported} = useStdin();
	const layout = useTerminalLayout();
	const [activeCardIndex, setActiveCardIndex] = useState(0);
	const [state, setState] = useState<PokerUIState>(mockPokerUIState);

	const moveActiveCard = useCallback((delta: number) => {
		setActiveCardIndex(index => (index + delta + state.cards.length) % state.cards.length);
	}, [state.cards.length]);

	const toggleHeldCard = useCallback((index: number) => {
		setState(currentState => ({
			...currentState,
			cards: currentState.cards.map((card, cardIndex) => (
				cardIndex === index && !card.faceDown
					? {...card, held: !card.held}
					: card
			)),
		}));
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
				toggleHeldCard(activeCardIndex);
				return;
			}

			const numericInput = Number(input);
			if (Number.isInteger(numericInput) && numericInput >= 1 && numericInput <= state.cards.length) {
				const selectedIndex = numericInput - 1;
				setActiveCardIndex(selectedIndex);
				toggleHeldCard(selectedIndex);
			}
		},
		{isActive: Boolean(process.stdin.isTTY && isRawModeSupported)},
	);

	return (
		<GameScreen
			activeCardIndex={activeCardIndex}
			layout={layout}
			state={state}
		/>
	);
}
