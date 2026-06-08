import NumberFlow, { continuous } from '@number-flow/react';

const meterNumberFormat = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} satisfies Intl.NumberFormatOptions;

const meterTransformTiming = {
  duration: 650,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
} satisfies EffectTiming;

const meterSpinTiming = {
  duration: 700,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} satisfies EffectTiming;

const meterPlugins = [continuous];

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
        ? 'justify-self-center text-center text-white'
        : 'justify-self-end text-right';

  return (
    <div
      className={[
        'grid gap-0 text-white',
        alignClassName,
      ].join(' ')}
    >
      <span className="block text-[28px] leading-[0.95] font-bold max-[760px]:text-base">{label}</span>
      <strong className="block text-[31px] leading-[0.95] font-bold max-[760px]:text-lg">
        <NumberFlow
          className="block tabular-nums"
          value={value}
          format={meterNumberFormat}
          plugins={meterPlugins}
          transformTiming={meterTransformTiming}
          spinTiming={meterSpinTiming}
          aria-label={value.toFixed(2)}
          willChange
        />
      </strong>
    </div>
  );
}
