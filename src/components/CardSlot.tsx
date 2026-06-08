import type { Card } from '../engine';

interface CardSlotProps {
  readonly card?: Card;
  readonly imageUrl: string;
  readonly held: boolean;
  readonly disabled: boolean;
  readonly onToggle: () => void;
}

export function CardSlot({ card, imageUrl, held, disabled, onToggle }: CardSlotProps) {
  const label = card ? `${card.rank} of ${card.suit}` : 'Card back';
  const imageClassName = [
    'aspect-[169/244] w-full rounded-[11px] object-contain [filter:drop-shadow(2px_2px_0_#000)_drop-shadow(0_3px_0_#000)] max-[760px]:rounded-md',
    held
      ? '[filter:drop-shadow(0_0_0_#ffff2f)_drop-shadow(0_0_8px_#ffff2f)_drop-shadow(2px_2px_0_#000)_drop-shadow(0_3px_0_#000)]'
      : '',
  ].join(' ');

  return (
    <button
      type="button"
      className="card-slot group grid grid-rows-[32px_auto] gap-1.5 border-0 bg-transparent p-0 text-inherit outline-offset-8 hover:enabled:[&:not([aria-pressed='true'])_img]:ring-2 hover:enabled:[&:not([aria-pressed='true'])_img]:ring-red-500 focus-visible:outline-4 focus-visible:outline-[#ffff2f] disabled:cursor-default enabled:cursor-pointer"
      disabled={disabled}
      aria-pressed={held}
      onClick={onToggle}
    >
      <span
        className="held-label grid min-h-8 place-items-center text-[28px] leading-none font-bold text-white [text-shadow:2px_2px_0_#0036a1,0_0_2px_#000]"
        aria-hidden="true"
      >
        {held ? 'HELD' : ''}
      </span>
      <img className={imageClassName} src={imageUrl} alt={label} draggable="false" />
    </button>
  );
}
