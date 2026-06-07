import type { GamePhase } from '../../engine';
import { GAME_SPEEDS, type GameSpeed } from '../stores/userSettings';

interface BetControlsProps {
  readonly bet: number;
  readonly canDeal: boolean;
  readonly inputLocked: boolean;
  readonly phase: GamePhase;
  readonly speed: GameSpeed;
  readonly onBetChange: (bet: number) => void;
  readonly onDeal: () => void;
  readonly onDraw: () => void;
  readonly onSpeedChange: () => void;
}

export function BetControls({
  bet,
  canDeal,
  inputLocked,
  phase,
  speed,
  onBetChange,
  onDeal,
  onDraw,
  onSpeedChange,
}: BetControlsProps) {
  const isDealt = phase === 'dealt';
  const activeChevronCount = GAME_SPEEDS.indexOf(speed) + 1;
  const nextSpeed = GAME_SPEEDS[activeChevronCount % GAME_SPEEDS.length];

  return (
    <div className="controls" aria-label="Game controls">
      <button type="button">SEE PAYS</button>
      <button type="button">OPTIONS</button>
      <button
        type="button"
        className="speed-button"
        aria-label={`Speed: ${speed}. Press to change to ${nextSpeed}.`}
        title={`Speed: ${speed}`}
        onClick={onSpeedChange}
      >
        <span className="speed-button-label">SPEED</span>
        <span className="speed-chevrons" aria-hidden="true">
          {GAME_SPEEDS.map((speedSetting, index) => (
            <svg
              key={speedSetting}
              className={index < activeChevronCount ? 'speed-chevron is-active' : 'speed-chevron'}
              viewBox="0 -960 960 960"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
            </svg>
          ))}
        </span>
      </button>
      <button type="button" disabled={inputLocked || isDealt || bet <= 1} onClick={() => onBetChange(bet - 1)}>
        BET DOWN
      </button>
      <button type="button" disabled={inputLocked || isDealt || bet >= 5} onClick={() => onBetChange(bet + 1)}>
        BET UP
      </button>
      <button
        type="button"
        className="primary-action"
        disabled={isDealt ? inputLocked : !canDeal}
        onClick={isDealt ? onDraw : onDeal}
      >
        {isDealt ? 'DRAW' : 'DEAL'}
      </button>
    </div>
  );
}
