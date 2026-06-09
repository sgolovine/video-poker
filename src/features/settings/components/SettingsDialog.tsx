import { type Dispatch, useEffect, useReducer, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { getPayTableRanks, HAND_LABELS } from '../../../data/payTable';
import type { CreditAmount, GameVariant, HandRank, PayTableConfig, VariantPayTables } from '../../../engine/types';
import { clonePayTable, GAME_DEFINITIONS, GAME_VARIANTS, getDefaultPayTable } from '../../../engine/util';
import { CARD_BACKS, DEFAULT_CARD_BACK_ID } from '../../../lib/cardAssets';
import { useLayoutStore } from '../../../stores/layout';
import { type GameStats, useStatsStore } from '../../../stores/stats';
import {
  DEFAULT_BALANCE,
  DEFAULT_PAY_TABLES,
  DEFAULT_VARIANT,
  getDefaultShowKeyboardShortcuts,
  useUserSettingsStore,
} from '../../../stores/userSettings';

interface SettingsDialogProps {
  readonly onApplySettings: (settings: {
    readonly balance: CreditAmount;
    readonly variant: GameVariant;
    readonly pays: PayTableConfig;
  }) => void;
}

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

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatCredits(value: CreditAmount): string {
  return value.toLocaleString();
}

function formatDollarAmount(value: number): string {
  const sign = value < 0 ? '-' : '';

  return `${sign}$${Math.abs(value).toLocaleString()}`;
}

function formatNetDollarAmount(value: number): string {
  return value > 0 ? `+${formatDollarAmount(value)}` : formatDollarAmount(value);
}

function formatHighestHand(stats: GameStats): string {
  return stats.highestHandWon ? HAND_LABELS[stats.highestHandWon] : 'None';
}

interface SettingsDialogState {
  readonly variantInput: GameVariant;
  readonly balanceInput: string;
  readonly payTableInput: EditablePayTable;
  readonly isCheckingForUpdate: boolean;
  readonly updateStatus: string;
  readonly offlineReady: boolean;
  readonly needRefresh: boolean;
}

type SettingsDialogAction =
  | { readonly type: 'patch'; readonly patch: Partial<SettingsDialogState> }
  | {
      readonly type: 'resetInputs';
      readonly variant: GameVariant;
      readonly balance: CreditAmount;
      readonly payTables: VariantPayTables;
    }
  | { readonly type: 'setVariantInput'; readonly variant: GameVariant; readonly payTable: PayTableConfig }
  | { readonly type: 'setPayTableCell'; readonly rank: HandRank; readonly betIndex: number; readonly value: string };

function createSettingsDialogState(
  variant: GameVariant,
  balance: CreditAmount,
  payTables: VariantPayTables,
): SettingsDialogState {
  return {
    variantInput: variant,
    balanceInput: String(balance),
    payTableInput: stringifyPayTable(variant, payTableForVariant(payTables, variant)),
    isCheckingForUpdate: false,
    updateStatus: '',
    offlineReady: false,
    needRefresh: false,
  };
}

function settingsDialogReducer(state: SettingsDialogState, action: SettingsDialogAction): SettingsDialogState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'resetInputs':
      return {
        ...state,
        ...createSettingsDialogState(action.variant, action.balance, action.payTables),
      };
    case 'setVariantInput':
      return {
        ...state,
        variantInput: action.variant,
        payTableInput: stringifyPayTable(action.variant, action.payTable),
      };
    case 'setPayTableCell':
      return {
        ...state,
        payTableInput: {
          ...state.payTableInput,
          [action.rank]: (state.payTableInput[action.rank] ?? ['0', '0', '0', '0', '0']).map((payout, index) =>
            index === action.betIndex ? action.value : payout,
          ) as [string, string, string, string, string],
        },
      };
  }
}

const serviceWorkerReadyTimeoutMs = 3000;

function getServiceWorkerBaseUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.href);
}

async function getReadyServiceWorkerRegistration() {
  return Promise.race<ServiceWorkerRegistration | undefined>([
    navigator.serviceWorker.ready,
    new Promise((resolve) => window.setTimeout(() => resolve(undefined), serviceWorkerReadyTimeoutMs)),
  ]);
}

function useServiceWorkerUpdates(dispatchDialog: Dispatch<SettingsDialogAction>) {
  const serviceWorkerRegistration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const reloadOnControllerChange = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
      return;
    }

    let isMounted = true;
    let watchedRegistration: ServiceWorkerRegistration | undefined;
    let watchedInstallingWorker: ServiceWorker | undefined;

    function handleInstallingWorkerStateChange() {
      if (watchedInstallingWorker?.state !== 'installed') {
        return;
      }

      if (navigator.serviceWorker.controller) {
        dispatchDialog({ type: 'patch', patch: { needRefresh: true, updateStatus: '' } });
      } else {
        dispatchDialog({ type: 'patch', patch: { offlineReady: true } });
      }
    }

    function handleUpdateFound() {
      const installingWorker = watchedRegistration?.installing;
      if (!installingWorker) {
        return;
      }

      watchedInstallingWorker?.removeEventListener('statechange', handleInstallingWorkerStateChange);
      watchedInstallingWorker = installingWorker;
      watchedInstallingWorker.addEventListener('statechange', handleInstallingWorkerStateChange);
    }

    function handleControllerChange() {
      if (reloadOnControllerChange.current) {
        window.location.reload();
      }
    }

    function watchRegistration(registration: ServiceWorkerRegistration) {
      if (!isMounted) {
        return;
      }

      watchedRegistration = registration;
      serviceWorkerRegistration.current = registration;

      if (registration.active) {
        dispatchDialog({ type: 'patch', patch: { offlineReady: true } });
      }

      if (registration.waiting && navigator.serviceWorker.controller) {
        dispatchDialog({ type: 'patch', patch: { needRefresh: true } });
      }

      watchedRegistration.addEventListener('updatefound', handleUpdateFound);
    }

    navigator.serviceWorker
      .register(new URL('sw.js', getServiceWorkerBaseUrl()).toString(), { scope: getServiceWorkerBaseUrl().toString() })
      .then(watchRegistration)
      .catch(() => {
        if (isMounted) {
          dispatchDialog({ type: 'patch', patch: { updateStatus: 'Offline support could not be enabled.' } });
        }
      });

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      watchedRegistration?.removeEventListener('updatefound', handleUpdateFound);
      watchedInstallingWorker?.removeEventListener('statechange', handleInstallingWorkerStateChange);
    };
  }, [dispatchDialog]);

  async function checkForUpdates() {
    dispatchDialog({ type: 'patch', patch: { isCheckingForUpdate: true, updateStatus: '', offlineReady: false } });

    if (!import.meta.env.PROD) {
      dispatchDialog({ type: 'patch', patch: { updateStatus: 'App updates are available after a production build.' } });
      toast.info('Checked for app updates', {
        description: 'App updates are available after a production build.',
      });
      dispatchDialog({ type: 'patch', patch: { isCheckingForUpdate: false } });
      return;
    }

    if (!('serviceWorker' in navigator)) {
      dispatchDialog({ type: 'patch', patch: { updateStatus: 'Updates are not available in this browser.' } });
      toast.info('Checked for app updates', {
        description: 'Updates are not available in this browser.',
      });
      dispatchDialog({ type: 'patch', patch: { isCheckingForUpdate: false } });
      return;
    }

    try {
      const registration =
        serviceWorkerRegistration.current ??
        (await navigator.serviceWorker.getRegistration()) ??
        (await getReadyServiceWorkerRegistration());

      if (!registration) {
        dispatchDialog({
          type: 'patch',
          patch: { updateStatus: 'Offline support is not registered for this page.' },
        });
        toast.info('Checked for app updates', {
          description: 'Offline support is not registered for this page.',
        });
        dispatchDialog({ type: 'patch', patch: { isCheckingForUpdate: false } });
        return;
      }

      serviceWorkerRegistration.current = registration;
      await registration.update();
      dispatchDialog({ type: 'patch', patch: { updateStatus: 'No update found.' } });
      toast.info('Checked for app updates', {
        description: 'No update found.',
      });
    } catch {
      dispatchDialog({ type: 'patch', patch: { updateStatus: 'Could not check for updates.' } });
      toast.error('Checked for app updates', {
        description: 'Could not check for updates.',
      });
    }

    dispatchDialog({ type: 'patch', patch: { isCheckingForUpdate: false } });
  }

  function installUpdate() {
    const waitingWorker = serviceWorkerRegistration.current?.waiting;
    if (!waitingWorker) {
      dispatchDialog({
        type: 'patch',
        patch: { updateStatus: 'Update is no longer waiting. Check again.', needRefresh: false },
      });
      return;
    }

    reloadOnControllerChange.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }

  return { checkForUpdates, installUpdate };
}

export function SettingsDialog({ onApplySettings }: SettingsDialogProps) {
  const open = useLayoutStore((state) => state.isSettingsDialogOpen);
  const setOpen = useLayoutStore((state) => state.setSettingsDialogOpen);
  const balance = useUserSettingsStore((state) => state.balance);
  const selectedVariant = useUserSettingsStore((state) => state.selectedVariant);
  const payTablesByVariant = useUserSettingsStore((state) => state.payTablesByVariant);
  const showKeyboardShortcuts = useUserSettingsStore((state) => state.showKeyboardShortcuts);
  const cardBackId = useUserSettingsStore((state) => state.cardBackId);
  const setShowKeyboardShortcuts = useUserSettingsStore((state) => state.setShowKeyboardShortcuts);
  const setCardBackId = useUserSettingsStore((state) => state.setCardBackId);
  const globalStats = useStatsStore((state) => state.globalStats);
  const statsByVariant = useStatsStore((state) => state.statsByVariant);
  const resetStats = useStatsStore((state) => state.resetStats);
  const [dialogState, dispatchDialog] = useReducer(
    settingsDialogReducer,
    createSettingsDialogState(selectedVariant, balance, payTablesByVariant),
  );
  const { checkForUpdates, installUpdate } = useServiceWorkerUpdates(dispatchDialog);
  const { variantInput, balanceInput, payTableInput, isCheckingForUpdate, updateStatus, offlineReady, needRefresh } =
    dialogState;

  const parsedBalance = parseSafeInteger(balanceInput);
  const parsedPayTable = parsePayTable(variantInput, payTableInput);
  const canApplyBalance = parsedBalance !== undefined;
  const canApplyPayTable = parsedPayTable !== undefined;
  const visibleRanks = getPayTableRanks(variantInput).filter((rank) => rank !== 'nothing');

  function applyVariant(nextVariant: GameVariant) {
    const nextPays = payTableForVariant(payTablesByVariant, nextVariant);
    dispatchDialog({ type: 'setVariantInput', variant: nextVariant, payTable: nextPays });
    onApplySettings({ balance, variant: nextVariant, pays: nextPays });

    if (nextVariant !== selectedVariant) {
      toast.success('Game changed', {
        description: GAME_DEFINITIONS[nextVariant].label,
      });
    }
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
    toast.success('Bank balance updated', {
      description: `${parsedBalance} credits`,
    });
  }

  function applyPayTable() {
    if (!parsedPayTable) {
      return;
    }

    onApplySettings({ balance, variant: variantInput, pays: parsedPayTable });
    toast.success('Paytables updated', {
      description: GAME_DEFINITIONS[variantInput].label,
    });
  }

  function resetPayTable() {
    const defaultPayTable = getDefaultPayTable(variantInput);
    dispatchDialog({ type: 'patch', patch: { payTableInput: stringifyPayTable(variantInput, defaultPayTable) } });
    onApplySettings({ balance, variant: variantInput, pays: defaultPayTable });
    toast.success('Paytables reset', {
      description: GAME_DEFINITIONS[variantInput].label,
    });
  }

  function resetStoredStats() {
    resetStats();
    toast.warning('Stats reset', {
      description: 'All tracked play stats have been cleared.',
    });
  }

  function wipeLocalData() {
    localStorage.clear();
    dispatchDialog({
      type: 'patch',
      patch: {
        variantInput: DEFAULT_VARIANT,
        balanceInput: String(DEFAULT_BALANCE),
        payTableInput: stringifyPayTable(DEFAULT_VARIANT, DEFAULT_PAY_TABLES[DEFAULT_VARIANT]),
      },
    });
    setShowKeyboardShortcuts(getDefaultShowKeyboardShortcuts());
    setCardBackId(DEFAULT_CARD_BACK_ID);
    onApplySettings({ balance: DEFAULT_BALANCE, variant: DEFAULT_VARIANT, pays: DEFAULT_PAY_TABLES[DEFAULT_VARIANT] });
    toast.warning('Local storage wiped', {
      description: 'Settings have been reset to defaults.',
    });
  }

  const pwaStatus = needRefresh ? 'Update ready.' : offlineReady ? 'Offline ready.' : updateStatus;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          dispatchDialog({ type: 'resetInputs', variant: selectedVariant, balance, payTables: payTablesByVariant });
        }

        setOpen(nextOpen);
      }}
    >
      <DialogContent className="settings-dialog border-[var(--settings-border)] bg-[var(--settings-panel)] p-0 text-white shadow-[0_0_0_4px_var(--settings-hover-blue),0_16px_60px_rgba(0,0,0,0.65)]">
        <Tabs
          defaultValue="game"
          className="settings-dialog-frame grid max-h-[min(90svh,760px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden"
        >
          <DialogHeader className="settings-dialog-header border-b border-[var(--settings-border)] px-6 py-5 text-left">
            <DialogTitle className="text-2xl text-[var(--settings-accent)] [text-shadow:2px_2px_0_var(--settings-hover-blue)]">
              SETTINGS
            </DialogTitle>
            <DialogDescription className="sr-only">
              Configure game, display, paytable, stats, and app settings.
            </DialogDescription>
            <TabsList
              aria-label="Settings sections"
              className="grid h-auto w-full grid-cols-3 auto-rows-[2.25rem] overflow-hidden rounded-sm border border-[var(--settings-border)] bg-[var(--settings-inset)] p-1 text-[var(--settings-secondary-text)] group-data-horizontal/tabs:h-auto sm:h-10 sm:grid-cols-5 sm:auto-rows-auto sm:group-data-horizontal/tabs:h-10"
            >
              {['game', 'display', 'paytables', 'stats', 'app'].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="h-full min-h-0 rounded-sm px-2 font-black text-[var(--settings-accent)] uppercase hover:bg-[var(--settings-hover-blue)] hover:text-[var(--settings-accent)] data-active:bg-[var(--settings-button)] data-active:text-[var(--settings-button-text)]"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </DialogHeader>

          <div className="settings-dialog-body overflow-y-auto px-6 py-5">
            <GameSettingsTab
              selectedVariant={selectedVariant}
              balanceInput={balanceInput}
              canApplyBalance={canApplyBalance}
              onApplyVariant={applyVariant}
              onApplyBalance={applyBalance}
              onBalanceInputChange={(nextBalance) =>
                dispatchDialog({ type: 'patch', patch: { balanceInput: nextBalance } })
              }
            />
            <DisplaySettingsTab
              showKeyboardShortcuts={showKeyboardShortcuts}
              cardBackId={cardBackId}
              onShowKeyboardShortcutsChange={setShowKeyboardShortcuts}
              onCardBackIdChange={setCardBackId}
            />
            <PaytablesSettingsTab
              visibleRanks={visibleRanks}
              payTableInput={payTableInput}
              canApplyPayTable={canApplyPayTable}
              onResetPayTable={resetPayTable}
              onApplyPayTable={applyPayTable}
              onPayTableCellChange={(rank, betIndex, value) =>
                dispatchDialog({ type: 'setPayTableCell', rank, betIndex, value })
              }
            />
            <StatsSettingsTab
              globalStats={globalStats}
              statsByVariant={statsByVariant}
              onResetStats={resetStoredStats}
            />
            <AppSettingsTab
              needRefresh={needRefresh}
              isCheckingForUpdate={isCheckingForUpdate}
              pwaStatus={pwaStatus}
              onWipeLocalData={wipeLocalData}
              onInstallUpdate={installUpdate}
              onCheckForUpdates={checkForUpdates}
            />
          </div>

          <DialogFooter className="settings-dialog-footer border-t border-[var(--settings-border)] px-6 py-4">
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function GameSettingsTab({
  selectedVariant,
  balanceInput,
  canApplyBalance,
  onApplyVariant,
  onApplyBalance,
  onBalanceInputChange,
}: {
  readonly selectedVariant: GameVariant;
  readonly balanceInput: string;
  readonly canApplyBalance: boolean;
  readonly onApplyVariant: (variant: GameVariant) => void;
  readonly onApplyBalance: () => void;
  readonly onBalanceInputChange: (balance: string) => void;
}) {
  return (
    <TabsContent value="game" className="mt-0 grid gap-6">
      <section className="grid gap-3" aria-labelledby="game-settings-title">
        <div className="grid gap-1">
          <h2 id="game-settings-title" className="text-base leading-none font-black text-[var(--settings-accent)]">
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
              onClick={() => onApplyVariant(variant)}
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

      <section
        className="grid gap-3 border-t border-[var(--settings-border)] pt-5"
        aria-labelledby="balance-settings-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <h2 id="balance-settings-title" className="text-base leading-none font-black text-[var(--settings-accent)]">
              Bank Balance
            </h2>
            <p className="text-sm text-[var(--settings-secondary-text)]">Set the available credits on the meter.</p>
          </div>
          <Button
            type="button"
            disabled={!canApplyBalance}
            onClick={onApplyBalance}
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
            onChange={(event) => onBalanceInputChange(event.target.value)}
            className="border-[var(--settings-border)] bg-[var(--settings-table)] text-white"
            aria-invalid={!canApplyBalance}
          />
        </div>
      </section>
    </TabsContent>
  );
}

function DisplaySettingsTab({
  showKeyboardShortcuts,
  cardBackId,
  onShowKeyboardShortcutsChange,
  onCardBackIdChange,
}: {
  readonly showKeyboardShortcuts: boolean;
  readonly cardBackId: string;
  readonly onShowKeyboardShortcutsChange: (showKeyboardShortcuts: boolean) => void;
  readonly onCardBackIdChange: (cardBackId: string) => void;
}) {
  return (
    <TabsContent value="display" className="mt-0 grid gap-6">
      <section className="grid gap-3" aria-labelledby="display-settings-title">
        <div className="grid gap-1">
          <h2 id="display-settings-title" className="text-base leading-none font-black text-[var(--settings-accent)]">
            Display
          </h2>
          <p className="text-sm text-[var(--settings-secondary-text)]">Control the table display and card style.</p>
        </div>
        <div className="grid gap-4">
          <label className="flex w-fit items-center gap-3 font-black text-[var(--settings-accent)]">
            <input
              type="checkbox"
              checked={showKeyboardShortcuts}
              onChange={(event) => {
                const nextShowKeyboardShortcuts = event.target.checked;
                onShowKeyboardShortcutsChange(nextShowKeyboardShortcuts);
                toast.info('Keyboard shortcuts updated', {
                  description: nextShowKeyboardShortcuts ? 'Shortcuts are visible.' : 'Shortcuts are hidden.',
                });
              }}
              className="size-5 accent-[var(--settings-button)]"
            />
            Show Keyboard Shortcuts
          </label>

          <div className="grid gap-2">
            <Label className="text-[var(--settings-accent)]">Card Back</Label>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2 rounded-sm border border-[var(--settings-border)] bg-[var(--settings-inset)] p-3">
              {CARD_BACKS.map((cardBack) => (
                <button
                  key={cardBack.id}
                  type="button"
                  aria-label={cardBack.label}
                  aria-pressed={cardBack.id === cardBackId}
                  onClick={() => {
                    if (cardBack.id === cardBackId) {
                      return;
                    }

                    onCardBackIdChange(cardBack.id);
                    toast.info('Card back updated', {
                      description: cardBack.label,
                    });
                  }}
                  className="grid min-h-24 place-items-center rounded-sm border-2 border-transparent bg-transparent p-1 outline-offset-2 transition enabled:cursor-pointer hover:border-[var(--settings-accent)] focus-visible:outline-2 focus-visible:outline-[var(--settings-accent)] aria-pressed:border-[var(--settings-button)] aria-pressed:bg-[var(--settings-hover-blue)]"
                >
                  <img
                    src={cardBack.url}
                    alt=""
                    className="aspect-[169/244] h-20 rounded-sm object-contain [filter:drop-shadow(1px_1px_0_#000)]"
                    draggable="false"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </TabsContent>
  );
}

function PaytablesSettingsTab({
  visibleRanks,
  payTableInput,
  canApplyPayTable,
  onResetPayTable,
  onApplyPayTable,
  onPayTableCellChange,
}: {
  readonly visibleRanks: readonly HandRank[];
  readonly payTableInput: EditablePayTable;
  readonly canApplyPayTable: boolean;
  readonly onResetPayTable: () => void;
  readonly onApplyPayTable: () => void;
  readonly onPayTableCellChange: (rank: HandRank, betIndex: number, value: string) => void;
}) {
  return (
    <TabsContent value="paytables" className="mt-0 grid gap-6">
      <section className="grid gap-3" aria-labelledby="paytable-settings-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <h2
              id="paytable-settings-title"
              className="text-base leading-none font-black text-[var(--settings-accent)]"
            >
              Paytables
            </h2>
            <p className="text-sm text-[var(--settings-secondary-text)]">Edit payouts for one through five credits.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onResetPayTable}
              className="border-[var(--settings-border)] bg-transparent font-black text-[var(--settings-accent)] hover:bg-[var(--settings-hover-blue)] hover:text-[var(--settings-accent)]"
            >
              Reset Paytables
            </Button>
            <Button
              type="button"
              disabled={!canApplyPayTable}
              onClick={onApplyPayTable}
              className="bg-[var(--settings-button)] font-black text-[var(--settings-button-text)] hover:bg-[var(--settings-button-hover)]"
            >
              Update Paytables
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto border border-[var(--settings-border)]">
          <div className="grid min-w-[650px] grid-cols-[minmax(180px,1.4fr)_repeat(5,minmax(72px,1fr))] bg-[var(--settings-table)] text-sm">
            <div className="border-r border-b border-[var(--settings-border)] p-2 font-black text-[var(--settings-accent)]">
              Hand
            </div>
            {[1, 2, 3, 4, 5].map((bet) => (
              <div
                key={bet}
                className="border-r border-b border-[var(--settings-border)] p-2 text-right font-black text-[var(--settings-accent)] last:border-r-0"
              >
                {bet}
              </div>
            ))}
            {visibleRanks.map((rank) => (
              <PayTableRow
                key={rank}
                rank={rank}
                row={payTableInput[rank] ?? ['0', '0', '0', '0', '0']}
                onChange={(betIndex, value) => onPayTableCellChange(rank, betIndex, value)}
              />
            ))}
          </div>
        </div>
      </section>
    </TabsContent>
  );
}

function StatsSettingsTab({
  globalStats,
  statsByVariant,
  onResetStats,
}: {
  readonly globalStats: GameStats;
  readonly statsByVariant: Readonly<Record<GameVariant, GameStats>>;
  readonly onResetStats: () => void;
}) {
  return (
    <TabsContent value="stats" className="mt-0 grid gap-6">
      <section className="grid gap-3" aria-labelledby="stats-settings-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <h2 id="stats-settings-title" className="text-base leading-none font-black text-[var(--settings-accent)]">
              Lifetime Stats
            </h2>
            <p className="text-sm text-[var(--settings-secondary-text)]">Review totals tracked on this device.</p>
          </div>
          <Button type="button" variant="destructive" onClick={onResetStats} className="w-fit font-black">
            Reset Stats
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatsSummaryItem label="Hands" value={formatCredits(globalStats.handsPlayed)} />
          <StatsSummaryItem label="Wins" value={formatCredits(globalStats.winningHands)} />
          <StatsSummaryItem label="Win Rate" value={formatPercent(globalStats.winPercentage)} />
          <StatsSummaryItem label="Spent" value={formatDollarAmount(globalStats.totalMoneySpent)} />
          <StatsSummaryItem label="Earned" value={formatDollarAmount(globalStats.totalMoneyEarned)} />
          <StatsSummaryItem label="Net" value={formatNetDollarAmount(globalStats.totalWinLoss)} />
        </div>

        <div className="grid gap-2 rounded-sm border border-[var(--settings-border)] bg-[var(--settings-inset)] p-3">
          <span className="text-xs font-black tracking-normal text-[var(--settings-secondary-text)] uppercase">
            Best Hand
          </span>
          <span className="text-lg font-black text-[var(--settings-accent)]">{formatHighestHand(globalStats)}</span>
        </div>
      </section>

      <section
        className="grid gap-3 border-t border-[var(--settings-border)] pt-5"
        aria-labelledby="variant-stats-title"
      >
        <h2 id="variant-stats-title" className="text-base leading-none font-black text-[var(--settings-accent)]">
          By Game
        </h2>
        <div className="overflow-x-auto border border-[var(--settings-border)] bg-[var(--settings-table)]">
          <table className="w-full min-w-[680px] table-auto border-collapse text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="border-r border-b border-[var(--settings-border)] p-2 text-left font-black whitespace-nowrap text-[var(--settings-accent)]"
                >
                  Game
                </th>
                {['Hands', 'Wins', 'Rate', 'Spent', 'Earned', 'Net'].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="border-r border-b border-[var(--settings-border)] p-2 text-right font-black whitespace-nowrap text-[var(--settings-accent)]"
                  >
                    {label}
                  </th>
                ))}
                <th
                  scope="col"
                  className="border-b border-[var(--settings-border)] p-2 text-left font-black whitespace-nowrap text-[var(--settings-accent)]"
                >
                  Best Hand
                </th>
              </tr>
            </thead>
            <tbody>
              {GAME_VARIANTS.map((variant) => (
                <StatsTableRow key={variant} variant={variant} stats={statsByVariant[variant]} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </TabsContent>
  );
}

function AppSettingsTab({
  needRefresh,
  isCheckingForUpdate,
  pwaStatus,
  onWipeLocalData,
  onInstallUpdate,
  onCheckForUpdates,
}: {
  readonly needRefresh: boolean;
  readonly isCheckingForUpdate: boolean;
  readonly pwaStatus: string;
  readonly onWipeLocalData: () => void;
  readonly onInstallUpdate: () => void;
  readonly onCheckForUpdates: () => void;
}) {
  return (
    <TabsContent value="app" className="mt-0 grid gap-6">
      <section className="grid gap-3" aria-labelledby="storage-settings-title">
        <div className="grid gap-1">
          <h2 id="storage-settings-title" className="text-base leading-none font-black text-[var(--settings-accent)]">
            Local Storage
          </h2>
          <p className="text-sm text-[var(--settings-secondary-text)]">
            Clear saved balance, speed, paytables, and any other local data for this origin.
          </p>
        </div>
        <Button type="button" variant="destructive" onClick={onWipeLocalData} className="w-fit font-black">
          Wipe Local Data
        </Button>
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
              onClick={onInstallUpdate}
              className="bg-[var(--settings-button)] font-black text-[var(--settings-button-text)] hover:bg-[var(--settings-button-hover)]"
            >
              Install Update
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isCheckingForUpdate}
              onClick={onCheckForUpdates}
              className="bg-[var(--settings-button)] font-black text-[var(--settings-button-text)] hover:bg-[var(--settings-button-hover)]"
            >
              {isCheckingForUpdate ? 'Checking...' : 'Check for Updates'}
            </Button>
          )}
          {pwaStatus ? <p className="text-sm text-[var(--settings-secondary-text)]">{pwaStatus}</p> : null}
        </div>
      </section>
    </TabsContent>
  );
}

function StatsSummaryItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="grid gap-1 rounded-sm border border-[var(--settings-border)] bg-[var(--settings-inset)] p-3">
      <span className="text-xs font-black tracking-normal text-[var(--settings-secondary-text)] uppercase">
        {label}
      </span>
      <span className="text-xl font-black text-white">{value}</span>
    </div>
  );
}

function StatsTableRow({ variant, stats }: { readonly variant: GameVariant; readonly stats: GameStats }) {
  const numericCells = [
    formatCredits(stats.handsPlayed),
    formatCredits(stats.winningHands),
    formatPercent(stats.winPercentage),
    formatDollarAmount(stats.totalMoneySpent),
    formatDollarAmount(stats.totalMoneyEarned),
    formatNetDollarAmount(stats.totalWinLoss),
  ];

  return (
    <tr>
      <th
        scope="row"
        className="border-r border-b border-[var(--settings-border)] p-2 text-left font-black whitespace-nowrap text-[var(--settings-accent)]"
      >
        {GAME_DEFINITIONS[variant].label}
      </th>
      {numericCells.map((value, index) => (
        <td
          key={`${variant}-${index + 1}`}
          className="border-r border-b border-[var(--settings-border)] p-2 text-right text-white"
        >
          {value}
        </td>
      ))}
      <td className="border-b border-[var(--settings-border)] p-2 font-black whitespace-nowrap text-white">
        {formatHighestHand(stats)}
      </td>
    </tr>
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
      <div className="border-r border-b border-[var(--settings-border)] p-2 font-black text-[var(--settings-accent)]">
        {HAND_LABELS[rank]}
      </div>
      {row.map((payout, index) => (
        <div
          key={`${rank}-${index + 1}`}
          className="border-r border-b border-[var(--settings-border)] p-1 last:border-r-0"
        >
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
