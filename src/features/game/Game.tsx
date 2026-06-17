import { type UseHotkeyDefinition, useHotkeys } from '@tanstack/react-hotkeys';
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getGameLabel } from '../../data/payTable';
import { getCardImage } from '../../lib/cardAssets';
import { useLayoutStore } from '../../stores/layout';
import { useUserSettingsStore } from '../../stores/userSettings';
import { BetControls } from './components/BetControls';
import { CardSlot } from './components/CardSlot';
import { GameMeters } from './components/GameMeters';
import { PayTable } from './components/PayTable';
import { useVideoPoker } from './hooks/useVideoPoker';

export function Game() {
  const isPayTableVisible = useLayoutStore((state) => state.isPayTableVisible);
  const openSettingsDialog = useLayoutStore((state) => state.setSettingsDialogOpen);
  const speed = useUserSettingsStore((state) => state.speed);
  const showKeyboardShortcuts = useUserSettingsStore((state) => state.showKeyboardShortcuts);
  const cardBackId = useUserSettingsStore((state) => state.cardBackId);
  const selectedVariant = useUserSettingsStore((state) => state.selectedVariant);
  const pays = useUserSettingsStore((state) => state.payTablesByVariant[state.selectedVariant]);
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
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [isArrowNavigationActive, setIsArrowNavigationActive] = useState(false);
  const gameLabel = getGameLabel(selectedVariant);

  const statusText =
    phase === 'dealt'
      ? 'SELECT CARDS TO HOLD'
      : phase === 'complete' && !inputLocked
        ? `PLAY ${bet} CREDITS`
        : 'PRESS DEAL';
  const handResultBannerText =
    phase === 'complete' && !inputLocked ? (lastResult?.payout ? lastResult.label : 'GAME OVER') : undefined;
  const canUseCardShortcuts = phase === 'dealt' && !inputLocked;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        setIsArrowNavigationActive(true);
      }
    }

    function handleMouseMove() {
      setIsArrowNavigationActive(false);
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  function moveSelectedCard(step: number) {
    if (!canUseCardShortcuts) {
      return;
    }
    setSelectedCardIndex((current) => (current + step + 5) % 5);
  }

  function holdSelectedCard() {
    toggleHold(selectedCardIndex);
  }

  function startDeal() {
    setSelectedCardIndex(0);
    setIsArrowNavigationActive(false);
    deal();
  }

  useHotkeys(
    [
      { hotkey: 'ArrowLeft', callback: () => moveSelectedCard(-1), options: { enabled: canUseCardShortcuts } },
      { hotkey: 'ArrowUp', callback: () => moveSelectedCard(-1), options: { enabled: canUseCardShortcuts } },
      { hotkey: 'ArrowRight', callback: () => moveSelectedCard(1), options: { enabled: canUseCardShortcuts } },
      { hotkey: 'ArrowDown', callback: () => moveSelectedCard(1), options: { enabled: canUseCardShortcuts } },
      { hotkey: 'Space', callback: holdSelectedCard, options: { enabled: canUseCardShortcuts } },
      ...([1, 2, 3, 4, 5] as const).map(
        (cardNumber, index): UseHotkeyDefinition => ({
          hotkey: `${cardNumber}`,
          callback: () => {
            setSelectedCardIndex(index);
            toggleHold(index);
          },
          options: { enabled: canUseCardShortcuts },
        }),
      ),
    ],
    { preventDefault: true },
  );

  return (
    <main className="grid min-h-svh bg-[#000099] text-[#ffff2f]" aria-label={`${gameLabel} video poker`}>
      <section className="video-shell grid min-h-svh w-full grid-rows-[auto_1fr_auto] overflow-hidden bg-[#000099] max-[760px]:overflow-x-hidden">
        <button
          type="button"
          className="fixed top-4 right-4 z-30 grid size-11 place-items-center rounded-full border border-white/35 bg-transparent text-white transition hover:border-white/70 hover:text-[#ffff2f] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white max-[760px]:top-2 max-[760px]:right-2 max-[760px]:size-10"
          aria-label="Open settings"
          title="Settings"
          onClick={() => openSettingsDialog(true)}
        >
          <Settings className="size-6" aria-hidden="true" strokeWidth={2.5} />
        </button>

        {isPayTableVisible ? (
          <PayTable variant={selectedVariant} activeColumn={activePayTableColumn} payTable={pays} />
        ) : null}

        <section className="play-area grid content-start pt-[17px] max-[760px]:pt-3" aria-live="polite">
          <div className="status-text mb-7 grid min-h-[42px] place-items-center text-center text-[28px] leading-none font-bold text-white max-[760px]:mb-4 max-[760px]:min-h-[34px] max-[760px]:text-xl">
            {statusText}
          </div>
          <div className="relative grid w-[min(1145px,calc(100vw-440px))] min-w-[700px] justify-self-center max-[1180px]:w-[calc(100vw-32px)] max-[1180px]:min-w-0 max-[760px]:w-[calc(100vw-16px)]">
            <div
              className="card-grid grid grid-cols-5 items-end gap-6 max-[1180px]:gap-3.5 max-[760px]:gap-[7px]"
              aria-label="Current hand"
            >
              {Array.from({ length: 5 }, (_, index) => {
                const card = visibleHand[index];

                return (
                  <CardSlot
                    key={index}
                    card={card}
                    imageUrl={getCardImage(card, cardBackId)}
                    held={heldIndexes.includes(index)}
                    selected={isArrowNavigationActive && index === selectedCardIndex}
                    showMouseOutline={!isArrowNavigationActive}
                    showKeyboardShortcut={showKeyboardShortcuts}
                    shortcut={String(index + 1)}
                    disabled={phase !== 'dealt'}
                    onToggle={() => toggleHold(index)}
                  />
                );
              })}
            </div>
            {handResultBannerText ? (
              <div className="play-credits-banner pointer-events-none absolute top-[58%] left-1/2 z-10 w-[min(58rem,84%)] -translate-x-1/2 -translate-y-1/2 border-4 border-[#ffff2f] bg-[#00128f] px-4 py-2 text-center text-[clamp(1.35rem,4.5vw,3.75rem)] leading-none font-bold text-[#ff1d14] shadow-[0_0_0_3px_#000,0_6px_0_#000] [text-shadow:-2px_-2px_0_#ffff2f,2px_-2px_0_#ffff2f,-2px_2px_0_#ffff2f,2px_2px_0_#ffff2f,4px_4px_0_#6d3600] max-[760px]:border-2 max-[760px]:px-2 max-[760px]:py-1">
                {handResultBannerText}
              </div>
            ) : null}
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
            showKeyboardShortcuts={showKeyboardShortcuts}
            onBetChange={changeBet}
            onDeal={startDeal}
            onDraw={draw}
            onSpeedChange={cycleSpeed}
          />
          <div className="w-[min(1228px,calc(100vw-396px))] min-w-[760px] justify-self-center text-right text-lg leading-none font-bold text-white [text-shadow:2px_2px_1px_#00195c] max-[1180px]:w-[calc(100vw-32px)] max-[1180px]:min-w-0 max-[760px]:w-full max-[760px]:text-sm">
            {gameLabel}
          </div>
        </footer>
      </section>
    </main>
  );
}
