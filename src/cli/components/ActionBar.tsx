import {Box, Text} from 'ink';
import {theme} from '../theme.js';
import type {GameState, SpeedLevel} from '../types/ui.js';

type ActionBarProps = {
	gameState: GameState;
	speedLevel: SpeedLevel;
	shortLabels: boolean;
};

export function ActionBar({gameState, speedLevel, shortLabels}: ActionBarProps) {
	const primaryAction = getPrimaryAction(gameState);
	const labels = shortLabels
		? ['[P] Pays', '[O] Opts', `[S] Speed ${'>'.repeat(speedLevel)}`, '[B] Bet-', '[U] Bet+', `[Enter] ${primaryAction}`]
		: ['[P] SEE PAYS', '[O] OPTIONS', `[S] SPEED ${'>'.repeat(speedLevel)}`, '[B] BET DOWN', '[U] BET UP', `[ENTER] ${primaryAction}`];

	return (
		<Box flexWrap="wrap">
			{labels.map((label, index) => (
				<Box key={label} marginRight={index === labels.length - 1 ? 0 : 2} marginBottom={1}>
					<Text color={theme.buttonText} backgroundColor={theme.buttonBackground} bold>
						{` ${label} `}
					</Text>
				</Box>
			))}
		</Box>
	);
}

function getPrimaryAction(gameState: GameState): string {
	switch (gameState) {
		case 'ready':
			return 'DEAL';
		case 'holding':
			return 'DRAW';
		case 'result':
			return 'PLAY AGAIN';
	}
}
