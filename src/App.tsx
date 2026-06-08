import { BetControls } from './components/BetControls';
import { CardSlot } from './components/CardSlot';
import { GameMeters } from './components/GameMeters';
import { PayTable } from './components/PayTable';
import { SettingsDialog } from './components/SettingsDialog';
import { useVideoPoker } from './hooks/useVideoPoker';
import { getCardImage } from './lib/cardAssets';
import { useLayoutStore } from './stores/layout';
import { useUserSettingsStore } from './stores/userSettings';

function App() {
  const isPayTableVisible = useLayoutStore((state) => state.isPayTableVisible);
  const speed = useUserSettingsStore((state) => state.speed);
  const pays = useUserSettingsStore((state) => state.pays);
  const cycleSpeed = useUserSettingsStore((state) => state.cycleSpeed);
  const setPays = useUserSettingsStore((state) => state.setPays);
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
    replaceMachine,
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
    <main className="grid min-h-svh bg-[#000099] text-[#ffff2f]" aria-label="Jacks or Better video poker">
      <section
        className="video-shell grid min-h-svh w-full grid-rows-[auto_1fr_auto] overflow-hidden bg-[#000099] max-[760px]:grid-rows-[auto_auto_auto] max-[760px]:overflow-x-hidden"
        data-pay-table={isPayTableVisible ? 'visible' : 'hidden'}
      >
        {isPayTableVisible ? <PayTable activeColumn={activePayTableColumn} payTable={pays} /> : null}

        <section className="play-area grid content-start pt-[17px] max-[760px]:pt-3" aria-live="polite">
          <div className="status-text mb-7 grid min-h-[42px] place-items-center text-center text-[28px] leading-none font-bold text-[#ff1d14] [text-shadow:-2px_-2px_0_#ffff2f,2px_-2px_0_#ffff2f,-2px_2px_0_#ffff2f,2px_2px_0_#ffff2f,3px_3px_0_#6d3600] max-[760px]:mb-4 max-[760px]:min-h-[34px] max-[760px]:text-xl">
            {statusText}
          </div>
          <div
            className="card-grid grid w-[min(1145px,calc(100vw-440px))] min-w-[700px] grid-cols-5 items-end gap-6 justify-self-center max-[1180px]:w-[calc(100vw-32px)] max-[1180px]:min-w-0 max-[1180px]:gap-3.5 max-[760px]:w-[calc(100vw-16px)] max-[760px]:gap-[7px]"
            aria-label="Current hand"
          >
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

        <footer className="controls-footer grid grid-rows-[auto_auto_auto] gap-[26px] px-0 pt-[26px] pb-11 max-[760px]:gap-4 max-[760px]:px-2 max-[760px]:pt-5 max-[760px]:pb-6">
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
            onOptionsRender={(className) => (
              <SettingsDialog
                triggerClassName={className}
                onApplySettings={({ balance, pays: nextPays }) => {
                  setPays(nextPays);
                  replaceMachine(balance, nextPays);
                }}
              />
            )}
            onSpeedChange={cycleSpeed}
          />
          <div className="w-[min(1228px,calc(100vw-396px))] min-w-[760px] justify-self-center text-right font-[Arial,Helvetica,sans-serif] text-lg leading-none font-bold text-white [text-shadow:2px_2px_1px_#00195c] max-[1180px]:w-[calc(100vw-32px)] max-[1180px]:min-w-0 max-[760px]:w-full max-[760px]:text-sm">
            JACKS OR BETTER
          </div>
        </footer>
      </section>
    </main>
  );
}

export default App;
