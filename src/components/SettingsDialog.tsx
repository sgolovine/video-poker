import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHotkey } from '@tanstack/react-hotkeys';
import type { CreditAmount, HandRank, PayTableConfig } from '../engine';
import { clonePayTable } from '../engine';
import { HAND_LABELS, HAND_ORDER } from '../data/payTable';
import { DEFAULT_BALANCE, DEFAULT_PAYS, useUserSettingsStore } from '../stores/userSettings';
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
  const [open, setOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState(String(balance));
  const [payTableInput, setPayTableInput] = useState<EditablePayTable>(() => stringifyPayTable(pays));
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration>();
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const reloadOnControllerChange = useRef(false);

  const parsedBalance = parseSafeInteger(balanceInput);
  const parsedPayTable = useMemo(() => parsePayTable(payTableInput), [payTableInput]);
  const canApplyBalance = parsedBalance !== undefined;
  const canApplyPayTable = parsedPayTable !== undefined;

  useHotkey('O', () => setOpen(true), { enabled: !open, preventDefault: true });

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
        <button type="button" className={triggerClassName}>
          {triggerContent ?? 'OPTIONS'}
        </button>
      </DialogTrigger>
      <DialogContent className="border-[#a5a831] bg-[#000052] p-0 font-[Arial,Helvetica,sans-serif] text-white shadow-[0_0_0_4px_#00195c,0_16px_60px_rgba(0,0,0,0.65)]">
        <div className="grid max-h-[min(90svh,760px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <DialogHeader className="border-b border-[#a5a831] px-6 py-5 text-left">
            <DialogTitle className="font-[Silkscreen,monospace] text-2xl text-[#ffff2f] [text-shadow:2px_2px_0_#0036a1]">
              SETTINGS
            </DialogTitle>
            <DialogDescription className="text-[#d9d9d9]">
              Updates apply to the current machine and are saved in this browser.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 overflow-y-auto px-6 py-5">
            <section className="grid gap-3" aria-labelledby="balance-settings-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="grid gap-1">
                  <h2 id="balance-settings-title" className="text-base leading-none font-black text-[#ffff2f]">
                    Bank Balance
                  </h2>
                  <p className="text-sm text-[#d9d9d9]">Set the available credits on the meter.</p>
                </div>
                <Button
                  type="button"
                  disabled={!canApplyBalance}
                  onClick={applyBalance}
                  className="bg-[#ffe63d] font-black text-[#070707] hover:bg-[#fff06b]"
                >
                  Update Balance
                </Button>
              </div>
              <div className="grid max-w-xs gap-2">
                <Label htmlFor="settings-balance" className="text-[#ffff2f]">
                  Balance
                </Label>
                <Input
                  id="settings-balance"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={balanceInput}
                  onChange={(event) => setBalanceInput(event.target.value)}
                  className="border-[#a5a831] bg-[#000099] text-white"
                  aria-invalid={!canApplyBalance}
                />
              </div>
            </section>

            <section className="grid gap-3" aria-labelledby="paytable-settings-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="grid gap-1">
                  <h2 id="paytable-settings-title" className="text-base leading-none font-black text-[#ffff2f]">
                    Paytables
                  </h2>
                  <p className="text-sm text-[#d9d9d9]">Edit payouts for one through five credits.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetPayTable}
                    className="border-[#a5a831] bg-transparent font-black text-[#ffff2f] hover:bg-[#001080] hover:text-[#ffff2f]"
                  >
                    Reset Paytables
                  </Button>
                  <Button
                    type="button"
                    disabled={!canApplyPayTable}
                    onClick={applyPayTable}
                    className="bg-[#ffe63d] font-black text-[#070707] hover:bg-[#fff06b]"
                  >
                    Update Paytables
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto border border-[#a5a831]">
                <div className="grid min-w-[650px] grid-cols-[minmax(180px,1.4fr)_repeat(5,minmax(72px,1fr))] bg-[#000099] text-sm">
                  <div className="border-r border-b border-[#a5a831] px-2 py-2 font-black text-[#ffff2f]">Hand</div>
                  {[1, 2, 3, 4, 5].map((bet) => (
                    <div key={bet} className="border-r border-b border-[#a5a831] px-2 py-2 text-right font-black text-[#ffff2f] last:border-r-0">
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

            <section className="grid gap-3 border-t border-[#a5a831] pt-5" aria-labelledby="storage-settings-title">
              <div className="grid gap-1">
                <h2 id="storage-settings-title" className="text-base leading-none font-black text-[#ffff2f]">
                  Local Storage
                </h2>
                <p className="text-sm text-[#d9d9d9]">Clear saved balance, speed, paytables, and any other local data for this origin.</p>
              </div>
              <Button type="button" variant="destructive" onClick={wipeLocalData} className="w-fit font-black">
                Wipe Local Data
              </Button>
            </section>

            <section className="grid gap-3 border-t border-[#a5a831] pt-5" aria-labelledby="app-settings-title">
              <div className="grid gap-1">
                <h2 id="app-settings-title" className="text-base leading-none font-black text-[#ffff2f]">
                  App
                </h2>
                <p className="text-sm text-[#d9d9d9]">Version {__APP_VERSION__}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {needRefresh ? (
                  <Button type="button" onClick={installUpdate} className="bg-[#ffe63d] font-black text-[#070707] hover:bg-[#fff06b]">
                    Install Update
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isCheckingForUpdate}
                    onClick={checkForUpdates}
                    className="bg-[#ffe63d] font-black text-[#070707] hover:bg-[#fff06b]"
                  >
                    {isCheckingForUpdate ? 'Checking...' : 'Check for Updates'}
                  </Button>
                )}
                {pwaStatus ? <p className="text-sm text-[#d9d9d9]">{pwaStatus}</p> : null}
              </div>
            </section>
          </div>

          <DialogFooter className="border-t border-[#a5a831] px-6 py-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-[#a5a831] bg-transparent font-black text-[#ffff2f] hover:bg-[#001080] hover:text-[#ffff2f]">
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
      <div className="border-r border-b border-[#a5a831] px-2 py-2 font-black text-[#ffff2f]">{HAND_LABELS[rank]}</div>
      {row.map((payout, index) => (
        <div key={index} className="border-r border-b border-[#a5a831] p-1 last:border-r-0">
          <Input
            aria-label={`${HAND_LABELS[rank]} pays for ${index + 1} credits`}
            inputMode="numeric"
            min={0}
            step={1}
            value={payout}
            onChange={(event) => onChange(index, event.target.value)}
            className="h-8 border-[#a5a831] bg-[#000052] px-2 text-right text-white"
            aria-invalid={parseSafeInteger(payout) === undefined}
          />
        </div>
      ))}
    </>
  );
}
