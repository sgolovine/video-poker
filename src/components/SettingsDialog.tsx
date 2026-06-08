import { useHotkey } from '@tanstack/react-hotkeys';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HAND_LABELS, HAND_ORDER } from '../data/payTable';
import type { CreditAmount, HandRank, PayTableConfig } from '../engine';
import { clonePayTable } from '../engine';
import {
  DEFAULT_BALANCE,
  DEFAULT_PAYS,
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
  readonly onApplySettings: (settings: { readonly balance: CreditAmount; readonly pays: PayTableConfig }) => void;
}

const KEY_PRESS_EFFECT_MS = 120;

type EditablePayTable = Record<HandRank, [string, string, string, string, string]>;

function stringifyPayTable(payTable: PayTableConfig): EditablePayTable {
  const nextPayTable = {} as EditablePayTable;

  for (const rank of [...HAND_ORDER, 'nothing'] as const) {
    nextPayTable[rank] = payTable[rank].map((payout) => String(payout)) as [string, string, string, string, string];
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

function parsePayTable(payTable: EditablePayTable): PayTableConfig | undefined {
  const nextPayTable = {} as Record<HandRank, [number, number, number, number, number]>;

  for (const rank of [...HAND_ORDER, 'nothing'] as const) {
    const row = payTable[rank].map(parseSafeInteger);
    if (row.some((value) => value === undefined)) {
      return undefined;
    }

    nextPayTable[rank] = row as [number, number, number, number, number];
  }

  return clonePayTable(nextPayTable);
}

export function SettingsDialog({ triggerClassName, triggerContent, onApplySettings }: SettingsDialogProps) {
  const balance = useUserSettingsStore((state) => state.balance);
  const pays = useUserSettingsStore((state) => state.pays);
  const showKeyboardShortcuts = useUserSettingsStore((state) => state.showKeyboardShortcuts);
  const setShowKeyboardShortcuts = useUserSettingsStore((state) => state.setShowKeyboardShortcuts);
  const [open, setOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState(String(balance));
  const [payTableInput, setPayTableInput] = useState<EditablePayTable>(() => stringifyPayTable(pays));
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration>();
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isTriggerKeyPressed, setIsTriggerKeyPressed] = useState(false);
  const triggerKeyPressedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reloadOnControllerChange = useRef(false);

  const parsedBalance = parseSafeInteger(balanceInput);
  const parsedPayTable = useMemo(() => parsePayTable(payTableInput), [payTableInput]);
  const canApplyBalance = parsedBalance !== undefined;
  const canApplyPayTable = parsedPayTable !== undefined;

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

  function applyBalance() {
    if (parsedBalance === undefined) {
      return;
    }

    onApplySettings({ balance: parsedBalance, pays });
  }

  function applyPayTable() {
    if (!parsedPayTable) {
      return;
    }

    onApplySettings({ balance, pays: parsedPayTable });
  }

  function resetPayTable() {
    setPayTableInput(stringifyPayTable(DEFAULT_PAYS));
    onApplySettings({ balance, pays: DEFAULT_PAYS });
  }

  function wipeLocalData() {
    localStorage.clear();
    setBalanceInput(String(DEFAULT_BALANCE));
    setPayTableInput(stringifyPayTable(DEFAULT_PAYS));
    setShowKeyboardShortcuts(getDefaultShowKeyboardShortcuts());
    onApplySettings({ balance: DEFAULT_BALANCE, pays: DEFAULT_PAYS });
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
          setBalanceInput(String(balance));
          setPayTableInput(stringifyPayTable(pays));
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
                  {HAND_ORDER.map((rank) => (
                    <PayTableRow
                      key={rank}
                      rank={rank}
                      row={payTableInput[rank]}
                      onChange={(betIndex, value) => {
                        setPayTableInput((current) => ({
                          ...current,
                          [rank]: current[rank].map((payout, index) => (index === betIndex ? value : payout)) as [
                            string,
                            string,
                            string,
                            string,
                            string,
                          ],
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
