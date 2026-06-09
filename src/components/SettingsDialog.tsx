import { useHotkey } from '@tanstack/react-hotkeys';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HAND_LABELS, getPayTableRanks } from '../data/payTable';
import {
  GAME_DEFINITIONS,
  GAME_VARIANTS,
  clonePayTable,
  getDefaultPayTable,
  type CreditAmount,
  type GameVariant,
  type HandRank,
  type PayTableConfig,
  type VariantPayTables,
} from '../engine';
import {
  DEFAULT_BALANCE,
  DEFAULT_PAY_TABLES,
  DEFAULT_VARIANT,
  getDefaultShowKeyboardShortcuts,
  useUserSettingsStore,
} from '../stores/userSettings';
import { Button } from './ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface SettingsDialogProps {
  readonly triggerClassName: string;
  readonly triggerContent?: React.ReactNode;
  readonly onApplySettings: (settings: {
    readonly balance: CreditAmount;
    readonly variant: GameVariant;
    readonly pays: PayTableConfig;
  }) => void;
}

const KEY_PRESS_EFFECT_MS = 120;

type EditablePayTable = Partial<Record<HandRank, [string, string, string, string, string]>>;

function stringifyPayTable(variant: GameVariant, payTable: PayTableConfig): EditablePayTable {
  const nextPayTable: EditablePayTable = {};

  for (const rank of getPayTableRanks(variant)) {
    const row = payTable[rank];
    if (row) {
      nextPayTable[rank] = row.map((payout) => String(payout)) as [string, string, string, string, string];
    }
  }

  return nextPayTable;
}

function parseSafeInteger(value: string): number | undefined {
  if (!/^\d+$/.test(value.trim())) {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) ? parsedValue : undefined;
}

function parsePayTable(variant: GameVariant, payTable: EditablePayTable): PayTableConfig | undefined {
  const nextPayTable: Partial<Record<HandRank, [number, number, number, number, number]>> = {};

  for (const rank of getPayTableRanks(variant)) {
    const editableRow = payTable[rank];
    if (!editableRow) {
      return undefined;
    }
    const row = editableRow.map(parseSafeInteger);
    if (row.some((value) => value === undefined)) {
      return undefined;
    }

    nextPayTable[rank] = row as [number, number, number, number, number];
  }

  return clonePayTable(variant, nextPayTable);
}

function payTableForVariant(payTablesByVariant: VariantPayTables, variant: GameVariant): PayTableConfig {
  return payTablesByVariant[variant] ?? getDefaultPayTable(variant);
}

export function SettingsDialog({ triggerClassName, triggerContent, onApplySettings }: SettingsDialogProps) {
  const balance = useUserSettingsStore((state) => state.balance);
  const selectedVariant = useUserSettingsStore((state) => state.selectedVariant);
  const payTablesByVariant = useUserSettingsStore((state) => state.payTablesByVariant);
  const showKeyboardShortcuts = useUserSettingsStore((state) => state.showKeyboardShortcuts);
  const setShowKeyboardShortcuts = useUserSettingsStore((state) => state.setShowKeyboardShortcuts);
  const [open, setOpen] = useState(false);
  const [variantInput, setVariantInput] = useState<GameVariant>(selectedVariant);
  const [balanceInput, setBalanceInput] = useState(String(balance));
  const [payTableInput, setPayTableInput] = useState<EditablePayTable>(() =>
    stringifyPayTable(selectedVariant, payTableForVariant(payTablesByVariant, selectedVariant)),
  );
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration>();
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isTriggerKeyPressed, setIsTriggerKeyPressed] = useState(false);
  const triggerKeyPressedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reloadOnControllerChange = useRef(false);

  const parsedBalance = parseSafeInteger(balanceInput);
  const parsedPayTable = useMemo(() => parsePayTable(variantInput, payTableInput), [payTableInput, variantInput]);
  const canApplyBalance = parsedBalance !== undefined;
  const canApplyPayTable = parsedPayTable !== undefined;
  const visibleRanks = getPayTableRanks(variantInput).filter((rank) => rank !== 'nothing');

  useHotkey(
    'O',
    () => {
      setIsTriggerKeyPressed(true);

      if (triggerKeyPressedTimer.current) {
        clearTimeout(triggerKeyPressedTimer.current);
      }

      triggerKeyPressedTimer.current = setTimeout(() => {
        setIsTriggerKeyPressed(false);
      }, KEY_PRESS_EFFECT_MS);

      setOpen(true);
    },
    { enabled: !open, preventDefault: true },
  );

  useEffect(() => {
    return () => {
      if (triggerKeyPressedTimer.current) {
        clearTimeout(triggerKeyPressedTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
      return;
    }

    function watchRegistration(registration: ServiceWorkerRegistration) {
      setServiceWorkerRegistration(registration);

      if (registration.active) {
        setOfflineReady(true);
      }

      if (registration.waiting && navigator.serviceWorker.controller) {
        setNeedRefresh(true);
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state !== 'installed') {
            return;
          }

          if (navigator.serviceWorker.controller) {
            setNeedRefresh(true);
            setUpdateStatus('');
          } else {
            setOfflineReady(true);
          }
        });
      });
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then(watchRegistration)
      .catch(() => setUpdateStatus('Offline support could not be enabled.'));

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadOnControllerChange.current) {
        window.location.reload();
      }
    });
  }, []);

  function applyVariant(nextVariant: GameVariant) {
    const nextPays = payTableForVariant(payTablesByVariant, nextVariant);
    setVariantInput(nextVariant);
    setPayTableInput(stringifyPayTable(nextVariant, nextPays));
    onApplySettings({ balance, variant: nextVariant, pays: nextPays });
  }

  function applyBalance() {
    if (parsedBalance === undefined) {
      return;
    }

    onApplySettings({
      balance: parsedBalance,
      variant: selectedVariant,
      pays: payTableForVariant(payTablesByVariant, selectedVariant),
    });
  }

  function applyPayTable() {
    if (!parsedPayTable) {
      return;
    }

    onApplySettings({ balance, variant: variantInput, pays: parsedPayTable });
  }

  function resetPayTable() {
    const defaultPayTable = getDefaultPayTable(variantInput);
    setPayTableInput(stringifyPayTable(variantInput, defaultPayTable));
    onApplySettings({ balance, variant: variantInput, pays: defaultPayTable });
  }

  function wipeLocalData() {
    localStorage.clear();
    setVariantInput(DEFAULT_VARIANT);
    setBalanceInput(String(DEFAULT_BALANCE));
    setPayTableInput(stringifyPayTable(DEFAULT_VARIANT, DEFAULT_PAY_TABLES[DEFAULT_VARIANT]));
    setShowKeyboardShortcuts(getDefaultShowKeyboardShortcuts());
    onApplySettings({ balance: DEFAULT_BALANCE, variant: DEFAULT_VARIANT, pays: DEFAULT_PAY_TABLES[DEFAULT_VARIANT] });
  }

  async function checkForUpdates() {
    setIsCheckingForUpdate(true);
    setUpdateStatus('');
    setOfflineReady(false);

    try {
      if (!('serviceWorker' in navigator)) {
        setUpdateStatus('Updates are not available in this browser.');
        return;
      }

      const registration = serviceWorkerRegistration ?? (await navigator.serviceWorker.getRegistration());
      if (!registration) {
        setUpdateStatus('Offline support is still starting. Try again in a moment.');
        return;
      }

      await registration.update();
      setUpdateStatus('No update found.');
    } catch {
      setUpdateStatus('Could not check for updates.');
    } finally {
      setIsCheckingForUpdate(false);
    }
  }

  function installUpdate() {
    const waitingWorker = serviceWorkerRegistration?.waiting;
    if (!waitingWorker) {
      setUpdateStatus('Update is no longer waiting. Check again.');
      setNeedRefresh(false);
      return;
    }

    reloadOnControllerChange.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }

  const pwaStatus = needRefresh ? 'Update ready.' : offlineReady ? 'Offline ready.' : updateStatus;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setVariantInput(selectedVariant);
          setBalanceInput(String(balance));
          setPayTableInput(stringifyPayTable(selectedVariant, payTableForVariant(payTablesByVariant, selectedVariant)));
        }

        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className={triggerClassName} data-key-pressed={isTriggerKeyPressed}>
          {triggerContent ?? 'OPTIONS'}
        </button>
      </DialogTrigger>
      <DialogContent className="settings-dialog border-[var(--settings-border)] bg-[var(--settings-panel)] p-0 text-white shadow-[0_0_0_4px_var(--settings-hover-blue),0_16px_60px_rgba(0,0,0,0.65)]">
        <div className="grid max-h-[min(90svh,760px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <DialogHeader className="border-b border-[var(--settings-border)] px-6 py-5 text-left">
            <DialogTitle className="text-2xl text-[var(--settings-accent)] [text-shadow:2px_2px_0_var(--settings-hover-blue)]">
              SETTINGS
            </DialogTitle>
            <DialogDescription className="text-[var(--settings-secondary-text)]">
              Updates apply to the current machine and are saved in this browser.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 overflow-y-auto px-6 py-5">
            <section className="grid gap-3" aria-labelledby="game-settings-title">
              <div className="grid gap-1">
                <h2
                  id="game-settings-title"
                  className="text-base leading-none font-black text-[var(--settings-accent)]"
                >
                  Game
                </h2>
                <p className="text-sm text-[var(--settings-secondary-text)]">Choose the active video poker machine.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {GAME_VARIANTS.map((variant) => (
                  <Button
                    key={variant}
                    type="button"
                    variant={variant === selectedVariant ? 'default' : 'outline'}
                    aria-pressed={variant === selectedVariant}
                    onClick={() => applyVariant(variant)}
                    className={
                      variant === selectedVariant
                        ? 'bg-[var(--settings-button)] font-black text-[var(--settings-button-text)] hover:bg-[var(--settings-button-hover)]'
                        : 'border-[var(--settings-border)] bg-transparent font-black text-[var(--settings-accent)] hover:bg-[var(--settings-hover-blue)] hover:text-[var(--settings-accent)]'
                    }
                  >
                    {GAME_DEFINITIONS[variant].label}
                  </Button>
                ))}
              </div>
            </section>

            <section className="grid gap-3" aria-labelledby="balance-settings-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="grid gap-1">
                  <h2
                    id="balance-settings-title"
                    className="text-base leading-none font-black text-[var(--settings-accent)]"
                  >
                    Bank Balance
                  </h2>
                  <p className="text-sm text-[var(--settings-secondary-text)]">
                    Set the available credits on the meter.
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={!canApplyBalance}
                  onClick={applyBalance}
                  className="bg-[var(--settings-button)] font-black text-[var(--settings-button-text)] hover:bg-[var(--settings-button-hover)]"
                >
                  Update Balance
                </Button>
              </div>
              <div className="grid max-w-xs gap-2">
                <Label htmlFor="settings-balance" className="text-[var(--settings-accent)]">
                  Balance
                </Label>
                <Input
                  id="settings-balance"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={balanceInput}
                  onChange={(event) => setBalanceInput(event.target.value)}
                  className="border-[var(--settings-border)] bg-[var(--settings-table)] text-white"
                  aria-invalid={!canApplyBalance}
                />
              </div>
            </section>

            <section className="grid gap-3" aria-labelledby="paytable-settings-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="grid gap-1">
                  <h2
                    id="paytable-settings-title"
                    className="text-base leading-none font-black text-[var(--settings-accent)]"
                  >
                    Paytables
                  </h2>
                  <p className="text-sm text-[var(--settings-secondary-text)]">
                    Edit payouts for one through five credits.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetPayTable}
                    className="border-[var(--settings-border)] bg-transparent font-black text-[var(--settings-accent)] hover:bg-[var(--settings-hover-blue)] hover:text-[var(--settings-accent)]"
                  >
                    Reset Paytables
                  </Button>
                  <Button
                    type="button"
                    disabled={!canApplyPayTable}
                    onClick={applyPayTable}
                    className="bg-[var(--settings-button)] font-black text-[var(--settings-button-text)] hover:bg-[var(--settings-button-hover)]"
                  >
                    Update Paytables
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto border border-[var(--settings-border)]">
                <div className="grid min-w-[650px] grid-cols-[minmax(180px,1.4fr)_repeat(5,minmax(72px,1fr))] bg-[var(--settings-table)] text-sm">
                  <div className="border-r border-b border-[var(--settings-border)] px-2 py-2 font-black text-[var(--settings-accent)]">
                    Hand
                  </div>
                  {[1, 2, 3, 4, 5].map((bet) => (
                    <div
                      key={bet}
                      className="border-r border-b border-[var(--settings-border)] px-2 py-2 text-right font-black text-[var(--settings-accent)] last:border-r-0"
                    >
                      {bet}
                    </div>
                  ))}
                  {visibleRanks.map((rank) => (
                    <PayTableRow
                      key={rank}
                      rank={rank}
                      row={payTableInput[rank] ?? ['0', '0', '0', '0', '0']}
                      onChange={(betIndex, value) => {
                        setPayTableInput((current) => ({
                          ...current,
                          [rank]: (current[rank] ?? ['0', '0', '0', '0', '0']).map((payout, index) =>
                            index === betIndex ? value : payout,
                          ) as [string, string, string, string, string],
                        }));
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section
              className="grid gap-3 border-t border-[var(--settings-border)] pt-5"
              aria-labelledby="storage-settings-title"
            >
              <div className="grid gap-1">
                <h2
                  id="storage-settings-title"
                  className="text-base leading-none font-black text-[var(--settings-accent)]"
                >
                  Local Storage
                </h2>
                <p className="text-sm text-[var(--settings-secondary-text)]">
                  Clear saved balance, speed, paytables, and any other local data for this origin.
                </p>
              </div>
              <Button type="button" variant="destructive" onClick={wipeLocalData} className="w-fit font-black">
                Wipe Local Data
              </Button>
            </section>

            <section
              className="grid gap-3 border-t border-[var(--settings-border)] pt-5"
              aria-labelledby="display-settings-title"
            >
              <div className="grid gap-1">
                <h2
                  id="display-settings-title"
                  className="text-base leading-none font-black text-[var(--settings-accent)]"
                >
                  Display
                </h2>
                <p className="text-sm text-[var(--settings-secondary-text)]">Control on-screen game hints.</p>
              </div>
              <label className="flex w-fit items-center gap-3 font-black text-[var(--settings-accent)]">
                <input
                  type="checkbox"
                  checked={showKeyboardShortcuts}
                  onChange={(event) => setShowKeyboardShortcuts(event.target.checked)}
                  className="h-5 w-5 accent-[var(--settings-button)]"
                />
                Show Keyboard Shortcuts
              </label>
            </section>

            <section
              className="grid gap-3 border-t border-[var(--settings-border)] pt-5"
              aria-labelledby="app-settings-title"
            >
              <div className="grid gap-1">
                <h2 id="app-settings-title" className="text-base leading-none font-black text-[var(--settings-accent)]">
                  App
                </h2>
                <p className="text-sm text-[var(--settings-secondary-text)]">Version {__APP_VERSION__}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {needRefresh ? (
                  <Button
                    type="button"
                    onClick={installUpdate}
                    className="bg-[var(--settings-button)] font-black text-[var(--settings-button-text)] hover:bg-[var(--settings-button-hover)]"
                  >
                    Install Update
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isCheckingForUpdate}
                    onClick={checkForUpdates}
                    className="bg-[var(--settings-button)] font-black text-[var(--settings-button-text)] hover:bg-[var(--settings-button-hover)]"
                  >
                    {isCheckingForUpdate ? 'Checking...' : 'Check for Updates'}
                  </Button>
                )}
                {pwaStatus ? <p className="text-sm text-[var(--settings-secondary-text)]">{pwaStatus}</p> : null}
              </div>
            </section>
          </div>

          <DialogFooter className="border-t border-[var(--settings-border)] px-6 py-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="border-[var(--settings-border)] bg-transparent font-black text-[var(--settings-accent)] hover:bg-[var(--settings-hover-blue)] hover:text-[var(--settings-accent)]"
              >
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayTableRow({
  rank,
  row,
  onChange,
}: {
  readonly rank: HandRank;
  readonly row: readonly [string, string, string, string, string];
  readonly onChange: (betIndex: number, value: string) => void;
}) {
  return (
    <>
      <div className="border-r border-b border-[var(--settings-border)] px-2 py-2 font-black text-[var(--settings-accent)]">
        {HAND_LABELS[rank]}
      </div>
      {row.map((payout, index) => (
        <div key={index} className="border-r border-b border-[var(--settings-border)] p-1 last:border-r-0">
          <Input
            aria-label={`${HAND_LABELS[rank]} pays for ${index + 1} credits`}
            inputMode="numeric"
            min={0}
            step={1}
            value={payout}
            onChange={(event) => onChange(index, event.target.value)}
            className="h-8 border-[var(--settings-border)] bg-[var(--settings-inset)] px-2 text-right text-white"
            aria-invalid={parseSafeInteger(payout) === undefined}
          />
        </div>
      ))}
    </>
  );
}
