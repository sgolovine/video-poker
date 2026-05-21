import {Box, Text} from 'ink';
import {paytableRows} from '../data/paytable.js';
import {theme} from '../theme.js';
import type {BetColumn} from '../types/ui.js';
import {padCenter, padLeft, padRight} from '../utils/format.js';

const betColumns = [1, 2, 3, 4, 5] as const satisfies BetColumn[];
const handWidth = 19;
const betWidth = 8;

type PaytableProps = {
	selectedBetColumn: BetColumn;
	compact: boolean;
};

export function Paytable({selectedBetColumn, compact}: PaytableProps) {
	if (compact) {
		return <CompactPaytable selectedBetColumn={selectedBetColumn} />;
	}

	return (
		<Box flexDirection="column" borderStyle="single" borderColor={theme.tableBorder} paddingX={1}>
			<Text color={theme.tableText} bold>
				PAYTABLE
			</Text>
			<Box>
				<Text color={theme.tableText}>{padRight('HAND', handWidth)}</Text>
				{betColumns.map(column => (
					<TableCell key={column} active={column === selectedBetColumn}>
						{padCenter(`BET ${column}`, betWidth)}
					</TableCell>
				))}
			</Box>
			{paytableRows.map(row => (
				<Box key={row.hand}>
					<Text color={theme.tableText}>{padRight(row.hand, handWidth)}</Text>
					{betColumns.map(column => (
						<TableCell key={column} active={column === selectedBetColumn}>
							{padCenter(padLeft(String(row.payouts[column]), betWidth - 1), betWidth)}
						</TableCell>
					))}
				</Box>
			))}
		</Box>
	);
}

function CompactPaytable({selectedBetColumn}: Pick<PaytableProps, 'selectedBetColumn'>) {
	return (
		<Box flexDirection="column" borderStyle="single" borderColor={theme.tableBorder} paddingX={1}>
			<Text color={theme.tableText} bold>
				PAYTABLE
			</Text>
			<Box>
				<Text color={theme.tableText}>{padRight('HAND', handWidth)}</Text>
				<TableCell active>{padCenter(`BET ${selectedBetColumn}`, betWidth)}</TableCell>
			</Box>
			{paytableRows.map(row => (
				<Box key={row.hand}>
					<Text color={theme.tableText}>{padRight(row.hand, handWidth)}</Text>
					<TableCell active>
						{padCenter(String(row.payouts[selectedBetColumn]), betWidth)}
					</TableCell>
				</Box>
			))}
		</Box>
	);
}

type TableCellProps = {
	active: boolean;
	children: string;
};

function TableCell({active, children}: TableCellProps) {
	const content = active ? padCenter(`>${children.trim()}<`, children.length) : children;

	return (
		<Text
			color={active ? theme.activeColumnText : theme.tableText}
			backgroundColor={active ? theme.activeColumnBackground : undefined}
		>
			{content}
		</Text>
	);
}
