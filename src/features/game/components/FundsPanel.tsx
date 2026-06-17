import { useState } from 'react';
import { toast } from 'sonner';
import { smallControlButtonClassName } from './controlButtonStyles';

const quickAmounts = [20, 50, 100, 500] as const;
const customIncrement = 10;

const currencyFormat = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} satisfies Intl.NumberFormatOptions;

interface FundsPanelProps {
  readonly balance: number;
  readonly canAddFunds: boolean;
  readonly onAddFunds: (amount: number) => void;
  readonly onClose: () => void;
}

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, currencyFormat);
}

function formatCredits(value: number): string {
  return `${value.toLocaleString()} credits`;
}

function parseCustomAmount(value: string): number | undefined {
  if (!/^\d+$/.test(value.trim())) {
    return undefined;
  }

  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : undefined;
}

export function FundsPanel({ balance, canAddFunds, onAddFunds, onClose }: FundsPanelProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState(String(customIncrement));
  const parsedCustomAmount = parseCustomAmount(customAmount);
  const canAddCustomFunds = canAddFunds && parsedCustomAmount !== undefined;

  function addFunds(amount: number) {
    if (!canAddFunds) {
      return;
    }

    onAddFunds(amount);
    toast.success('Funds added', {
      description: formatCredits(amount),
    });
  }

  function adjustCustomAmount(step: number) {
    const currentAmount = parsedCustomAmount ?? customIncrement;
    const nextAmount = Math.max(customIncrement, currentAmount + step);
    setCustomAmount(String(nextAmount));
  }

  if (isCustomOpen) {
    return (
      <section
        className="funds-panel mt-12 grid w-[min(520px,calc(100vw-396px))] min-w-[360px] justify-self-center border-2 border-[#a5a831] bg-[#000052] p-4 text-center text-[#ffff2f] max-[1180px]:mt-7 max-[1180px]:w-[min(520px,calc(100vw-32px))] max-[1180px]:min-w-0 max-[760px]:mt-3.5 max-[760px]:w-[calc(100vw-16px)] max-[760px]:p-3"
        aria-label="Custom funds"
      >
        <div className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="text-2xl leading-none font-black [text-shadow:2px_2px_0_#0036a1,0_0_2px_#000] max-[760px]:text-lg">
              CUSTOM FUNDS
            </h2>
            <p className="text-lg leading-none font-bold text-white [text-shadow:2px_2px_1px_#00195c] max-[760px]:text-sm">
              BALANCE {formatCurrency(balance)}
            </p>
          </div>

          <div className="grid grid-cols-[52px_minmax(0,1fr)_52px] gap-3 max-[760px]:grid-cols-[44px_minmax(0,1fr)_44px] max-[760px]:gap-2">
            <button
              type="button"
              className={smallControlButtonClassName}
              disabled={!canAddFunds}
              aria-label="Decrease custom funds"
              onClick={() => adjustCustomAmount(-customIncrement)}
            >
              -
            </button>
            <label className="grid gap-1">
              <span className="sr-only">Custom amount</span>
              <input
                className="h-11 min-w-0 border-2 border-[#a5a831] bg-[#00128f] px-3 text-center text-xl font-black text-white [box-shadow:inset_2px_2px_0_#00093f] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white max-[760px]:h-9 max-[760px]:text-base"
                inputMode="numeric"
                pattern="[0-9]*"
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
              />
            </label>
            <button
              type="button"
              className={smallControlButtonClassName}
              disabled={!canAddFunds}
              aria-label="Increase custom funds"
              onClick={() => adjustCustomAmount(customIncrement)}
            >
              +
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 max-[760px]:gap-2">
            <button
              type="button"
              className={smallControlButtonClassName}
              disabled={!canAddCustomFunds}
              onClick={() => {
                if (parsedCustomAmount !== undefined) {
                  addFunds(parsedCustomAmount);
                }
              }}
            >
              Add Funds
            </button>
            <button type="button" className={smallControlButtonClassName} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="funds-panel mt-12 grid w-[min(760px,calc(100vw-396px))] min-w-[520px] justify-self-center border-2 border-[#a5a831] bg-[#000052] p-4 text-center text-[#ffff2f] max-[1180px]:mt-7 max-[1180px]:w-[min(760px,calc(100vw-32px))] max-[1180px]:min-w-0 max-[760px]:mt-3.5 max-[760px]:w-[calc(100vw-16px)] max-[760px]:p-3"
      aria-label="Add funds"
    >
      <div className="grid gap-4">
        <div className="grid gap-1">
          <h2 className="text-2xl leading-none font-black [text-shadow:2px_2px_0_#0036a1,0_0_2px_#000] max-[760px]:text-lg">
            ADD FUNDS
          </h2>
          <p className="text-lg leading-none font-bold text-white [text-shadow:2px_2px_1px_#00195c] max-[760px]:text-sm">
            BALANCE {formatCurrency(balance)}
          </p>
        </div>

        <div className="grid grid-cols-5 gap-3 max-[760px]:grid-cols-3 max-[760px]:gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              className={smallControlButtonClassName}
              disabled={!canAddFunds}
              onClick={() => addFunds(amount)}
            >
              ${amount}
            </button>
          ))}
          <button type="button" className={smallControlButtonClassName} onClick={() => setIsCustomOpen(true)}>
            Custom
          </button>
        </div>

        <button type="button" className={`${smallControlButtonClassName} justify-self-center px-8`} onClick={onClose}>
          Close
        </button>
      </div>
    </section>
  );
}
