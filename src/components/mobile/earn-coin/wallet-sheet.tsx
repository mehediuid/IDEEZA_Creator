"use client";

// The demo wallet's request, as a bottom sheet (Shared kit KIT-WS-01…05): the
// web's wallet popup (components/wallet/wallet-provider.tsx) is a centred
// dialog, and every mobile popup rises from the bottom, so the phone walks the
// same phases with the same rules and the same pure helpers
// (lib/wallet/request*.ts), in kit sheets. One sheet for every flow that signs
// or pays: mint, list, Buy now, bid, checkout, the presale, stake, claim.
//   connect (what the wallet is for in THIS request, never one fixed line) →
//   (wrong network → switch) → review (WS-01) → waiting for the signature →
//   submitted, confirming (WS-02) → confirmed: the sheet closes and the flow
//   shows its own success, or a toast (WS-05);
//   rejected (WS-03) and didn't go through (WS-04) say that nothing changed and
//   offer Try again.
// The review shows who pays and what it costs, with nothing left out: the
// wallet card (address, Connected, the account and network, its balance), the
// request's own rows, every charge row from the web's `chargeRowsOf` (an IDZ
// fee such as the instant mint's 4 IDZ included, the network fee with its
// "test ETH — no real cost" note), "Total to pay now" ("Nothing" for a
// signature) and "Balance after". The buttons are Sign / Confirm and pay, and
// Reject (the web's word).
// The wallet is read fresh at every step; a change of account, network or
// connection under the request ends it and says which ("Your wallet
// disconnected before it confirmed."); funds are checked at review, at
// Confirm and just before confirming; then the caller's `recheck` and
// `commit`, then the activity line (the debit or credit) is the last write.
// A request lives in this page's memory: while one is signing or confirming
// the browser asks before leaving, and if the page is reloaded (or the screen
// left) anyway, the next screen says the request was interrupted and nothing
// was charged.
//
// `useWalletSheet()` returns `request` and the `sheet` to render. Render the
// sheet where it outlives a wallet change (the screen, not a connected-only
// branch), or a disconnect unmounts it before it can say what happened.

import * as React from "react";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Banner } from "@/components/ideeza/banner";
import { Spinner } from "@/components/ideeza/spinner";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { useSecondClock } from "@/components/balance/use-second-clock";
import { persistWallet } from "@/components/wallet/wallet-provider";
import { estimateGas } from "@/lib/commerce/gas";
import type { Token } from "@/lib/brief/types";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import { cn } from "@/lib/utils";
import { balancesOf, type BalanceCtx } from "@/lib/wallet/balances";
import { demoAddress, pushActivity, readWallet, shortAddress, walletConnect, walletSwitchNetwork } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { TIMING, failureOf } from "@/lib/wallet/request";
import {
  activityOf,
  balanceAfterOf,
  balanceChangedLine,
  chargeRowsOf,
  demoSignatureOf,
  demoTxHashOf,
  identityLabelOf,
  networkLabelOf,
  proofOf,
  requestGateOf,
  requestIdentityOf,
  shortfallOf,
  testCoin,
} from "@/lib/wallet/request-view";
import type {
  Coin,
  DemoWallet,
  FailReason,
  IdentityId,
  RequestOptions,
  RequestPurpose,
  RequestResult,
  WalletRequest,
} from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { CopyChip } from "./parts";

type Phase = "connect" | "connecting" | "wrongNetwork" | "switching" | "review" | "signing" | "pending" | "rejected" | "failed";

type Flight = {
  req: WalletRequest;
  opts: RequestOptions;
  resolve: (r: RequestResult) => void;
  identity: IdentityId;
  before: DemoWallet | null;
  outcome: { reason: "rejected" | FailReason; message?: string } | null;
};

type View = {
  phase: Phase;
  req: WalletRequest;
  identity: IdentityId;
  reason: FailReason | null;
  message: string | null;
  /** The submitted transaction's hash, shown while it confirms. */
  hash: string | null;
};

/** Why a request didn't go through, in the web's words (lib/wallet/request.ts). */
export const FAIL_LINE: Record<FailReason, string> = {
  walletDisconnected: "Your wallet disconnected before it confirmed.",
  networkChanged: "Your wallet switched network before it confirmed.",
  accountChanged: "Your wallet switched account before it confirmed.",
  insufficientFunds: "Your balance changed before it confirmed.",
  storageFailed: "This browser couldn't save it — storage is full or blocked.",
  recheck: "It didn't go through.",
};

/** What the wallet is for in this request: the connect step's first sentence. */
const CONNECT_FOR: Record<RequestPurpose, string> = {
  lazyMint: "Your wallet signs the mint, so the project is minted as yours.",
  instantMint: "Your wallet pays the mint fee and signs the mint, so the project is minted as yours.",
  upgradeMint: "Your wallet pays the mint fee and signs the mint, so the project is minted as yours.",
  list: "Your wallet signs the listing, and its sales are paid to it.",
  editListing: "Your wallet signs the change to the listing.",
  removeListing: "Your wallet signs taking the listing down.",
  relist: "Your wallet signs the listing, and its sales are paid to it.",
  changePayout: "Your wallet signs the change.",
  purchase: "Your wallet pays for the purchase, and what you buy goes to it.",
  bid: "Your wallet places the bid and holds it while the auction runs.",
  createEditions: "Your wallet signs the copies, and their sales are paid to it.",
  listEdition: "Your wallet signs the listing, and its sales are paid to it.",
  buyCredits: "Your wallet pays for the credits.",
  subscribe: "Your wallet pays for the plan.",
  withdraw: "Your earnings are sent to your wallet.",
  payoutMethod: "Your wallet signs the withdrawal method.",
  buyIdz: "Your wallet pays for the purchase, and the IDZ you buy goes to it.",
  claimIdz: "The IDZ you claim goes to your wallet.",
  stakeIdz: "Your stake comes from your wallet, and its rewards go to it.",
  unstakeIdz: "The IDZ you withdraw goes back to your wallet.",
  claimStakeReward: "The rewards you claim go to your wallet.",
  claimReferral: "The rewards you claim go to your wallet.",
};

const DEMO_LINE = "This is the testnet demo wallet — test funds only, nothing is written to a real blockchain.";

/** The connect step's words for a request. */
export function connectLineOf(req: WalletRequest): string {
  return `${CONNECT_FOR[req.purpose]} ${DEMO_LINE}`;
}

const nonce = () => Math.random().toString(36).slice(2, 10);

// ── a request cut off by a reload ───────────────────────────────────────
// The request itself (its `commit`) can't outlive the page, so a reload ends
// it with nothing written. That must not pass in silence: the next wallet
// sheet to mount says so, once.

const INFLIGHT_KEY = "ideeza:m:wallet-inflight";
const INFLIGHT_MAX_AGE = 10 * 60_000;
/** Requests signing or confirming in this page load: a stored mark with none here was cut off. */
let liveFlights = 0;

function markInflight(req: WalletRequest) {
  try {
    sessionStorage.setItem(INFLIGHT_KEY, JSON.stringify({ title: req.title, at: Date.now() }));
  } catch {
    // Storage refused: the notice is lost, nothing else is.
  }
}

function clearInflight() {
  try {
    sessionStorage.removeItem(INFLIGHT_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The title of a request a reload cut off, read once; null when there is none. */
function takeInterrupted(): string | null {
  if (liveFlights > 0) return null;
  try {
    const raw = sessionStorage.getItem(INFLIGHT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(INFLIGHT_KEY);
    const v = JSON.parse(raw) as { title?: unknown; at?: unknown };
    if (typeof v.title !== "string" || typeof v.at !== "number" || Date.now() - v.at > INFLIGHT_MAX_AGE) return null;
    return v.title;
  } catch {
    return null;
  }
}

export function useWalletSheet() {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const now = useSecondClock();
  const toast = useToast();
  const [view, setView] = React.useState<View | null>(null);
  const [nudge, setNudge] = React.useState(0);
  const flight = React.useRef<Flight | null>(null);
  const timer = React.useRef<number | null>(null);
  /** True while this hook's request is counted in `liveFlights`. */
  const live = React.useRef(false);

  const clearTimer = React.useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  /** The request stopped signing or confirming. `cutOff`: its screen left mid-way, so the mark
   *  stays and the next wallet sheet to mount says it was interrupted. */
  const settle = React.useCallback((cutOff = false) => {
    if (!live.current) return;
    live.current = false;
    liveFlights = Math.max(0, liveFlights - 1);
    if (!cutOff) clearInflight();
  }, []);

  React.useEffect(
    () => () => {
      clearTimer();
      settle(true);
    },
    [clearTimer, settle],
  );

  // A reload cut a request off while it was signing or confirming: say so, once.
  React.useEffect(() => {
    const title = takeInterrupted();
    if (title) toast({ title: `“${title}” was interrupted before it confirmed. Nothing was charged.`, lead: "error" });
  }, [toast]);

  const show = React.useCallback((phase: Phase, extra: { reason?: FailReason; message?: string; hash?: string } = {}) => {
    const f = flight.current;
    if (!f) return;
    setView({ phase, req: f.req, identity: f.identity, reason: extra.reason ?? null, message: extra.message ?? null, hash: extra.hash ?? null });
  }, []);

  const later = React.useCallback(
    (ms: number, fn: () => void) => {
      clearTimer();
      const mine = flight.current;
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (flight.current === mine) fn();
      }, ms);
    },
    [clearTimer],
  );

  const end = React.useCallback(
    (result: RequestResult) => {
      const f = flight.current;
      flight.current = null;
      clearTimer();
      settle();
      setView(null);
      f?.resolve(result);
    },
    [clearTimer, settle],
  );

  const fail = React.useCallback(
    (reason: FailReason, message?: string) => {
      const f = flight.current;
      if (!f) return;
      clearTimer();
      settle();
      f.outcome = { reason, message };
      show("failed", { reason, message });
    },
    [clearTimer, settle, show],
  );

  const gate = React.useCallback(() => {
    const f = flight.current;
    if (!f) return;
    clearTimer();
    const w = readWallet();
    const g = requestGateOf(f.req, w);
    f.identity = requestIdentityOf(f.req, w);
    f.outcome = null;
    if (g === "accountChanged") return fail("accountChanged");
    if (g === "review") f.before = w;
    show(g);
  }, [clearTimer, fail, show]);

  const request = React.useCallback(
    (req: WalletRequest, opts: RequestOptions = {}): Promise<RequestResult> => {
      if (flight.current) return Promise.resolve({ ok: false, reason: "rejected", message: "Another wallet request is open." });
      return new Promise<RequestResult>((resolve) => {
        flight.current = { req, opts, resolve, identity: requestIdentityOf(req, readWallet()), before: null, outcome: null };
        gate();
      });
    },
    [gate],
  );

  const connect = () => {
    const f = flight.current;
    if (!f) return;
    show("connecting");
    later(TIMING.connect, () => {
      const w = readWallet();
      if (!persistWallet(walletConnect(w, requestIdentityOf(f.req, w)))) return fail("storageFailed");
      gate();
    });
  };

  const switchNetwork = () => {
    const f = flight.current;
    if (!f) return;
    show("switching");
    later(TIMING.switch, () => {
      const w = readWallet();
      if (!persistWallet(walletSwitchNetwork(w, requestIdentityOf(f.req, w), f.req.network))) return fail("storageFailed");
      gate();
    });
  };

  const finish = (hash: string) => {
    const f = flight.current;
    if (!f || !f.before) return;
    const now = readWallet();
    const failure = failureOf(f.before, now, f.identity);
    if (failure) return fail(failure);
    const short = shortfallOf(f.req, f.identity, { wallet: now, market: readMarketNow(), now: Date.now() });
    if (short) return fail("insufficientFunds", balanceChangedLine(short));
    const recheck = f.opts.recheck?.() ?? null;
    if (recheck) return fail("recheck", recheck);
    const proof = proofOf(f.req, f.identity, Date.now(), hash);
    let committed: ReturnType<NonNullable<RequestOptions["commit"]>>;
    try {
      committed = f.opts.commit ? f.opts.commit(proof) : { ok: true };
    } catch {
      committed = { ok: false, message: "" };
    }
    if (!committed.ok) return committed.conflict && committed.message ? fail("recheck", committed.message) : fail("storageFailed", committed.message || undefined);
    // The activity line — the debit or the credit — is the last write.
    if (!persistWallet(pushActivity(readWallet(), activityOf(f.req, proof, `act_${nonce()}`)))) return fail("storageFailed");
    end({ ok: true, proof });
  };

  const approve = () => {
    const f = flight.current;
    if (!f || !f.before) return;
    const now = readWallet();
    const failure = failureOf(f.before, now, f.identity);
    if (failure) return fail(failure);
    const short = shortfallOf(f.req, f.identity, { wallet: now, market: readMarketNow(), now: Date.now() });
    if (short) return fail("insufficientFunds", balanceChangedLine(short));
    const seed = `${f.identity}:${f.req.purpose}:${Date.now()}:${nonce()}`;
    if (!live.current) {
      live.current = true;
      liveFlights += 1;
    }
    markInflight(f.req);
    setNudge(0);
    show("signing");
    if (f.req.kind === "signature") {
      later(TIMING.sign, () => finish(demoSignatureOf(seed)));
      return;
    }
    // Signed in the wallet, then submitted: it can't be cancelled while it confirms.
    later(TIMING.sign, () => {
      const hash = demoTxHashOf(seed);
      show("pending", { hash });
      later(TIMING.confirm, () => finish(hash));
    });
  };

  const reject = () => {
    const f = flight.current;
    if (!f) return;
    clearTimer();
    settle();
    f.outcome = { reason: "rejected" };
    show("rejected");
  };

  /** ✕, the scrim, Escape and Close, by phase. */
  const dismiss = () => {
    const f = flight.current;
    if (!view || !f) return;
    switch (view.phase) {
      case "pending":
        // A submitted transaction can't be left: the line says so again, aloud.
        return setNudge((n) => n + 1);
      case "review":
      case "signing":
        return reject();
      case "rejected":
      case "failed":
        return end(f.outcome ? { ok: false, reason: f.outcome.reason, message: f.outcome.message } : { ok: false, reason: "rejected" });
      default:
        return end({ ok: false, reason: "rejected" });
    }
  };

  // A wallet change under the request (disconnected, another network or account) ends it and says which.
  React.useEffect(() => {
    if (!view || (view.phase !== "review" && view.phase !== "signing" && view.phase !== "pending") || !wallet) return;
    const f = flight.current;
    if (!f?.before) return;
    const failure = failureOf(f.before, wallet, f.identity);
    if (failure) fail(failure);
  }, [wallet, view, fail]);

  // While it signs or confirms, the browser asks before the page is left or reloaded.
  const guarding = view?.phase === "signing" || view?.phase === "pending";
  React.useEffect(() => {
    if (!guarding) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [guarding]);

  const ctx: BalanceCtx = { wallet, market, now };
  const short = view && (view.phase === "review" || view.phase === "signing") && wallet ? shortfallOf(view.req, view.identity, ctx) : null;

  const sheet = view ? (
    <RequestSheet
      view={view}
      wallet={wallet}
      ctx={ctx}
      short={short?.text ?? null}
      nudge={nudge}
      onClose={dismiss}
      actions={{ connect, switchNetwork, approve, retry: gate, close: dismiss }}
    />
  ) : null;

  return { request, sheet, busy: view !== null };
}

// ── the sheet ───────────────────────────────────────────────────────────

type Row = { label: string; value: string; note?: string; strong?: boolean };

/** Info rows, 44 tall (KIT-WS-01): the label, then the value at the end with its note under it. */
function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="flex flex-col">
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`} className="flex min-h-[44px] items-start justify-between gap-8 py-6">
          <dt className={cn(r.strong ? T.name : T.body, "shrink-0")}>{r.label}</dt>
          <dd className="flex min-w-0 flex-col items-end text-right">
            <span className={cn(r.strong ? T.name : T.body, "tabular-nums text-text-primary")}>{r.value}</span>
            {r.note && <span className={T.meta}>{r.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** "2,000 IDZ · 0.5 test ETH": what the signer holds on the request's network — IDZ for a maker
 *  (or when IDZ is charged), the network's own coin, and any other coin the request charges. */
function balanceOf(req: WalletRequest, identity: IdentityId, ctx: BalanceCtx): string {
  const bal = balancesOf(identity, ctx, { releasing: req.releases });
  const native = estimateGas(req.network).native;
  const charged: Coin[] = req.kind === "transaction" && req.charge ? req.charge.lines.map((l) => l.coin) : [];
  const coins: Coin[] = [];
  if (identity.startsWith("maker-") || charged.includes("IDZ")) coins.push("IDZ");
  for (const c of [native, ...charged]) if (!coins.includes(c)) coins.push(c);
  return coins.map((c) => (c === "IDZ" ? formatAmount(bal.idz, "IDZ") : testCoin(bal.native[req.network]?.[c as Token] ?? "0", c))).join(" · ");
}

/** Who signs and pays: the address, Connected, the account and its network, the balance (Figma 13c, 23b). */
function WalletCard({ req, identity, wallet, ctx }: { req: WalletRequest; identity: IdentityId; wallet: DemoWallet | undefined; ctx: BalanceCtx }) {
  const state = wallet?.identities[identity];
  const address = demoAddress(identity);
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-bg-subtle p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className={cn(T.name, "tabular-nums")}>
          <span aria-hidden>{shortAddress(address)}</span>
          <span className="sr-only">Wallet {address}</span>
        </span>
        <span className="flex items-center gap-3">
          <TestnetDemoBadge />
          <Badge tone={state?.connected ? "success" : "neutral"}>{state?.connected ? "Connected" : "Not connected"}</Badge>
        </span>
      </div>
      <p className={T.meta}>
        {identityLabelOf(identity)} · {networkLabelOf(state?.network ?? req.network)}
      </p>
      <p className={cn(T.meta, "tabular-nums")}>
        Balance · <span className="text-text-primary">{balanceOf(req, identity, ctx)}</span>
      </p>
    </div>
  );
}

/** The request's own rows, every charge row, the total, and what is left after. */
function reviewRowsOf(req: WalletRequest, identity: IdentityId, ctx: BalanceCtx, short: boolean): Row[] {
  const rows: Row[] = req.summary.map((r) => ({ label: r.label, value: r.value }));
  const charge = chargeRowsOf(req);
  if (!charge) return [...rows, { label: "Total to pay now", value: "Nothing", strong: true }];
  rows.push(...charge.rows);
  rows.push({ label: "Total to pay now", value: charge.total, strong: true });
  const after = short ? null : balanceAfterOf(req, identity, ctx);
  if (after) rows.push({ label: "Balance after", value: after });
  return rows;
}

function RequestSheet({
  view,
  wallet,
  ctx,
  short,
  nudge,
  onClose,
  actions,
}: {
  view: View;
  wallet: DemoWallet | undefined;
  ctx: BalanceCtx;
  short: string | null;
  /** Taps on the scrim while a submitted transaction confirms. */
  nudge: number;
  onClose: () => void;
  actions: { connect: () => void; switchNetwork: () => void; approve: () => void; retry: () => void; close: () => void };
}) {
  const { req, phase, identity } = view;
  const target = networkLabelOf(req.network);
  const xl = "w-full";
  const risk = req.note ? <p className={T.meta}>{req.note}</p> : null;

  if (phase === "connect" || phase === "connecting") {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Connect your wallet"
        description={connectLineOf(req)}
        actions={
          <>
            <Button size="xl" className={xl} loading={phase === "connecting"} onClick={actions.connect}>
              {phase === "connecting" ? "Connecting…" : "Connect demo wallet"}
            </Button>
          </>
        }
      />
    );
  }

  if (phase === "wrongNetwork" || phase === "switching") {
    const on = networkLabelOf(wallet?.identities[identity]?.network ?? req.network);
    return (
      <Sheet
        open
        onClose={onClose}
        title="Switch network"
        description={`Your wallet is on ${on}. This is on ${target}.`}
        actions={
          <>
            <Button size="xl" className={xl} loading={phase === "switching"} onClick={actions.switchNetwork}>
              {phase === "switching" ? "Switching…" : `Switch to ${target}`}
            </Button>
          </>
        }
      />
    );
  }

  if (phase === "pending") {
    const keep = "A submitted transaction can’t be cancelled. Keep this screen open until it confirms.";
    return (
      <Sheet open onClose={onClose} hideClose title="Transaction submitted" description={`Waiting for confirmation on ${target}…`}>
        <div className="flex flex-col items-center gap-6 py-4 text-center">
          <span role="status" aria-label={`Confirming on ${target}`}>
            <Spinner size={32} />
          </span>
          {view.hash && (
            <p className={cn(T.body, "flex flex-wrap items-center justify-center gap-3")}>
              Transaction
              <CopyChip value={view.hash} what="Transaction hash" />
            </p>
          )}
          {nudge > 0 ? (
            <p key={nudge} role="alert" className={T.rowTitle}>
              {keep}
            </p>
          ) : (
            <p className={T.body}>{keep}</p>
          )}
        </div>
      </Sheet>
    );
  }

  if (phase === "rejected" || phase === "failed") {
    const line = phase === "failed" ? (view.message ?? (view.reason ? FAIL_LINE[view.reason] : FAIL_LINE.recheck)) : null;
    return (
      <Sheet
        open
        onClose={onClose}
        title={phase === "rejected" ? "Request rejected" : "That didn’t go through"}
        description={
          phase === "rejected" ? "You rejected it in your wallet. Nothing was signed or charged." : <span role="alert">{`${line} Nothing was charged.`}</span>
        }
        actions={
          <>
            {!(phase === "failed" && view.reason === "recheck") && (
              <Button size="xl" className={xl} onClick={actions.retry}>
                Try again
              </Button>
            )}
            <Button hierarchy="secondary" size="xl" className={xl} onClick={actions.close}>
              Close
            </Button>
          </>
        }
      >
        <Rows rows={reviewRowsOf(req, identity, ctx, true)} />
        {risk}
      </Sheet>
    );
  }

  // Review, and waiting for the signature: the same sheet, so what is being signed stays in view.
  const signing = phase === "signing";
  return (
    <Sheet
      open
      onClose={onClose}
      title={req.title}
      description="Demo wallet · test funds only, nothing real is spent."
      actions={
        <>
          <Button size="xl" className={xl} disabled={!!short && !signing} loading={signing} onClick={signing ? undefined : actions.approve}>
            {signing ? "Waiting for your signature…" : req.kind === "signature" ? "Sign" : "Confirm and pay"}
          </Button>
          <Button hierarchy="secondary" size="xl" className={xl} onClick={onClose}>
            {signing ? "Cancel" : "Reject"}
          </Button>
        </>
      }
    >
      <WalletCard req={req} identity={identity} wallet={wallet} ctx={ctx} />
      <Rows rows={reviewRowsOf(req, identity, ctx, !!short)} />
      {short && (
        <div role="alert">
          <Banner tone="error">{short}</Banner>
        </div>
      )}
      {risk}
    </Sheet>
  );
}
