import {TerminalInfoContext, TerminalInfoProvider, type TerminalInfo} from 'ink-picture';
import {mockPokerUIState} from '../data/mock-ui-state.js';
import {useTerminalLayout} from '../hooks/use-terminal-layout.js';
import {GameScreen} from './GameScreen.js';

const fallbackTerminalInfo: TerminalInfo = {
	dimensions: {
		viewportWidth: (process.stdout.columns ?? 80) * 6,
		viewportHeight: (process.stdout.rows ?? 24) * 12,
		cellWidth: 6,
		cellHeight: 12,
	},
	capabilities: {
		supportsUnicode: true,
		supportsColor: true,
		supportsSixelGraphics: false,
		supportsKittyGraphics: false,
		supportsITerm2Graphics: false,
	},
};

export function App() {
	const layout = useTerminalLayout();
	const screen = <GameScreen layout={layout} state={mockPokerUIState} />;

	if (process.stdin.isTTY && process.stdout.isTTY) {
		return <TerminalInfoProvider>{screen}</TerminalInfoProvider>;
	}

	return (
		<TerminalInfoContext.Provider value={fallbackTerminalInfo}>
			{screen}
		</TerminalInfoContext.Provider>
	);
}
