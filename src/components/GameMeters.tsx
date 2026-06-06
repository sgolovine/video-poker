interface GameMetersProps {
  readonly credits: number;
  readonly bet: number;
  readonly payout: number;
}

export function GameMeters({ credits, bet, payout }: GameMetersProps) {
  return (
    <div className="meters" aria-label="Credit meters">
      <Meter label="WIN" value={payout} />
      <Meter label="BET" value={bet} />
      <Meter label="BALANCE" value={credits} />
    </div>
  );
}

function Meter({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="meter">
      <span>{label}</span>
      <strong>{value.toFixed(2)}</strong>
    </div>
  );
}
