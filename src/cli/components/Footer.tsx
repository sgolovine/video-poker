import {Text} from 'ink';
import {theme} from '../theme.js';

type FooterProps = {
	variant: string;
};

export function Footer({variant}: FooterProps) {
	return <Text color={theme.secondaryText}>Game: {variant}</Text>;
}
