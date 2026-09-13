"use client";

// CreditsProvider — the user's local credits ledger. A full-product
// build (3D + PCB + firmware) costs BUILD_COST credits; exploring and
// refining concepts in chat stays free. There is no backend yet, so
// this is a local balance the user can top up for free — see
// describeEntry's "topup" line, which says so plainly.
//
// Charging and refunding are keyed by buildId and idempotent: a given
// build can only be charged once, and only a charged build can be
// refunded, only once. That lets callers (the build orchestrator) call
// charge/refund freely on retries/re-renders without double-counting.
//
// Persists to localStorage; follows the hydrate/persist pattern of
// plan.tsx exactly (hydrate once, persist post-hydration).

import * as React from "react";

export const BUILD_COST = 4;

export type CreditEntry = {
  id: string;
  delta: number;
  reason: "seed" | "build" | "refund" | "topup";
  buildId?: string;
  ts: number;
};

export type CreditsState = {
  balance: number;
  ledger: CreditEntry[];
};

const STORAGE_KEY = "ideeza:create:credits";
const SEED_BALANCE = 8;
const TOP_UP_AMOUNT = 10;

// Safe placeholder for the pre-hydration render only — never shown,
// since both QuotaCard's and CreditsCard's convention is to render a
// hidden shell until `hydrated` is true.
const DEFAULT_STATE: CreditsState = { balance: 0, ledger: [] };

function makeId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function seedState(): CreditsState {
  return {
    balance: SEED_BALANCE,
    ledger: [
      { id: makeId(), delta: SEED_BALANCE, reason: "seed", ts: Date.now() },
    ],
  };
}

function loadStored(): CreditsState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as Partial<CreditsState>;
    if (typeof parsed.balance !== "number" || !Array.isArray(parsed.ledger)) {
      return seedState();
    }
    return { balance: parsed.balance, ledger: parsed.ledger };
  } catch {
    return seedState();
  }
}

// ─────────────────────── pure helpers (testable) ────────────────────

// Appends an entry and applies its delta to the balance. The one place
// that mutates a CreditsState — chargeState/refundState/topUpState all
// route through it so balance and ledger can never drift apart.
export function applyEntry(
  state: CreditsState,
  entry: CreditEntry,
): CreditsState {
  return {
    balance: state.balance + entry.delta,
    ledger: [...state.ledger, entry],
  };
}

// Charges `cost` (default BUILD_COST) credits for `buildId`. Idempotent:
// a buildId already charged returns the state unchanged with ok:true
// (it IS charged — callers don't need to distinguish "just now" from
// "already"). Returns ok:false, state unchanged, when the balance can't
// cover the cost.
export function chargeState(
  state: CreditsState,
  buildId: string,
  cost: number = BUILD_COST,
): { state: CreditsState; ok: boolean } {
  const alreadyCharged = state.ledger.some(
    (e) => e.reason === "build" && e.buildId === buildId,
  );
  if (alreadyCharged) return { state, ok: true };
  if (state.balance < cost) return { state, ok: false };
  const entry: CreditEntry = {
    id: makeId(),
    delta: -cost,
    reason: "build",
    buildId,
    ts: Date.now(),
  };
  return { state: applyEntry(state, entry), ok: true };
}

// Refunds the charge for `buildId` — used when a full build fails for a
// system reason. ok:true exactly once per charged buildId: false when
// there was no charge to refund, or it was already refunded.
export function refundState(
  state: CreditsState,
  buildId: string,
): { state: CreditsState; ok: boolean } {
  const charge = state.ledger.find(
    (e) => e.reason === "build" && e.buildId === buildId,
  );
  if (!charge) return { state, ok: false };
  const alreadyRefunded = state.ledger.some(
    (e) => e.reason === "refund" && e.buildId === buildId,
  );
  if (alreadyRefunded) return { state, ok: false };
  const entry: CreditEntry = {
    id: makeId(),
    delta: -charge.delta,
    reason: "refund",
    buildId,
    ts: Date.now(),
  };
  return { state: applyEntry(state, entry), ok: true };
}

// Adds credits with no charge behind them — there's no payment
// integration, so every call site that offers this must say so (see
// describeEntry's "topup" line and the CreditsCard copy).
export function topUpState(state: CreditsState, n: number): CreditsState {
  return applyEntry(state, {
    id: makeId(),
    delta: n,
    reason: "topup",
    ts: Date.now(),
  });
}

// One-line description of a ledger entry for display (CreditsCard).
export function describeEntry(entry: CreditEntry): string {
  const sign = entry.delta >= 0 ? "+" : "−"; // U+2212 minus sign
  const amount = Math.abs(entry.delta);
  switch (entry.reason) {
    case "seed":
      return `${sign}${amount} Starting balance`;
    case "topup":
      return `${sign}${amount} Top up`;
    case "build":
      return `${sign}${amount} Build${entry.buildId ? ` · ${entry.buildId}` : ""}`;
    case "refund":
      return `${sign}${amount} Refund${entry.buildId ? ` · ${entry.buildId}` : ""}`;
  }
}

// ───────────────────────────── provider ─────────────────────────────

type Ctx = {
  hydrated: boolean;
  balance: number;
  ledger: CreditEntry[];
  canAfford: (cost?: number) => boolean;
  charge: (buildId: string, cost?: number) => boolean;
  refund: (buildId: string) => boolean;
  topUp: (n: number) => void;
};

const CreditsContext = React.createContext<Ctx | null>(null);

export function CreditsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<CreditsState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = React.useState(false);
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Hydrate once.
  React.useEffect(() => {
    setState(loadStored());
    setHydrated(true);
  }, []);

  // Persist on change post-hydration.
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  const canAfford = React.useCallback(
    (cost: number = BUILD_COST) => stateRef.current.balance >= cost,
    [],
  );

  const charge = React.useCallback(
    (buildId: string, cost: number = BUILD_COST) => {
      let ok = false;
      setState((prev) => {
        const result = chargeState(prev, buildId, cost);
        ok = result.ok;
        return result.state;
      });
      return ok;
    },
    [],
  );

  const refund = React.useCallback((buildId: string) => {
    let ok = false;
    setState((prev) => {
      const result = refundState(prev, buildId);
      ok = result.ok;
      return result.state;
    });
    return ok;
  }, []);

  const topUp = React.useCallback((n: number) => {
    setState((prev) => topUpState(prev, n));
  }, []);

  const value: Ctx = {
    hydrated,
    balance: state.balance,
    ledger: state.ledger,
    canAfford,
    charge,
    refund,
    topUp,
  };

  return (
    <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>
  );
}

export function useCredits(): Ctx {
  const ctx = React.useContext(CreditsContext);
  if (!ctx) {
    throw new Error("useCredits must be used inside <CreditsProvider>");
  }
  return ctx;
}

// Exported for the Top-up affordance's copy — kept here so the amount
// can't drift from what topUp() actually adds.
export const TOP_UP_CREDITS = TOP_UP_AMOUNT;
