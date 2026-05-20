import type {MouseClick} from '../types/mouse-click.js';

const mousePattern = /\u001B\[<(?<button>\d+);(?<x>\d+);(?<y>\d+)(?<event>[mM])/g;

export function parseMouseClicks(data: string): MouseClick[] {
	return [...data.matchAll(mousePattern)]
		.filter(match => match.groups?.event === 'M' && match.groups.button === '0')
		.map(match => ({
			x: Number(match.groups?.x),
			y: Number(match.groups?.y),
		}));
}
