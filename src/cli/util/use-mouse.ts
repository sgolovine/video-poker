import {useEffect} from 'react';
import {useStdin, useStdout} from 'ink';
import type {MouseClick} from '../types/mouse-click.js';
import {parseMouseClicks} from './parse-mouse-clicks.js';

export function useMouse(onClick: (click: MouseClick) => void): void {
	const {stdin, setRawMode, isRawModeSupported} = useStdin();
	const {stdout} = useStdout();

	useEffect(() => {
		if (!isRawModeSupported || !stdin.isTTY) {
			return;
		}

		setRawMode(true);
		stdout.write('\u001B[?1000h\u001B[?1006h');

		const handleData = (data: Buffer) => {
			for (const click of parseMouseClicks(data.toString('utf8'))) {
				onClick(click);
			}
		};

		stdin.on('data', handleData);

		return () => {
			stdin.off('data', handleData);
			stdout.write('\u001B[?1000l\u001B[?1006l');
			setRawMode(false);
		};
	}, [isRawModeSupported, onClick, setRawMode, stdin, stdout]);
}
