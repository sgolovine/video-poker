import {Box, Text} from 'ink';
import {theme} from '../theme.js';

type ResultBannerProps = {
	label: string;
	width: number;
};

export function ResultBanner({label, width}: ResultBannerProps) {
	return (
		<Box width={width} justifyContent="center">
			<Text color={theme.resultText} bold>
				{label.toUpperCase()}
			</Text>
		</Box>
	);
}
