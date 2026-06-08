import type React from 'react';
import { useHotkeys } from '@tanstack/react-hotkeys';
import type { GamePhase } from '../engine';
import { useLayoutStore } from '../stores/layout';
import { GAME_SPEEDS, type GameSpeed } from '../stores/userSettings';
import { Kbd } from './ui/kbd';

interface BetControlsProps {
  readonly bet: number;
  readonly canDeal: boolean;
  readonly inputLocked: boolean;
  readonly phase: GamePhase;
  readonly speed: GameSpeed;
  readonly onBetChange: (bet: number) => void;
  readonly onDeal: () => void;
  readonly onDraw: () => void;
  readonly onOptionsRender: (className: string, shortcut: React.ReactNode) => React.ReactNode;
  readonly onSpeedChange: () => void;
}

function ShortcutBadge({ shortcut, disabled }: { shortcut: string; disabled: boolean }) {
  if (disabled) {
    return null;
  }

  return (
    <Kbd className="absolute -top-2 -right-2 z-10 border border-[#cab726] bg-[#fff49a] font-[Arial,Helvetica,sans-serif] text-[11px] font-black text-[#070707] max-[760px]:-top-1.5 max-[760px]:-right-1.5 max-[760px]:h-4 max-[760px]:min-w-4 max-[760px]:px-0.5 max-[760px]:text-[9px]">
      {shortcut}
    </Kbd>
  );
}

function ShortcutButtonContent({ label, shortcut, disabled }: { label: string; shortcut: string; disabled: boolean }) {
  return (
    <>
      <span className="min-w-0">{label}</span>
      <ShortcutBadge shortcut={shortcut} disabled={disabled} />
    </>
  );
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
  onOptionsRender,
  onSpeedChange,
}: BetControlsProps) {
  const isPayTableVisible = useLayoutStore((state) => state.isPayTableVisible);
  const togglePayTable = useLayoutStore((state) => state.togglePayTable);
  const isDealt = phase === 'dealt';
  const activeChevronCount = GAME_SPEEDS.indexOf(speed) + 1;
  const nextSpeed = GAME_SPEEDS[activeChevronCount % GAME_SPEEDS.length];
  const canBetDown = !inputLocked && !isDealt && bet > 1;
  const canBetUp = !inputLocked && !isDealt && bet < 5;
  const canPlay = isDealt ? !inputLocked : canDeal;
  const buttonClassName =
    "relative h-[62px] cursor-pointer whitespace-nowrap border-[3px] border-[#cab726] border-t-[#fff7a5] border-l-[#fff7a5] bg-[#ffe63d] px-3 font-[Arial,Helvetica,sans-serif] text-[clamp(14px,1.18vw,22px)] leading-none font-black text-[#070707] [box-shadow:inset_-4px_-4px_0_#ad8f18,inset_3px_3px_0_#fff49a,3px_3px_0_#281900] transition-[transform,box-shadow,border-color] duration-75 ease-out enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:border-[#ad8f18] enabled:active:border-t-[#8d7412] enabled:active:border-l-[#8d7412] enabled:active:[box-shadow:inset_3px_3px_0_#ad8f18,inset_-2px_-2px_0_#fff49a,0_0_0_#281900] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-default disabled:border-[#686868] disabled:border-t-[#9a9a9a] disabled:border-l-[#9a9a9a] disabled:bg-[#777] disabled:text-transparent disabled:opacity-100 disabled:[box-shadow:inset_-4px_-4px_0_#565656,inset_3px_3px_0_#a3a3a3,3px_3px_0_#281900] max-[1180px]:text-[15px] max-[760px]:h-12 max-[760px]:whitespace-normal max-[760px]:px-1 max-[760px]:text-[11px]";

  useHotkeys(
    [
      { hotkey: 'P', callback: togglePayTable },
      { hotkey: 'S', callback: onSpeedChange },
      { hotkey: '-', callback: () => onBetChange(bet - 1), options: { enabled: canBetDown } },
      { hotkey: '=', callback: () => onBetChange(bet + 1), options: { enabled: canBetUp } },
      { hotkey: 'Enter', callback: isDealt ? onDraw : onDeal, options: { enabled: canPlay } },
    ],
    { preventDefault: true },
  );

  return (
    <div
      className="bet-controls grid w-[min(1228px,calc(100vw-396px))] min-w-[760px] grid-cols-6 gap-5 justify-self-center max-[1180px]:w-[calc(100vw-32px)] max-[1180px]:min-w-0 max-[1180px]:gap-2.5 max-[760px]:w-full max-[760px]:gap-2"
      aria-label="Game controls"
    >
      <button type="button" className={buttonClassName} aria-pressed={isPayTableVisible} onClick={togglePayTable}>
        <ShortcutButtonContent label={isPayTableVisible ? 'HIDE PAYS' : 'SHOW PAYS'} shortcut="P" disabled={false} />
      </button>
      {onOptionsRender(
        buttonClassName,
        <ShortcutButtonContent label="OPTIONS" shortcut="O" disabled={false} />,
      )}
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
        <ShortcutBadge shortcut="S" disabled={false} />
      </button>
      <button type="button" className={buttonClassName} disabled={!canBetDown} onClick={() => onBetChange(bet - 1)}>
        {<ShortcutButtonContent label="BET DOWN" shortcut="-" disabled={!canBetDown} />}
      </button>
      <button type="button" className={buttonClassName} disabled={!canBetUp} onClick={() => onBetChange(bet + 1)}>
        <ShortcutButtonContent label="BET UP" shortcut="+" disabled={!canBetUp} />
      </button>
      <button
        type="button"
        className={buttonClassName}
        disabled={!canPlay}
        onClick={isDealt ? onDraw : onDeal}
      >
        <ShortcutButtonContent label={isDealt ? 'DRAW' : 'DEAL'} shortcut="Enter" disabled={!canPlay} />
      </button>
    </div>
  );
}
