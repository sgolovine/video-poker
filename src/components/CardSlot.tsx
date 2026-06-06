import type { Card } from '../../engine';

interface CardSlotProps {
  readonly card?: Card;
  readonly imageUrl: string;
  readonly held: boolean;
  readonly disabled: boolean;
  readonly onToggle: () => void;
}

export function CardSlot({ card, imageUrl, held, disabled, onToggle }: CardSlotProps) {
  const label = card ? `${card.rank} of ${card.suit}` : 'Card back';

  return (
    <button type="button" className={held ? 'card-slot is-held' : 'card-slot'} disabled={disabled} aria-pressed={held} onClick={onToggle}>
      <img src={imageUrl} alt={label} draggable="false" />
    </button>
  );
}
