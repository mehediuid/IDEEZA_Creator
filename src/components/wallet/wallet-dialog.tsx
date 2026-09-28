"use client";

// The Demo wallet dialog (P2-MINT-2, P2-MINT-3, P2-MARKETPLACE-13 as changed
// in spec §4.6). One ModalFrame — a portal over one scrim, Tab held inside,
// focus handed back to whatever opened it — in two modes:
//
// - `manage`, from the account menu: the one home for every identity's
//   connection. The maker's connect / disconnect, account and network, the
//   balance and recent activity, then "Demo buyers (for Explore
//   marketplace)" with a Connect / Disconnect per buyer. No page carries
//   these controls; pages show a fact line.
// - `request`, from `useWalletRequest().request()`: MINT-3's phases, driven
//   by WalletProvider. This file only renders a phase and hands the presses
//   back; it owns no gate and no copy (`request.ts`, `request-view.ts`).
//
// Focus: on each phase change focus moves to that phase's primary, or to
// the body heading when it has none. The body is a polite live region;
// failed and can't-afford are role=alert. Phases crossfade (200 ms, the
// `normal` motion token); under reduced motion nothing moves and the
// spinner and bar are still, with the words unchanged.
//
// Violet: a request's primary is the brand violet, and the page's own violet
// is under the scrim, so one is in view. Manage mode, once connected, has no
// violet at all: nothing in it is the page's next step.

import * as React from "react";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, IconButton, ModalFrame, Radio, TestnetDemoBadge } from "@/components/ideeza";
import { NETWORKS, type Network } from "@/lib/brief/types";
import type { MarketData } from "@/lib/market/types";
import {
  demoAddress,
  makerId,
  readWallet,
  shortAddress,
  walletConnect,
  walletDisconnect,
  walletSwitchAccount,
  walletSwitchNetwork,
} from "@/lib/wallet/demo-wallet";
import { DEMO_ACCOUNTS, DEMO_BUYERS } from "@/lib/wallet/identities";
import { TIMING, requestCopy } from "@/lib/wallet/request";
import {
  accountRowOf,
  activityLineOf,
  balanceAfterOf,
  balanceChangedLine,
  balanceLineOf,
  buyerRowOf,
  chargeRowsOf,
  connectionLineOf,
  identityLabelOf,
  networkLabelOf,
  recentOf,
  shortfallOf,
} from "@/lib/wallet/request-view";
import type {
  AccountIndex,
  DemoBuyerId,
  DemoWallet,
  FailReason,
  IdentityId,
  Proof,
  RequestPhase,
  WalletRequest,
} from "@/lib/wallet/types";
import { cn } from "@/lib/utils";

export type RequestView = {
  req: WalletRequest;
  identity: IdentityId;
  phase: RequestPhase;
  reason: FailReason | null;
  message: string | null;
  hash: string | null;
  proof: Proof | null;
  canUseLazy: boolean;
};

export type RequestActions = {
  connect: () => void;
  switchNetwork: () => void;
  approve: () => void;
  reject: () => void;
  retry: () => void;
  cancel: () => void;
  useLazy: () => void;
  done: () => void;
};

export type WalletDialogProps = {
  open: boolean;
  mode: "manage" | "request";
  wallet: DemoWallet | undefined;
  market: MarketData;
  /** Every wallet write; false = the browser refused it. */
  write: (next: DemoWallet) => boolean;
  onClose: () => void;
  request: RequestView | null;
  actions: RequestActions;
};

const WRITE_FAILED = "This browser couldn't save the wallet — storage is full or blocked.";
// 44 px at phone width and on a coarse pointer (P2-MINT-2 "Size").
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const FADE = "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-out";
const SECTION = "text-2xs font-bold uppercase tracking-caps text-text-tertiary";

const MINUTE = 60_000;

function subscribeMinute(onChange: () => void) {
  const t = window.setInterval(onChange, MINUTE);
  return () => window.clearInterval(t);
}

/**
 * The wall clock to the minute, for the balances a wallet surface shows: the
 * only time-dependent part is whether a live auction's top bid still holds
 * funds, and a minute is plenty for that. 0 on the server.
 */
export function useWalletClock(): number {
  return React.useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => 0,
  );
}

export function WalletDialog(props: WalletDialogProps) {
  if (!props.open) return null;
  if (props.mode === "request" && props.request) return <RequestDialog {...props} view={props.request} />;
  return <ManageDialog {...props} />;
}

// ── shared bits ─────────────────────────────────────────────────────────

/** A spinner in the button's own ink, so it reads on the violet primary; still under reduced motion. */
function BusyMark() {
  return (
    <span
      aria-hidden
      className="inline-block size-[14px] shrink-0 rounded-full border-2 border-solid border-current border-r-transparent motion-safe:animate-spin"
    />
  );
}

function useMovingFocus(key: string) {
  const target = React.useRef<HTMLElement | null>(null);
  const setTarget = React.useCallback((el: HTMLElement | null) => {
    if (el) target.current = el;
  }, []);
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false; // the frame focuses it on open
      return;
    }
    const frame = requestAnimationFrame(() => target.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [key]);
  return { target, setTarget };
}

function useCopy() {
  const [copied, setCopied] = React.useState<{ what: string; text: string } | null>(null);
  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);
  const copy = React.useCallback((what: string, value: string, done: string) => {
    const write = navigator.clipboard?.writeText(value);
    if (!write) {
      setCopied({ what, text: `Couldn't copy — select it instead: ${value}` });
      return;
    }
    write.then(
      () => setCopied({ what, text: done }),
      () => setCopied({ what, text: `Couldn't copy — select it instead: ${value}` }),
    );
  }, []);
  return { copied, copy };
}

function CopyButton({
  label,
  done,
  onPress,
  setRef,
}: {
  label: string;
  done: boolean;
  onPress: () => void;
  setRef?: (el: HTMLElement | null) => void;
}) {
  return (
    <IconButton
      ref={setRef}
      type="button"
      size="md"
      aria-label={label}
      title={label}
      onClick={onPress}
      className="max-md:size-[var(--touch-min)] [@media(pointer:coarse)]:size-[var(--touch-min)]"
      icon={<Icon icon={done ? Tick02Icon : Copy01Icon} size={18} />}
    />
  );
}

/** A label and its value on one line, wrapping at 400 px rather than scrolling. */
function Row({ label, value, note, strong }: { label: string; value: React.ReactNode; note?: string; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-[12px] gap-y-[2px]">
      <dt className={cn("min-w-0", strong ? "font-bold text-text-primary" : "text-text-secondary")}>{label}</dt>
      <dd className={cn("ml-auto min-w-0 text-right tabular-nums", strong ? "font-bold text-text-primary" : "font-medium text-text-primary")}>
        {value}
        {note && <span className="ml-[6px] font-regular text-text-tertiary">{note}</span>}
      </dd>
    </div>
  );
}

/** A radiogroup of rows, with roving focus: the arrow keys move and choose, as a radio set does. */
function RadioRows<T extends string | number>({
  labelId,
  value,
  options,
  onChoose,
}: {
  labelId: string;
  value: T;
  options: { value: T; label: string }[];
  onChoose: (v: T) => void;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, dir: 1 | -1) => {
    const next = (from + dir + options.length) % options.length;
    onChoose(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex flex-col gap-[6px]">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChoose(o.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={cn(
              "flex min-h-[36px] w-full items-center gap-[10px] rounded-lg border border-solid px-[12px] py-[6px] text-left text-sm outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
              TAP,
              on ? "border-border-brand bg-bg-brand-subtle text-text-primary" : "border-border bg-bg-surface text-text-primary hover:bg-bg-subtle",
            )}
          >
            <Radio checked={on} decorative size="sm" />
            <span className="min-w-0 flex-1 break-words tabular-nums">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── manage mode (P2-MINT-2) ────────────────────────────────────────────

function ManageDialog({ wallet, market, write, onClose }: WalletDialogProps) {
  const [busy, setBusy] = React.useState<"maker" | DemoBuyerId | null>(null);
  const [failed, setFailed] = React.useState(false);
  const timer = React.useRef<number | null>(null);
  React.useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const { copied, copy } = useCopy();
  const accountLabelId = React.useId();
  const networkLabelId = React.useId();
  const buyersLabelId = React.useId();

  const now = useWalletClock();
  const ctx = { wallet, market, now };
  const account = wallet?.account ?? 1;
  const id = makerId(account);
  const state = wallet?.identities[id];
  const connected = state?.connected === true;
  const network: Network = state?.network ?? "baseSepolia";
  const address = demoAddress(id);
  const { target, setTarget } = useMovingFocus(wallet ? (connected ? "on" : "off") : "unread");

  // Each write re-reads the store, so another tab's change is never overwritten with a stale copy.
  const apply = (change: (w: DemoWallet) => DemoWallet) => {
    const ok = write(change(readWallet()));
    setFailed(!ok);
    return ok;
  };
  const connectAfterDelay = (who: "maker" | DemoBuyerId) => {
    if (busy) return;
    setBusy(who);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      apply((w) => walletConnect(w, who === "maker" ? makerId(w.account) : who));
      setBusy(null);
    }, TIMING.connect);
  };

  const footer = !wallet ? (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
      <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
        Close
      </Button>
    </div>
  ) : connected ? (
    <div className="flex w-full flex-wrap items-center justify-between gap-6">
      <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={() => apply((w) => walletDisconnect(w, makerId(w.account)))}>
        Disconnect
      </Button>
      <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
        Close
      </Button>
    </div>
  ) : (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
      <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
        Close
      </Button>
      <Button
        ref={setTarget}
        type="button"
        hierarchy="primary"
        size="lg"
        aria-disabled={busy === "maker" || undefined}
        aria-busy={busy === "maker" || undefined}
        className={cn(TAP, "aria-disabled:cursor-progress")}
        onClick={() => connectAfterDelay("maker")}
      >
        {busy === "maker" && <BusyMark />}
        {busy === "maker" ? "Connecting…" : "Connect demo wallet"}
      </Button>
    </div>
  );

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      initialFocus={target}
      title={
        <span className="flex flex-wrap items-center gap-[8px]">
          <span>Demo wallet</span>
          <TestnetDemoBadge />
        </span>
      }
      description="Test funds only. Nothing here is real money or on a real blockchain."
      footer={footer}
    >
      <div className="flex flex-col gap-[16px] text-sm text-text-secondary">
        {failed && (
          <div role="alert">
            <Banner tone="error">{WRITE_FAILED}</Banner>
          </div>
        )}

        {!wallet ? (
          <div aria-busy="true" className="flex flex-col gap-[8px]">
            <span className="sr-only">Reading the demo wallet…</span>
            <div aria-hidden className="h-[20px] w-2/3 rounded-md bg-bg-subtle" />
            <div aria-hidden className="h-[20px] w-1/2 rounded-md bg-bg-subtle" />
            <div aria-hidden className="h-[96px] rounded-lg bg-bg-subtle" />
          </div>
        ) : !connected ? (
          <p key="off" className={cn("leading-relaxed", FADE)}>
            Connect the demo wallet to mint, list or buy. It starts with test funds, and you can switch between three
            demo accounts.
          </p>
        ) : (
          <div key="on" className={cn("flex flex-col gap-[16px]", FADE)}>
            <p className="flex flex-wrap items-center gap-[6px] text-text-primary">
              <span aria-hidden className="inline-block size-[8px] rounded-full bg-bg-success" />
              <span className="font-semibold">Connected</span>
              <span>· {identityLabelOf(id)}</span>
            </p>

            <div className="flex items-center justify-between gap-[8px] rounded-lg bg-bg-surface-raised px-[12px] py-[6px]">
              <span className="min-w-0 text-text-secondary">
                Address{" "}
                <span title={address} className="font-medium text-text-primary tabular-nums">
                  <span aria-hidden>{shortAddress(address)}</span>
                  <span className="sr-only">{address}</span>
                </span>
              </span>
              <CopyButton
                label="Copy address"
                done={copied?.what === "address"}
                setRef={setTarget}
                onPress={() => copy("address", address, "Address copied")}
              />
            </div>

            <section className="flex flex-col gap-[6px]">
              <h3 id={accountLabelId} className={SECTION}>
                Account
              </h3>
              <RadioRows<AccountIndex>
                labelId={accountLabelId}
                value={account}
                options={DEMO_ACCOUNTS.map((a) => ({ value: a.index, label: accountRowOf(a.index, ctx) }))}
                onChoose={(a) => apply((w) => walletSwitchAccount(w, a))}
              />
            </section>

            <section className="flex flex-col gap-[6px]">
              <h3 id={networkLabelId} className={SECTION}>
                Network
              </h3>
              <RadioRows<Network>
                labelId={networkLabelId}
                value={network}
                options={NETWORKS.map((n) => ({ value: n.value, label: n.label }))}
                onChoose={(n) => apply((w) => walletSwitchNetwork(w, makerId(w.account), n))}
              />
            </section>

            <section className="flex flex-col gap-[4px]">
              <h3 className={SECTION}>Balance</h3>
              <p className="font-semibold text-text-primary tabular-nums">{balanceLineOf(id, network, ctx)}</p>
            </section>

            <section className="flex flex-col gap-[4px]">
              <h3 className={SECTION}>Recent</h3>
              <RecentList wallet={wallet} id={id} />
            </section>
          </div>
        )}

        {wallet && (
          <section aria-labelledby={buyersLabelId} className="flex flex-col gap-[8px] border-t border-solid border-border pt-[16px]">
            <h3 id={buyersLabelId} className="text-sm font-semibold text-text-primary">
              Demo buyers (for Explore marketplace)
            </h3>
            <ul className="flex flex-col gap-[6px]">
              {DEMO_BUYERS.map((b) => {
                const on = wallet.identities[b.id]?.connected === true;
                const rowBusy = busy === b.id;
                return (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-[8px]">
                    <span className="min-w-0 flex-1 text-text-primary tabular-nums">
                      {buyerRowOf(b.id, b.name, wallet, ctx)}
                      <span className="ml-[6px] text-xs text-text-tertiary">{on ? "· Connected" : "· Not connected"}</span>
                    </span>
                    <Button
                      type="button"
                      hierarchy="secondary"
                      size="md"
                      aria-label={
                        rowBusy ? `Connecting ${b.name}'s demo wallet` : `${on ? "Disconnect" : "Connect"} ${b.name}'s demo wallet`
                      }
                      aria-disabled={rowBusy || undefined}
                      aria-busy={rowBusy || undefined}
                      className={cn("min-h-[32px]", TAP, "aria-disabled:cursor-progress")}
                      onClick={() => {
                        if (rowBusy) return;
                        if (on) apply((w) => walletDisconnect(w, b.id));
                        else connectAfterDelay(b.id);
                      }}
                    >
                      {rowBusy && <BusyMark />}
                      {rowBusy ? "Connecting…" : on ? "Disconnect" : "Connect"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <p role="status" aria-live="polite" className="sr-only">
          {copied?.text ?? ""}
        </p>
      </div>
    </ModalFrame>
  );
}

function RecentList({ wallet, id }: { wallet: DemoWallet; id: IdentityId }) {
  const recent = recentOf(wallet, id);
  if (!recent.length) return <p>Nothing signed or paid yet.</p>;
  return (
    <ul className="flex flex-col gap-[4px]">
      {recent.map((a) => {
        const line = activityLineOf(a);
        return (
          <li key={a.id} className="text-text-primary">
            {line.text}
            {line.charge && <span className="tabular-nums text-text-secondary"> · {line.charge}</span>}
          </li>
        );
      })}
    </ul>
  );
}

// ── request mode (P2-MINT-3) ───────────────────────────────────────────

function RequestDialog({ wallet, market, actions, view }: WalletDialogProps & { view: RequestView }) {
  const { req, identity, phase, reason } = view;
  const copyText = requestCopy(phase, req, wallet, reason ?? undefined);
  const { target, setTarget } = useMovingFocus(phase);
  const { copied, copy } = useCopy();
  const alertId = React.useId();
  const headingId = React.useId();

  const now = useWalletClock();
  const ctx = { wallet, market, now };
  // errata 29: can-afford is read from the wallet AND the marketplace, not activity alone.
  const short = phase === "review" ? shortfallOf(req, identity, ctx) : null;
  const charge = phase === "review" ? chargeRowsOf(req) : null;

  const hasPrimary = phase !== "signing" && phase !== "pending";
  const heading = (text: string) => (
    <h3
      id={headingId}
      ref={hasPrimary ? undefined : setTarget}
      tabIndex={-1}
      className="text-md font-semibold text-text-primary outline-none"
    >
      {text}
    </h3>
  );

  const primary = (label: string, onPress: () => void, o: { busy?: boolean; unavailable?: boolean } = {}) => (
    <Button
      ref={setTarget}
      type="button"
      hierarchy="primary"
      size="lg"
      aria-disabled={o.busy || o.unavailable || undefined}
      aria-busy={o.busy || undefined}
      aria-describedby={o.unavailable ? alertId : undefined}
      className={cn(TAP, o.unavailable && "aria-disabled:cursor-not-allowed aria-disabled:opacity-60", o.busy && "aria-disabled:cursor-progress")}
      onClick={o.busy || o.unavailable ? undefined : onPress}
    >
      {o.busy && <BusyMark />}
      {label}
    </Button>
  );
  const secondary = (label: string, onPress: () => void) => (
    <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onPress}>
      {label}
    </Button>
  );

  let body: React.ReactNode;
  let footer: React.ReactNode = null;

  switch (phase) {
    case "connect":
    case "connecting":
      body = (
        <>
          {heading("Connect a wallet to continue.")}
          <p>{requestCopy("connect", req, wallet).body[0]}</p>
        </>
      );
      footer = (
        <>
          {secondary("Cancel", actions.cancel)}
          {phase === "connect"
            ? primary("Connect demo wallet", actions.connect)
            : primary("Connecting…", actions.connect, { busy: true })}
        </>
      );
      break;
    case "wrongNetwork":
    case "switching": {
      const sentence = requestCopy("wrongNetwork", req, wallet);
      body = heading(sentence.title);
      footer = (
        <>
          {secondary("Cancel", actions.cancel)}
          {phase === "wrongNetwork"
            ? primary(sentence.primary ?? `Switch to ${networkLabelOf(req.network)}`, actions.switchNetwork)
            : primary("Switching…", actions.switchNetwork, { busy: true })}
        </>
      );
      break;
    }
    case "review":
      body = (
        <>
          <h3 id={headingId} className="sr-only">
            Review
          </h3>
          <dl className="flex flex-col gap-[6px] rounded-lg bg-bg-surface-raised p-[12px]">
            {req.summary.map((r) => (
              <Row key={r.label} label={r.label} value={r.value} />
            ))}
          </dl>
          {req.kind === "signature" ? (
            <>
              <p className="text-text-primary">
                You pay now: <span className="font-semibold">Nothing</span>
              </p>
              {req.note && <p className="leading-relaxed">{req.note}</p>}
            </>
          ) : (
            <>
              {charge && (
                <dl className="flex flex-col gap-[6px]">
                  {charge.rows.map((r, i) => (
                    <Row key={`${r.label}-${i}`} label={r.label} value={r.value} note={r.note} />
                  ))}
                  <div aria-hidden className="h-[1px] bg-[var(--color-border-strong)]" />
                  <Row label="Total to pay now" value={charge.total} strong />
                </dl>
              )}
              {!short && (
                <p className="text-text-primary">
                  Balance after: <span className="font-semibold tabular-nums">{balanceAfterOf(req, identity, ctx)}</span>
                </p>
              )}
              {req.note && <p className="leading-relaxed">{req.note}</p>}
              {short && (
                <div id={alertId} role="alert">
                  <Banner tone="error">{short.text}</Banner>
                </div>
              )}
            </>
          )}
        </>
      );
      footer = (
        <>
          {secondary("Reject", actions.reject)}
          {short && view.canUseLazy && secondary("Use lazy mint instead", actions.useLazy)}
          {primary(req.kind === "signature" ? "Sign" : "Confirm and pay", actions.approve, { unavailable: !!short })}
        </>
      );
      break;
    case "signing":
      body = (
        <div className="flex items-center gap-[8px]">
          <span className="text-text-brand">
            <BusyMark />
          </span>
          {heading("Waiting for your signature…")}
        </div>
      );
      footer = secondary("Cancel", actions.cancel);
      break;
    case "pending":
      body = (
        <>
          {heading("Transaction submitted.")}
          <p>{copyText.body[0]}</p>
          {view.hash && (
            <HashLine
              label="Transaction"
              hash={view.hash}
              copied={copied?.what === "tx"}
              onCopy={() => copy("tx", view.hash!, "Transaction hash copied")}
            />
          )}
          <Indeterminate label={copyText.body[0]} />
          <p className="text-text-tertiary">{copyText.body[1]}</p>
        </>
      );
      break;
    case "confirmed":
      body = (
        <>
          {heading(copyText.title)}
          <p className="text-text-primary">{req.doneLine}</p>
          {view.proof?.txHash && (
            <HashLine
              label="Transaction"
              hash={view.proof.txHash}
              copied={copied?.what === "tx"}
              onCopy={() => copy("tx", view.proof!.txHash!, "Transaction hash copied")}
            />
          )}
        </>
      );
      footer = primary("Done", actions.done);
      break;
    case "rejected":
      body = (
        <>
          {heading(copyText.title)}
          <p>{copyText.body[0]}</p>
        </>
      );
      footer = (
        <>
          {secondary("Close", actions.cancel)}
          {primary("Try again", actions.retry)}
        </>
      );
      break;
    case "failed": {
      let line = copyText.body[0];
      if (reason === "insufficientFunds") {
        // errata 29: "you now have" from the full market, not activity alone.
        const now = shortfallOf(req, identity, ctx);
        if (now) line = balanceChangedLine(now);
      } else if ((reason === "recheck" || reason === "storageFailed") && view.message) {
        line = view.message;
      }
      body = (
        <div role="alert" className="flex flex-col gap-[8px]">
          {heading(copyText.title)}
          <p className="text-text-primary">{line}</p>
          <p>Nothing was charged.</p>
        </div>
      );
      footer = (
        <>
          {secondary("Close", actions.cancel)}
          {primary("Try again", actions.retry)}
        </>
      );
      break;
    }
  }

  return (
    <ModalFrame
      open
      onClose={actions.cancel}
      size="sm"
      initialFocus={target}
      title={req.title}
      footer={footer ? <div className="ml-auto flex flex-wrap items-center justify-end gap-6">{footer}</div> : undefined}
    >
      <div className="flex flex-col gap-[12px] text-sm text-text-secondary">
        <div className="flex flex-wrap items-center gap-[8px] rounded-lg bg-bg-surface-raised px-[12px] py-[8px]">
          <TestnetDemoBadge />
          <span className="min-w-0 break-words text-text-primary">{connectionLineOf(identity, wallet)}</span>
        </div>
        <div aria-live="polite" aria-labelledby={headingId}>
          <div key={phase} className={cn("flex flex-col gap-[12px]", FADE)}>
            {body}
          </div>
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {copied?.text ?? ""}
        </p>
      </div>
    </ModalFrame>
  );
}

function HashLine({ label, hash, copied, onCopy }: { label: string; hash: string; copied: boolean; onCopy: () => void }) {
  return (
    <p className="flex items-center justify-between gap-[8px] rounded-lg bg-bg-surface-raised px-[12px] py-[4px] text-text-primary">
      <span className="min-w-0">
        {label}{" "}
        <span title={hash} className="font-medium tabular-nums">
          <span aria-hidden>{shortAddress(hash)}</span>
          <span className="sr-only">{hash}</span>
        </span>
      </span>
      <CopyButton label={`Copy ${label.toLowerCase()} hash`} done={copied} onPress={onCopy} />
    </p>
  );
}

/** An indeterminate bar (no value: how long a confirmation takes isn't known). Still under reduced motion. */
function Indeterminate({ label }: { label: string }) {
  return (
    <div role="progressbar" aria-label={label} className="relative h-[8px] w-full overflow-hidden rounded-sm bg-bg-subtle">
      <div className="absolute inset-y-0 left-0 w-1/3 rounded-sm bg-bg-brand motion-safe:animate-[ix-wallet-bar_1.4s_ease-in-out_infinite]" />
      <style>{`@keyframes ix-wallet-bar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}
