interface GameMetersProps {
  readonly credits: number;
  readonly bet: number;
  readonly payout: number;
}

export function GameMeters({ credits, bet, payout }: GameMetersProps) {
  return (
    <div
      className="grid w-[min(1214px,calc(100vw-410px))] min-w-[760px] grid-cols-3 items-end justify-self-center max-[1180px]:w-[calc(100vw-32px)] max-[1180px]:min-w-0 max-[760px]:w-full"
      aria-label="Credit meters"
    >
      <Meter align="start" label="WIN" value={payout} />
      <Meter align="center" label="BET" value={bet} />
      <Meter align="end" label="BALANCE" value={credits} />
    </div>
  );
}

function Meter({ align, label, value }: { readonly align: 'start' | 'center' | 'end'; readonly label: string; readonly value: number }) {
  const alignClassName =
    align === 'start'
      ? 'justify-self-start text-left'
      : align === 'center'
        ? 'justify-self-center text-center text-white [text-shadow:2px_2px_0_#0036a1,0_0_2px_#000]'
        : 'justify-self-end text-right';

  return (
    <div
      className={[
        'grid gap-0 text-[#ff1d14] [text-shadow:-2px_-2px_0_#ffff2f,2px_-2px_0_#ffff2f,-2px_2px_0_#ffff2f,2px_2px_0_#ffff2f,3px_3px_0_#6d3600]',
        alignClassName,
      ].join(' ')}
    >
      <span className="block text-[28px] leading-[0.95] font-bold max-[760px]:text-base">{label}</span>
      <strong className="block text-[31px] leading-[0.95] font-bold max-[760px]:text-lg">{value.toFixed(2)}</strong>
    </div>
  );
}
