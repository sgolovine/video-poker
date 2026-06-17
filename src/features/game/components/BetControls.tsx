import { useHotkeys } from '@tanstack/react-hotkeys';
import { useState } from 'react';
import { Kbd } from '../../../components/ui/kbd';
import type { GamePhase } from '../../../engine/types';
import { useLayoutStore } from '../../../stores/layout';
import { GAME_SPEEDS, type GameSpeed } from '../../../stores/userSettings';
import { controlButtonClassName } from './controlButtonStyles';

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

type PressedControl = 'pay-table' | 'funds' | 'speed' | 'bet-down' | 'bet-up' | 'play';
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
  const isFundsPanelVisible = useLayoutStore((state) => state.isFundsPanelVisible);
  const toggleFundsPanel = useLayoutStore((state) => state.toggleFundsPanel);
  const togglePayTable = useLayoutStore((state) => state.togglePayTable);
  const isDealt = phase === 'dealt';
  const activeChevronCount = GAME_SPEEDS.indexOf(speed) + 1;
  const nextSpeed = GAME_SPEEDS[activeChevronCount % GAME_SPEEDS.length];
  const canBetDown = !inputLocked && !isDealt && bet > 1;
  const canBetUp = !inputLocked && !isDealt && bet < 5;
  const canPlay = isDealt ? !inputLocked : canDeal;
  const [pressedControl, setPressedControl] = useState<PressedControlPulse>();

  const buttonClassName = controlButtonClassName;

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
      { hotkey: 'F', callback: () => runHotkey('funds', toggleFundsPanel) },
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
      className="bet-controls grid w-[min(1228px,calc(100vw-396px))] min-w-[760px] grid-cols-6 gap-4 justify-self-center max-[1180px]:w-[calc(100vw-32px)] max-[1180px]:min-w-0 max-[1180px]:gap-2.5 max-[760px]:w-full max-[760px]:gap-2"
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
        data-key-pressed={isControlPressed('funds')}
        aria-pressed={isFundsPanelVisible}
        onClick={toggleFundsPanel}
        onAnimationEnd={() => clearPressedControl('funds')}
      >
        <ShortcutButtonContent label="FUNDS" shortcut="F" disabled={false} showShortcut={showKeyboardShortcuts} />
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
