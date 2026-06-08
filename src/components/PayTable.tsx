import { HAND_LABELS, HAND_ORDER } from '../data/payTable';
import type { PayTableConfig } from '../engine';

interface PayTableProps {
  readonly activeColumn?: number;
  readonly payTable: PayTableConfig;
}

export function PayTable({ activeColumn, payTable }: PayTableProps) {
  return (
    <section
      className="mt-12 grid w-[min(1228px,calc(100vw-396px))] min-w-[760px] justify-self-center border-2 border-[#a5a831] bg-[#000052] max-[1180px]:mt-7 max-[1180px]:w-[calc(100vw-32px)] max-[1180px]:min-w-0 max-[760px]:mt-3.5 max-[760px]:w-[calc(100vw-16px)] max-[760px]:overflow-x-auto"
      aria-label="Jacks or Better pay table"
    >
      {HAND_ORDER.map((rank) => (
        <div
          key={rank}
          className="grid grid-cols-[minmax(270px,1.9fr)_repeat(5,minmax(132px,1fr))] max-[1180px]:grid-cols-[minmax(190px,1.6fr)_repeat(5,minmax(82px,1fr))] max-[760px]:w-[640px] max-[760px]:grid-cols-[180px_repeat(5,92px)]"
        >
          <span className="flex min-h-[30px] items-center justify-start border-r-2 border-[#a5a831] px-2 py-px text-[19px] leading-none font-bold text-[#ffff2f] [text-shadow:2px_2px_0_#0036a1,0_0_2px_#000] max-[1180px]:text-[15px] max-[760px]:min-h-[25px] max-[760px]:text-[13px]">
            {HAND_LABELS[rank]}
          </span>
          {payTable[rank].map((payout, index) => (
            <span
              key={index}
              className={[
                'flex min-h-[30px] items-center justify-end border-r-2 border-[#a5a831] px-2 py-px text-[19px] leading-none font-bold text-[#ffff2f] [text-shadow:2px_2px_0_#0036a1,0_0_2px_#000] last:border-r-0 max-[1180px]:text-[15px] max-[760px]:min-h-[25px] max-[760px]:text-[13px]',
                index + 1 === activeColumn ? 'bg-[#df000b]' : '',
              ].join(' ')}
            >
              {payout.toFixed(2)}
            </span>
          ))}
        </div>
      ))}
    </section>
  );
}
