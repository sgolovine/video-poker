import type { GamePhase } from '../../engine';
import { useLayoutStore } from '../stores/layout';
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
  const isPayTableVisible = useLayoutStore((state) => state.isPayTableVisible);
  const togglePayTable = useLayoutStore((state) => state.togglePayTable);
  const isDealt = phase === 'dealt';
  const activeChevronCount = GAME_SPEEDS.indexOf(speed) + 1;
  const nextSpeed = GAME_SPEEDS[activeChevronCount % GAME_SPEEDS.length];
  const buttonClassName =
    "h-[62px] cursor-pointer whitespace-nowrap border-[3px] border-[#cab726] border-t-[#fff7a5] border-l-[#fff7a5] bg-[#ffe63d] font-[Arial,Helvetica,sans-serif] text-[clamp(14px,1.18vw,22px)] leading-none font-black text-[#070707] [box-shadow:inset_-4px_-4px_0_#ad8f18,inset_3px_3px_0_#fff49a,3px_3px_0_#281900] transition-[transform,box-shadow,border-color] duration-75 ease-out enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:border-[#ad8f18] enabled:active:border-t-[#8d7412] enabled:active:border-l-[#8d7412] enabled:active:[box-shadow:inset_3px_3px_0_#ad8f18,inset_-2px_-2px_0_#fff49a,0_0_0_#281900] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-default disabled:border-[#686868] disabled:border-t-[#9a9a9a] disabled:border-l-[#9a9a9a] disabled:bg-[#777] disabled:text-transparent disabled:opacity-100 disabled:[box-shadow:inset_-4px_-4px_0_#565656,inset_3px_3px_0_#a3a3a3,3px_3px_0_#281900] max-[1180px]:text-[15px] max-[760px]:h-12 max-[760px]:whitespace-normal max-[760px]:px-1 max-[760px]:text-[11px]";

  return (
    <div
      className="bet-controls grid w-[min(1228px,calc(100vw-396px))] min-w-[760px] grid-cols-6 gap-5 justify-self-center max-[1180px]:w-[calc(100vw-32px)] max-[1180px]:min-w-0 max-[1180px]:gap-2.5 max-[760px]:w-full max-[760px]:gap-2"
      aria-label="Game controls"
    >
      <button type="button" className={buttonClassName} aria-pressed={isPayTableVisible} onClick={togglePayTable}>
        {isPayTableVisible ? 'HIDE PAYS' : 'SHOW PAYS'}
      </button>
      <button type="button" className={buttonClassName}>
        OPTIONS
      </button>
      <button
        type="button"
        className={`${buttonClassName} inline-flex items-center justify-center gap-[7px] max-[760px]:gap-[3px]`}
        aria-label={`Speed: ${speed}. Press to change to ${nextSpeed}.`}
        title={`Speed: ${speed}`}
        onClick={onSpeedChange}
      >
        <span className="min-w-0">SPEED</span>
        <span className="inline-flex items-center gap-0" aria-hidden="true">
          {GAME_SPEEDS.map((speedSetting, index) => (
            <svg
              key={speedSetting}
              className={[
                'block h-[18px] w-[18px] flex-[0_0_auto] fill-[#777] -ml-[5px] first:ml-0 max-[760px]:h-3.5 max-[760px]:w-3.5 max-[760px]:-ml-1.5',
                index < activeChevronCount ? 'fill-[#ff1d14]' : '',
              ].join(' ')}
              viewBox="0 -960 960 960"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
            </svg>
          ))}
        </span>
      </button>
      <button type="button" className={buttonClassName} disabled={inputLocked || isDealt || bet <= 1} onClick={() => onBetChange(bet - 1)}>
        BET DOWN
      </button>
      <button type="button" className={buttonClassName} disabled={inputLocked || isDealt || bet >= 5} onClick={() => onBetChange(bet + 1)}>
        BET UP
      </button>
      <button
        type="button"
        className={buttonClassName}
        disabled={isDealt ? inputLocked : !canDeal}
        onClick={isDealt ? onDraw : onDeal}
      >
        {isDealt ? 'DRAW' : 'DEAL'}
      </button>
    </div>
  );
}
