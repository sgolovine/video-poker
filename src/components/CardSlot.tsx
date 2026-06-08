import type { Card } from '../engine';
import { Kbd } from './ui/kbd';

interface CardSlotProps {
  readonly card?: Card;
  readonly imageUrl: string;
  readonly held: boolean;
  readonly selected: boolean;
  readonly shortcut: string;
  readonly disabled: boolean;
  readonly onToggle: () => void;
}

export function CardSlot({ card, imageUrl, held, selected, shortcut, disabled, onToggle }: CardSlotProps) {
  const label = card ? `${card.rank} of ${card.suit}` : 'Card back';
  const imageClassName = [
    'aspect-[169/244] w-full rounded-[11px] object-contain [filter:drop-shadow(2px_2px_0_#000)_drop-shadow(0_3px_0_#000)] max-[760px]:rounded-md',
    held
      ? '[filter:drop-shadow(0_0_0_#ffff2f)_drop-shadow(0_0_8px_#ffff2f)_drop-shadow(2px_2px_0_#000)_drop-shadow(0_3px_0_#000)]'
      : '',
    selected && !disabled ? 'ring-4 ring-[#ffff2f] ring-offset-4 ring-offset-[#000099] max-[760px]:ring-2 max-[760px]:ring-offset-2' : '',
  ].join(' ');

  return (
    <button
      type="button"
      className="card-slot group grid grid-rows-[32px_auto] gap-1.5 border-0 bg-transparent p-0 text-inherit outline-offset-8 hover:enabled:[&:not([aria-pressed='true'])_img]:ring-4 hover:enabled:[&:not([aria-pressed='true'])_img]:ring-[#ffff2f] hover:enabled:[&:not([aria-pressed='true'])_img]:ring-offset-4 hover:enabled:[&:not([aria-pressed='true'])_img]:ring-offset-[#000099] focus-visible:outline-4 focus-visible:outline-[#ffff2f] disabled:cursor-default enabled:cursor-pointer max-[760px]:hover:enabled:[&:not([aria-pressed='true'])_img]:ring-2 max-[760px]:hover:enabled:[&:not([aria-pressed='true'])_img]:ring-offset-2"
      disabled={disabled}
      aria-pressed={held}
      aria-current={selected ? 'true' : undefined}
      onClick={onToggle}
    >
      <span className="held-label grid min-h-8 grid-cols-[1fr_auto_1fr] items-center gap-1 text-[28px] leading-none font-bold text-white [text-shadow:2px_2px_0_#0036a1,0_0_2px_#000]">
        <span aria-hidden="true" />
        <span aria-hidden="true">{held ? 'HELD' : ''}</span>
        <Kbd className="justify-self-end border border-[#cab726] bg-[#ffe63d] font-[Arial,Helvetica,sans-serif] text-[11px] font-black text-[#070707] [text-shadow:none] max-[760px]:h-4 max-[760px]:min-w-4 max-[760px]:px-0.5 max-[760px]:text-[9px]">
          {shortcut}
        </Kbd>
      </span>
      <img className={imageClassName} src={imageUrl} alt={label} draggable="false" />
    </button>
  );
}
