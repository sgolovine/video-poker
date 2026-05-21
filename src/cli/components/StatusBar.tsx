import {Box, Text} from 'ink';
import {theme} from '../theme.js';
import {formatCurrency} from '../utils/format.js';

type StatusBarProps = {
	winAmount: number;
	betAmount: number;
	balanceAmount: number;
	width: number;
};

export function StatusBar({winAmount, betAmount, balanceAmount, width}: StatusBarProps) {
	return (
		<Box width={width} justifyContent="space-between">
			<StatusValue label="WIN" value={formatCurrency(winAmount)} />
			<StatusValue label="BET" value={formatCurrency(betAmount)} emphasize />
			<StatusValue label="BALANCE" value={formatCurrency(balanceAmount)} />
		</Box>
	);
}

type StatusValueProps = {
	label: string;
	value: string;
	emphasize?: boolean;
};

function StatusValue({label, value, emphasize = false}: StatusValueProps) {
	return (
		<Text>
			<Text color={theme.statusLabel} bold>
				{label}:{' '}
			</Text>
			<Text color={theme.statusValue} bold={emphasize}>
				{value}
			</Text>
		</Text>
	);
}
