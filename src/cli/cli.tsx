#!/usr/bin/env node
import {useCallback, useState} from 'react';
import {Box, Text, render, useApp, useInput, useStdin} from 'ink';
import {buttons} from './config/buttons.js';
import type {ButtonConfig} from './types/button-config.js';
import type {MouseClick} from './types/mouse-click.js';
import {useMouse} from './util/use-mouse.js';

function ExampleButton({focused, label}: {focused: boolean; label: string}) {
	return (
		<Text color={focused ? 'black' : 'white'} backgroundColor={focused ? 'cyan' : undefined}>
			{focused ? '> ' : '  '}[ {label} ]
		</Text>
	);
}

function App() {
	const {exit} = useApp();
	const {isRawModeSupported} = useStdin();
	const canUseRawInput = Boolean(process.stdin.isTTY && isRawModeSupported);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [message, setMessage] = useState('Ready');

	const activate = (button: ButtonConfig) => {
		setFocusedIndex(buttons.indexOf(button));
		setMessage(button.action);
	};

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
			<Text dimColor>Ink bootstrap with keyboard and mouse input.</Text>
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
