import {Box, Text} from 'ink';
import {theme} from '../theme.js';

type HeaderBarProps = {
	width: number;
};

export function HeaderBar({width}: HeaderBarProps) {
	return (
		<Box width={width} justifyContent="space-between" borderStyle="single" borderColor={theme.tableBorder} paddingX={1}>
			<Text color={theme.tableText} bold>
				VIDEO POKER
			</Text>
			<Text color={theme.secondaryText}>
				[?] HELP  [Q] QUIT
			</Text>
		</Box>
	);
}
