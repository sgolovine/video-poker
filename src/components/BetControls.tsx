import type { GamePhase } from '../../engine';

interface BetControlsProps {
  readonly bet: number;
  readonly canDeal: boolean;
  readonly phase: GamePhase;
  readonly onBetChange: (bet: number) => void;
  readonly onDeal: () => void;
  readonly onDraw: () => void;
}

export function BetControls({ bet, canDeal, phase, onBetChange, onDeal, onDraw }: BetControlsProps) {
  const isDealt = phase === 'dealt';

  return (
    <div className="controls" aria-label="Game controls">
      <button type="button">SEE PAYS</button>
      <button type="button">OPTIONS</button>
      <button type="button">SPEED &gt;&gt;&gt;&gt;</button>
      <button type="button" disabled={isDealt || bet <= 1} onClick={() => onBetChange(bet - 1)}>
        BET DOWN
      </button>
      <button type="button" disabled={isDealt || bet >= 5} onClick={() => onBetChange(bet + 1)}>
        BET UP
      </button>
      <button type="button" className="primary-action" disabled={isDealt ? false : !canDeal} onClick={isDealt ? onDraw : onDeal}>
        {isDealt ? 'DRAW' : 'DEAL'}
      </button>
    </div>
  );
}
