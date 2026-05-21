import {useEffect, useState} from 'react';
import {useStdout} from 'ink';
import type {TerminalLayout} from '../types/ui.js';

function getLayout(columns: number, rows: number): TerminalLayout {
	const size = columns >= 120 ? 'large' : columns >= 90 ? 'medium' : 'small';

	return {
		columns,
		rows,
		size,
		showCompactPaytable: size === 'small',
		useShortActions: size !== 'large',
		cardGap: size === 'large' ? 3 : 1,
	};
}

export function useTerminalLayout(): TerminalLayout {
	const {stdout} = useStdout();
	const [layout, setLayout] = useState(() => getLayout(stdout.columns ?? 120, stdout.rows ?? 36));

	useEffect(() => {
		const handleResize = () => {
			setLayout(getLayout(stdout.columns ?? 120, stdout.rows ?? 36));
		};

		stdout.on('resize', handleResize);

		return () => {
			stdout.off('resize', handleResize);
		};
	}, [stdout]);

	return layout;
}
