export function formatCurrency(value: number): string {
	return value.toFixed(2);
}

export function padCenter(value: string, width: number): string {
	if (value.length >= width) {
		return value.slice(0, width);
	}

	const left = Math.floor((width - value.length) / 2);
	const right = width - value.length - left;

	return `${' '.repeat(left)}${value}${' '.repeat(right)}`;
}

export function padLeft(value: string, width: number): string {
	return value.padStart(width).slice(-width);
}

export function padRight(value: string, width: number): string {
	return value.padEnd(width).slice(0, width);
}
