export type GameState = 'ready' | 'holding' | 'result';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

export type Card = {
	rank: Rank;
	suit: Suit;
	held: boolean;
	faceDown: boolean;
};

export type BetColumn = 1 | 2 | 3 | 4 | 5;

export type SpeedLevel = 1 | 2 | 3;

export type PokerUIState = {
	gameState: GameState;
	variant: 'Jacks or Better';
	cards: Card[];
	resultLabel: string | null;
	winAmount: number;
	betAmount: number;
	balanceAmount: number;
	selectedBetColumn: BetColumn;
	speedLevel: SpeedLevel;
};

export type PaytableRow = {
	hand: string;
	payouts: Record<BetColumn, number>;
};

export type TerminalLayout = {
	columns: number;
	rows: number;
	size: 'small' | 'medium' | 'large';
	showCompactPaytable: boolean;
	useShortActions: boolean;
	cardGap: number;
};
