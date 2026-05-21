import {mockPokerUIState} from '../data/mock-ui-state.js';
import {useTerminalLayout} from '../hooks/use-terminal-layout.js';
import {GameScreen} from './GameScreen.js';

export function App() {
	const layout = useTerminalLayout();

	return <GameScreen layout={layout} state={mockPokerUIState} />;
}
