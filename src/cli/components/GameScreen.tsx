import {Box} from 'ink';
import {theme} from '../theme.js';
import type {PokerUIState, TerminalLayout} from '../types/ui.js';
import {ActionBar} from './ActionBar.js';
import {CardRow} from './CardRow.js';
import {Footer} from './Footer.js';
import {HeaderBar} from './HeaderBar.js';
import {Paytable} from './Paytable.js';
import {ResultBanner} from './ResultBanner.js';
import {StatusBar} from './StatusBar.js';

type GameScreenProps = {
	layout: TerminalLayout;
	state: PokerUIState;
};

export function GameScreen({layout, state}: GameScreenProps) {
	const screenWidth = Math.max(72, Math.min(layout.columns, 120));

	return (
		<Box
			width={screenWidth}
			minHeight={Math.max(layout.rows, 36)}
			flexDirection="column"
			backgroundColor={theme.screenBackground}
			paddingX={1}
			paddingY={0}
		>
			<HeaderBar width={screenWidth - 2} />

			<Box marginTop={1} justifyContent="center">
				<Paytable
					selectedBetColumn={state.selectedBetColumn}
					compact={layout.showCompactPaytable}
				/>
			</Box>

			<Box marginTop={1}>
				<ResultBanner label={state.resultLabel ?? 'PLACE YOUR BET'} width={screenWidth - 2} />
			</Box>

			<Box marginTop={1} justifyContent={layout.size === 'small' ? 'flex-start' : 'center'}>
				<CardRow
					cards={state.cards}
					gap={layout.cardGap}
					useAsciiSuits={layout.size === 'small'}
					wrap={layout.size === 'small'}
				/>
			</Box>

			<Box marginTop={1}>
				<StatusBar
					betAmount={state.betAmount}
					balanceAmount={state.balanceAmount}
					winAmount={state.winAmount}
					width={screenWidth - 2}
				/>
			</Box>

			<Box marginTop={1}>
				<ActionBar
					gameState={state.gameState}
					speedLevel={state.speedLevel}
					shortLabels={layout.useShortActions}
				/>
			</Box>

			<Box marginTop={1}>
				<Footer variant={state.variant} />
			</Box>
		</Box>
	);
}
