import { HAND_LABELS, HAND_ORDER } from '../data/payTable';
import { PAY_TABLE, type HandRank } from '../../engine';

interface PayTableProps {
  readonly activeColumn?: number;
  readonly lastRank?: HandRank;
}

export function PayTable({ activeColumn, lastRank }: PayTableProps) {
  return (
    <section className="pay-table" aria-label="Jacks or Better pay table">
      {HAND_ORDER.map((rank) => (
        <div key={rank} className={rank === lastRank ? 'pay-row is-hit' : 'pay-row'}>
          <span>{HAND_LABELS[rank]}</span>
          {PAY_TABLE[rank].map((payout, index) => (
            <span key={index} className={index + 1 === activeColumn ? 'is-active' : undefined}>
              {payout.toFixed(2)}
            </span>
          ))}
        </div>
      ))}
    </section>
  );
}
