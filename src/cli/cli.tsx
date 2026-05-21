#!/usr/bin/env node
import {render} from 'ink';
import {TerminalInfoProvider} from 'ink-picture';
import {App} from './components/App.js';

render(
	<TerminalInfoProvider>
		<App />
	</TerminalInfoProvider>,
	{
		alternateScreen: true,
		interactive: true,
	},
);
