import { useHotkeys } from '@tanstack/react-hotkeys';
import { useState } from 'react';
import type { GamePhase } from '../../../engine/types';
import { useLayoutStore } from '../../../stores/layout';
import { GAME_SPEEDS, type GameSpeed } from '../../../stores/userSettings';
import { Kbd } from '../../../components/ui/kbd';

interface BetControlsProps {
  readonly bet: number;
  readonly canDeal: boolean;
  readonly inputLocked: boolean;
  readonly phase: GamePhase;
  readonly speed: GameSpeed;
  readonly showKeyboardShortcuts: boolean;
  readonly onBetChange: (bet: number) => void;
  readonly onDeal: () => void;
  readonly onDraw: () => void;
  readonly onSpeedChange: () => void;
}

type PressedControl = 'pay-table' | 'speed' | 'bet-down' | 'bet-up' | 'play';
interface PressedControlPulse {
  readonly control: PressedControl;
}

function ShortcutBadge({
  shortcut,
  disabled,
  show,
}: {
  readonly shortcut: string;
  readonly disabled: boolean;
  readonly show: boolean;
}) {
  if (disabled || !show) {
    return null;
  }

  return (
    <Kbd className="absolute -top-2 -right-2 z-10 border border-[#cab726] bg-[#fff49a] text-[11px] font-black text-[#070707] max-[760px]:-top-1.5 max-[760px]:-right-1.5 max-[760px]:h-4 max-[760px]:min-w-4 max-[760px]:px-0.5 max-[760px]:text-[9px]">
      {shortcut}
    </Kbd>
  );
}

function ShortcutButtonContent({
  label,
  shortcut,
  disabled,
  showShortcut,
}: {
  readonly label: string;
  readonly shortcut: string;
  readonly disabled: boolean;
  readonly showShortcut: boolean;
}) {
  return (
    <>
      <span className="min-w-0">{label}</span>
      <ShortcutBadge shortcut={shortcut} disabled={disabled} show={showShortcut} />
    </>
  );
}

export function BetControls({
  bet,
  canDeal,
  inputLocked,
  phase,
  speed,
  showKeyboardShortcuts,
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
  const canBetDown = !inputLocked && !isDealt && bet > 1;
  const canBetUp = !inputLocked && !isDealt && bet < 5;
  const canPlay = isDealt ? !inputLocked : canDeal;
  const [pressedControl, setPressedControl] = useState<PressedControlPulse>();

  const buttonClassName =
    'relative h-[62px] cursor-pointer whitespace-nowrap border-[3px] border-[#cab726] border-t-[#fff7a5] border-l-[#fff7a5] bg-[#ffe63d] px-3 text-[clamp(14px,1.18vw,22px)] leading-none font-black text-[#070707] [box-shadow:inset_-4px_-4px_0_#ad8f18,inset_3px_3px_0_#fff49a,3px_3px_0_#281900] transition-[transform,box-shadow,border-color] duration-75 ease-out enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:border-[#ad8f18] enabled:active:border-t-[#8d7412] enabled:active:border-l-[#8d7412] enabled:active:[box-shadow:inset_3px_3px_0_#ad8f18,inset_-2px_-2px_0_#fff49a,0_0_0_#281900] enabled:data-[key-pressed=true]:animate-[control-press_120ms_ease-out] enabled:data-[key-pressed=true]:translate-x-[3px] enabled:data-[key-pressed=true]:translate-y-[3px] enabled:data-[key-pressed=true]:border-[#ad8f18] enabled:data-[key-pressed=true]:border-t-[#8d7412] enabled:data-[key-pressed=true]:border-l-[#8d7412] enabled:data-[key-pressed=true]:[box-shadow:inset_3px_3px_0_#ad8f18,inset_-2px_-2px_0_#fff49a,0_0_0_#281900] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-default disabled:border-[#686868] disabled:border-t-[#9a9a9a] disabled:border-l-[#9a9a9a] disabled:bg-[#777] disabled:text-transparent disabled:opacity-100 disabled:[box-shadow:inset_-4px_-4px_0_#565656,inset_3px_3px_0_#a3a3a3,3px_3px_0_#281900] max-[1180px]:text-[15px] max-[760px]:h-12 max-[760px]:whitespace-normal max-[760px]:px-1 max-[760px]:text-[11px]';

  function isControlPressed(control: PressedControl) {
    return pressedControl?.control === control;
  }

  function clearPressedControl(control: PressedControl) {
    setPressedControl((current) => (current?.control === control ? undefined : current));
  }

  function pulseControl(control: PressedControl) {
    setPressedControl({ control });
  }

  function runHotkey(control: PressedControl, action: () => void) {
    pulseControl(control);
    action();
  }

  useHotkeys(
    [
      { hotkey: 'P', callback: () => runHotkey('pay-table', togglePayTable) },
      { hotkey: 'S', callback: () => runHotkey('speed', onSpeedChange) },
      {
        hotkey: '-',
        callback: () => runHotkey('bet-down', () => onBetChange(bet - 1)),
        options: { enabled: canBetDown },
      },
      { hotkey: '=', callback: () => runHotkey('bet-up', () => onBetChange(bet + 1)), options: { enabled: canBetUp } },
      { hotkey: 'Enter', callback: () => runHotkey('play', isDealt ? onDraw : onDeal), options: { enabled: canPlay } },
    ],
    { preventDefault: true },
  );

  return (
    <div
      className="bet-controls grid w-[min(1228px,calc(100vw-396px))] min-w-[760px] grid-cols-6 gap-5 justify-self-center max-[1180px]:w-[calc(100vw-32px)] max-[1180px]:min-w-0 max-[1180px]:gap-2.5 max-[760px]:w-full max-[760px]:gap-2"
      aria-label="Game controls"
    >
      <button
        type="button"
        className={buttonClassName}
        data-key-pressed={isControlPressed('pay-table')}
        aria-pressed={isPayTableVisible}
        onClick={togglePayTable}
        onAnimationEnd={() => clearPressedControl('pay-table')}
      >
        <ShortcutButtonContent
          label={isPayTableVisible ? 'HIDE PAYS' : 'SHOW PAYS'}
          shortcut="P"
          disabled={false}
          showShortcut={showKeyboardShortcuts}
        />
      </button>
      <button
        type="button"
        className={buttonClassName}
        disabled
      >
        <ShortcutButtonContent label="OPTIONS" shortcut="O" disabled showShortcut={showKeyboardShortcuts} />
      </button>
      <button
        type="button"
        className={`${buttonClassName} inline-flex items-center justify-center gap-[7px] max-[760px]:gap-[3px]`}
        data-key-pressed={isControlPressed('speed')}
        aria-label={`Speed: ${speed}. Press to change to ${nextSpeed}.`}
        title={`Speed: ${speed}`}
        onClick={onSpeedChange}
        onAnimationEnd={() => clearPressedControl('speed')}
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
        <ShortcutBadge shortcut="S" disabled={false} show={showKeyboardShortcuts} />
      </button>
      <button
        type="button"
        className={buttonClassName}
        data-key-pressed={isControlPressed('bet-down')}
        disabled={!canBetDown}
        onClick={() => onBetChange(bet - 1)}
        onAnimationEnd={() => clearPressedControl('bet-down')}
      >
        {
          <ShortcutButtonContent
            label="BET DOWN"
            shortcut="-"
            disabled={!canBetDown}
            showShortcut={showKeyboardShortcuts}
          />
        }
      </button>
      <button
        type="button"
        className={buttonClassName}
        data-key-pressed={isControlPressed('bet-up')}
        disabled={!canBetUp}
        onClick={() => onBetChange(bet + 1)}
        onAnimationEnd={() => clearPressedControl('bet-up')}
      >
        <ShortcutButtonContent label="BET UP" shortcut="+" disabled={!canBetUp} showShortcut={showKeyboardShortcuts} />
      </button>
      <button
        type="button"
        className={buttonClassName}
        data-key-pressed={isControlPressed('play')}
        disabled={!canPlay}
        onClick={isDealt ? onDraw : onDeal}
        onAnimationEnd={() => clearPressedControl('play')}
      >
        <ShortcutButtonContent
          label={isDealt ? 'DRAW' : 'DEAL'}
          shortcut="Enter"
          disabled={!canPlay}
          showShortcut={showKeyboardShortcuts}
        />
      </button>
    </div>
  );
}
