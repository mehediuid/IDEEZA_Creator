"use client";

// The one wallet popup (Phase 2 spec §3.6.2, §3.9; P2-MINT-2, P2-MINT-3).
//
// `useWalletRequest().request(req, opts)` opens the Demo wallet dialog in
// request mode and walks MINT-3's phases:
//   connect → connecting → (wrongNetwork → switching) → review
//   → signing (a signature) | pending (a transaction) → confirmed
// with rejected and failed reachable from review onwards, and "Try again"
// running the gate from the top.
//
// The rules the phases keep:
// - The wallet is read fresh at every step (`readWallet`), never from a
//   render: another tab may have written it.
// - `before` is the wallet at review. At Confirm, and again just before
//   confirming, `failureOf(before, now)` ends the request if the signer
//   disconnected, switched network or switched account; a `storage` event
//   during signing or pending ends it at once.
// - Funds are re-checked at Confirm and just before confirming, from the
//   wallet AND the marketplace (errata 29).
// - Then `opts.recheck` (a string fails the request with that copy), then
//   `opts.commit(proof)` — the caller's writes, in order. A commit that
//   refuses or throws becomes `failed` / `storageFailed`, and nothing else is
//   written. Only then is the wallet's activity line (the debit) written:
//   the LAST write (§3.9).
// - `request()` resolves at `confirmed` ({ ok: true, proof }), so the caller
//   moves on behind the dialog, which stays open on Done. A rejected or
//   failed request resolves when the dialog is closed, with its reason, so
//   "Try again" inside the dialog continues the same request.
// - Closing at review (Escape, the scrim, ✕) is Reject. Pending can't be
//   closed. Cancel before review closes the dialog: `rejected`.
// - "Use lazy mint instead" closes the dialog, resolves `rejected`, and then
//   calls `opts.onUseLazy()` synchronously — before the caller's `await`
//   continues — so the caller can tell a switch from a plain reject.
//
// Nothing transient is stored (MINT D6): a tab closed before confirmed means
// nothing happened.

import * as React from "react";
import { reportWrite } from "@/lib/storage-status";
import { useMarket, readMarketNow } from "@/lib/market/market-store";
import {
  DEMO_WALLET_KEY,
  pushActivity,
  readWallet,
  walletConnect,
  walletSwitchNetwork,
} from "@/lib/wallet/demo-wallet";
import { failureOf, TIMING } from "@/lib/wallet/request";
import {
  activityOf,
  demoSignatureOf,
  demoTxHashOf,
  proofOf,
  requestGateOf,
  requestIdentityOf,
  shortfallOf,
} from "@/lib/wallet/request-view";
import type {
  DemoWallet,
  FailReason,
  IdentityId,
  Proof,
  RequestOptions,
  RequestPhase,
  RequestResult,
  WalletRequest,
} from "@/lib/wallet/types";
import { useDemoWallet, writeDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { WalletDialog, type RequestView } from "./wallet-dialog";

export type WalletRequestApi = {
  /** Opens the dialog for one signature or transaction (§3.9). */
  request: (req: WalletRequest, opts?: RequestOptions) => Promise<RequestResult>;
  /** Opens the Demo wallet dialog (P2-MINT-2): connect, account, network, demo buyers. */
  openManage: () => void;
};

const WalletContext = React.createContext<WalletRequestApi | null>(null);

/** Every wallet write, reported (COR-93). `false`: the browser refused it, and the prior state stands. */
export function persistWallet(next: DemoWallet): boolean {
  const ok = writeDemoWallet(next);
  reportWrite(DEMO_WALLET_KEY, ok);
  return ok;
}

type Flight = {
  seq: number;
  req: WalletRequest;
  opts: RequestOptions;
  resolve: (r: RequestResult) => void;
  settled: boolean;
  identity: IdentityId;
  /** The wallet as review saw it; failureOf compares against it. */
  before: DemoWallet | null;
  /** Why the request stands at rejected/failed — what closing it resolves with. */
  outcome: { reason: "rejected" | FailReason; message?: string } | null;
};

type Screen =
  | { mode: "closed" }
  | { mode: "manage" }
  | {
      mode: "request";
      req: WalletRequest;
      canUseLazy: boolean;
      phase: RequestPhase;
      identity: IdentityId;
      reason: FailReason | null;
      message: string | null;
      hash: string | null;
      proof: Proof | null;
    };

const BUSY_WATCH: readonly RequestPhase[] = ["signing", "pending"];

function nonce(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const [screen, setScreen] = React.useState<Screen>({ mode: "closed" });
  const flight = React.useRef<Flight | null>(null);
  const timer = React.useRef<number | null>(null);
  const seq = React.useRef(0);

  const clearTimer = React.useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  React.useEffect(() => clearTimer, [clearTimer]);

  const show = React.useCallback(
    (
      phase: RequestPhase,
      extra: Partial<Omit<Extract<Screen, { mode: "request" }>, "mode" | "phase" | "req" | "canUseLazy">> = {},
    ) => {
      const f = flight.current;
      if (!f) return;
      setScreen({
        mode: "request",
        req: f.req,
        canUseLazy: typeof f.opts.onUseLazy === "function",
        phase,
        identity: extra.identity ?? f.identity,
        reason: extra.reason ?? null,
        message: extra.message ?? null,
        hash: extra.hash ?? null,
        proof: extra.proof ?? null,
      });
    },
    [],
  );

  /** Runs `fn` after `ms`, unless the flight moved on meanwhile. */
  const later = React.useCallback(
    (ms: number, fn: () => void) => {
      clearTimer();
      const mine = flight.current?.seq;
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (flight.current && flight.current.seq === mine) fn();
      }, ms);
    },
    [clearTimer],
  );

  const fail = React.useCallback(
    (reason: FailReason, message?: string) => {
      const f = flight.current;
      if (!f) return;
      clearTimer();
      f.outcome = { reason, message };
      show("failed", { reason, message: message ?? null });
    },
    [clearTimer, show],
  );

  /** Decides the phase from the wallet as it is now (the top of the flow; "Try again" too). */
  const gate = React.useCallback(() => {
    const f = flight.current;
    if (!f) return;
    clearTimer();
    const w = readWallet();
    const g = requestGateOf(f.req, w);
    f.identity = requestIdentityOf(f.req, w);
    f.outcome = null;
    if (g === "accountChanged") {
      fail("accountChanged");
      return;
    }
    if (g === "review") f.before = w;
    show(g, { identity: f.identity });
  }, [clearTimer, fail, show]);

  const close = React.useCallback(() => {
    clearTimer();
    setScreen({ mode: "closed" });
  }, [clearTimer]);

  /** Closes the dialog and resolves an unsettled request with `result`. */
  const end = React.useCallback(
    (result: RequestResult) => {
      const f = flight.current;
      flight.current = null;
      close();
      if (f && !f.settled) {
        f.settled = true;
        f.resolve(result);
      }
    },
    [close],
  );

  const request = React.useCallback(
    (req: WalletRequest, opts: RequestOptions = {}): Promise<RequestResult> => {
      const busy = flight.current;
      if (busy && !busy.settled) {
        return Promise.resolve({ ok: false, reason: "rejected", message: "Another wallet request is open." });
      }
      return new Promise<RequestResult>((resolve) => {
        seq.current += 1;
        flight.current = {
          seq: seq.current,
          req,
          opts,
          resolve,
          settled: false,
          identity: requestIdentityOf(req, readWallet()),
          before: null,
          outcome: null,
        };
        gate();
      });
    },
    [gate],
  );

  const openManage = React.useCallback(() => {
    const f = flight.current;
    if (f && !f.settled) return; // a request is in hand; the dialog is already open
    flight.current = null;
    setScreen({ mode: "manage" });
  }, []);

  // ── request-mode actions ──

  const connect = React.useCallback(() => {
    const f = flight.current;
    if (!f) return;
    show("connecting");
    later(TIMING.connect, () => {
      const w = readWallet();
      if (!persistWallet(walletConnect(w, requestIdentityOf(f.req, w)))) {
        fail("storageFailed");
        return;
      }
      gate();
    });
  }, [fail, gate, later, show]);

  const switchNetwork = React.useCallback(() => {
    const f = flight.current;
    if (!f) return;
    show("switching");
    later(TIMING.switch, () => {
      const w = readWallet();
      if (!persistWallet(walletSwitchNetwork(w, requestIdentityOf(f.req, w), f.req.network))) {
        fail("storageFailed");
        return;
      }
      gate();
    });
  }, [fail, gate, later, show]);

  /** The last checks, the caller's writes, the debit — then confirmed. */
  const finish = React.useCallback(
    (hash: string) => {
      const f = flight.current;
      if (!f || !f.before) return;
      const now = readWallet();
      const failure = failureOf(f.before, now, f.identity);
      if (failure) return fail(failure);
      if (shortfallOf(f.req, f.identity, { wallet: now, market: readMarketNow(), now: Date.now() })) {
        return fail("insufficientFunds");
      }
      const recheck = f.opts.recheck?.() ?? null;
      if (recheck) return fail("recheck", recheck);
      const proof = proofOf(f.req, f.identity, Date.now(), hash);
      let committed: { ok: true } | { ok: false; message: string };
      try {
        committed = f.opts.commit ? f.opts.commit(proof) : { ok: true };
      } catch {
        committed = { ok: false, message: "" };
      }
      if (!committed.ok) return fail("storageFailed", committed.message || undefined);
      // The debit and its activity line: the last write.
      persistWallet(pushActivity(readWallet(), activityOf(f.req, proof, `act_${nonce()}`)));
      f.settled = true;
      f.outcome = null;
      show("confirmed", { proof, hash: proof.txHash ?? null });
      f.resolve({ ok: true, proof });
    },
    [fail, show],
  );

  /** Sign / Confirm and pay. */
  const approve = React.useCallback(() => {
    const f = flight.current;
    if (!f || !f.before) return;
    const now = readWallet();
    const failure = failureOf(f.before, now, f.identity);
    if (failure) return fail(failure);
    if (shortfallOf(f.req, f.identity, { wallet: now, market: readMarketNow(), now: Date.now() })) {
      return fail("insufficientFunds");
    }
    const seed = `${f.identity}:${f.req.purpose}:${Date.now()}:${nonce()}`;
    if (f.req.kind === "signature") {
      const signature = demoSignatureOf(seed);
      show("signing");
      later(TIMING.sign, () => finish(signature));
      return;
    }
    const txHash = demoTxHashOf(seed);
    show("pending", { hash: txHash });
    later(TIMING.confirm, () => finish(txHash));
  }, [fail, finish, later, show]);

  const reject = React.useCallback(() => {
    const f = flight.current;
    if (!f) return;
    clearTimer();
    f.outcome = { reason: "rejected" };
    show("rejected");
  }, [clearTimer, show]);

  /** Close, ✕, Escape, the scrim and Cancel, by phase (MINT-3's rules). */
  const dismiss = React.useCallback(() => {
    const f = flight.current;
    if (screen.mode !== "request" || !f) {
      close();
      return;
    }
    switch (screen.phase) {
      case "pending":
        return; // a submitted transaction can't be cancelled
      case "review":
      case "signing":
        return reject();
      case "confirmed":
        flight.current = null;
        return close();
      case "rejected":
      case "failed":
        return end(
          f.outcome
            ? { ok: false, reason: f.outcome.reason, message: f.outcome.message }
            : { ok: false, reason: "rejected" },
        );
      default:
        return end({ ok: false, reason: "rejected" });
    }
  }, [close, end, reject, screen]);

  const switchToLazy = React.useCallback(() => {
    const onUseLazy = flight.current?.opts.onUseLazy;
    end({ ok: false, reason: "rejected" });
    onUseLazy?.();
  }, [end]);

  // A wallet change during signing or pending ends the request (MINT-3).
  React.useEffect(() => {
    if (screen.mode !== "request" || !BUSY_WATCH.includes(screen.phase) || !wallet) return;
    const f = flight.current;
    if (!f?.before) return;
    const failure = failureOf(f.before, wallet, f.identity);
    if (failure) fail(failure);
  }, [wallet, screen, fail]);

  const api = React.useMemo<WalletRequestApi>(() => ({ request, openManage }), [request, openManage]);

  const view: RequestView | null =
    screen.mode === "request"
      ? {
          req: screen.req,
          identity: screen.identity,
          phase: screen.phase,
          reason: screen.reason,
          message: screen.message,
          hash: screen.hash,
          proof: screen.proof,
          canUseLazy: screen.canUseLazy,
        }
      : null;

  return (
    <WalletContext.Provider value={api}>
      {children}
      <WalletDialog
        open={screen.mode !== "closed"}
        mode={screen.mode === "request" ? "request" : "manage"}
        wallet={wallet}
        market={market}
        write={persistWallet}
        onClose={dismiss}
        request={view}
        actions={{ connect, switchNetwork, approve, reject, retry: gate, cancel: dismiss, useLazy: switchToLazy, done: dismiss }}
      />
    </WalletContext.Provider>
  );
}

export function useWalletRequest(): WalletRequestApi {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWalletRequest must be used inside <WalletProvider>");
  return ctx;
}
