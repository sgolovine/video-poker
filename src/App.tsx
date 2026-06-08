import { BetControls } from './components/BetControls';
import { CardSlot } from './components/CardSlot';
import { GameMeters } from './components/GameMeters';
import { PayTable } from './components/PayTable';
import { useVideoPoker } from './hooks/useVideoPoker';
import { getCardImage } from './lib/cardAssets';
import { useUserSettingsStore } from './stores/userSettings';
import './App.css';

function App() {
  const speed = useUserSettingsStore((state) => state.speed);
  const cycleSpeed = useUserSettingsStore((state) => state.cycleSpeed);
  const {
    bet,
    activePayTableColumn,
    credits,
    heldIndexes,
    lastResult,
    phase,
    visibleHand,
    canDeal,
    inputLocked,
    changeBet,
    deal,
    draw,
    toggleHold,
  } = useVideoPoker();

  const statusText =
    phase === 'dealt'
      ? 'SELECT CARDS TO HOLD'
      : lastResult
        ? lastResult.payout > 0
          ? `${lastResult.label} PAYS ${lastResult.payout}`
          : 'GAME OVER'
        : 'PRESS DEAL';

  return (
    <main className="machine-shell" aria-label="Jacks or Better video poker">
      <section className="cabinet">
        <PayTable activeColumn={activePayTableColumn} lastRank={lastResult?.rank} />

        <section className="screen" aria-live="polite">
          <div className="message-bar">{statusText}</div>
          <div className="cards" aria-label="Current hand">
            {Array.from({ length: 5 }, (_, index) => {
              const card = visibleHand[index];

              return (
                <CardSlot
                  key={index}
                  card={card}
                  imageUrl={getCardImage(card)}
                  held={heldIndexes.includes(index)}
                  disabled={phase !== 'dealt'}
                  onToggle={() => toggleHold(index)}
                />
              );
            })}
          </div>
        </section>

        <footer className="console">
          <GameMeters credits={credits} bet={bet} payout={lastResult?.payout ?? 0} />
          <BetControls
            bet={bet}
            canDeal={canDeal}
            inputLocked={inputLocked}
            phase={phase}
            speed={speed}
            onBetChange={changeBet}
            onDeal={deal}
            onDraw={draw}
            onSpeedChange={cycleSpeed}
          />
          <div className="game-title">JACKS OR BETTER</div>
        </footer>
      </section>
    </main>
  );
}

export default App;
