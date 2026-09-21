"use client";

// CreditsProvider — the user's local credits ledger. A full-product
// build (3D + PCB + firmware) costs BUILD_COST credits, and every
// concept render — the first draft, a refine and a regenerate alike —
// costs CONCEPT_COST. Charging refines alone would have left the
// loophole open: regenerate runs the same model for the same money, so
// anyone avoiding the charge would just press that instead. There is no
// backend yet, so
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
/** What one concept render costs — first draft, refine or regenerate. */
export const CONCEPT_COST = 1;

/** Part 4 §4.4.6 — what a companion selection will cost, recomputed live
 *  as the selection changes.
 *
 *  `toRender` counts only the companions that still need a concept: the
 *  primary is already rendered and paid for, and a companion whose
 *  concept exists has been paid for too (§4.8 — deselecting keeps the
 *  concept, so re-selecting must not charge again).
 *
 *  The word *estimated* is load-bearing in the spec: refine and
 *  regenerate counts cannot be known ahead, so this is the floor — what
 *  the selection costs if nothing is refined. */
export type CostEstimate = {
  concepts: number;
  conceptCost: number;
  buildCost: number;
  total: number;
};

export function estimateFor(toRender: number): CostEstimate {
  const concepts = Math.max(0, Math.trunc(toRender));
  const conceptCost = concepts * CONCEPT_COST;
  return {
    concepts,
    conceptCost,
    buildCost: BUILD_COST,
    total: conceptCost + BUILD_COST,
  };
}

/** The two debit reasons, as against `seed` / `topup` / `refund`. A charge
 *  and its refund are matched by id, so both kinds refund the same way. */
export type ChargeReason = "build" | "concept";
export type CreditEntry = {
  id: string;
  delta: number;
  reason: ChargeReason | "seed" | "refund" | "topup";
  /** What was charged: a build id, or a concept turn id. The field keeps
   *  its name because ledgers are already stored under it. */
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
    if (
      typeof parsed.balance !== "number" ||
      Number.isNaN(parsed.balance) ||
      !Array.isArray(parsed.ledger)
    ) {
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

// Number of open (not-yet-refunded) charges for `buildId`: the count of
// "build" ledger entries minus the count of "refund" ledger entries. A
// build can be charged again once every prior charge on it has been
// refunded — this is what lets charge -> refund -> charge deduct twice
// while charge -> charge and refund -> refund each stay a no-op.
//
// Exported because it is also the evidence the build orchestrator writes
// its credit flags from: the ledger says whether money moved, not a flag
// that was set beside it.
export function openCharges(ledger: CreditEntry[], buildId: string): number {
  let open = 0;
  for (const e of ledger) {
    if (e.buildId !== buildId) continue;
    if (e.reason === "build" || e.reason === "concept") open += 1;
    else if (e.reason === "refund") open -= 1;
  }
  return open;
}

// Charges `cost` (default BUILD_COST) credits for `buildId`. Idempotent
// while a charge is open: calling again before it's refunded returns the
// state unchanged with ok:true (it IS charged — callers don't need to
// distinguish "just now" from "already"). Once refunded, the same
// buildId can be charged again. Returns ok:false, state unchanged, when
// the balance can't cover the cost.
export function chargeState(
  state: CreditsState,
  buildId: string,
  cost: number = BUILD_COST,
  reason: ChargeReason = "build",
): { state: CreditsState; ok: boolean } {
  if (openCharges(state.ledger, buildId) > 0) return { state, ok: true };
  if (state.balance < cost) return { state, ok: false };
  const entry: CreditEntry = {
    id: makeId(),
    delta: -cost,
    reason,
    buildId,
    ts: Date.now(),
  };
  return { state: applyEntry(state, entry), ok: true };
}

// Refunds the most recent open charge for `buildId` — used when a full
// build fails for a system reason. ok:true exactly once per open charge:
// false when there is no open charge to refund (never charged, or
// already refunded).
export function refundState(
  state: CreditsState,
  buildId: string,
): { state: CreditsState; ok: boolean } {
  if (openCharges(state.ledger, buildId) <= 0) return { state, ok: false };
  const charge = state.ledger.findLast(
    (e) =>
      (e.reason === "build" || e.reason === "concept") &&
      e.buildId === buildId,
  );
  if (!charge) return { state, ok: false };
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
    case "concept":
      return `${sign}${amount} Concept render`;
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
  charge: (buildId: string, cost?: number, reason?: ChargeReason) => boolean;
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

  // Read off state, not the ref. Every caller of this asks during render —
  // the composer's helper line, the concept card's price line, the gate's
  // Confirm — and the ref is advanced by an effect, which runs after the
  // render that read it. So on the render right after hydration it still
  // answered against a balance of 0, and nothing re-rendered afterwards to
  // correct it: a chat holding 396 credits said "You are out of credits"
  // with every control greyed out until something else happened to
  // re-render it. The ref stays for charge/refund, which decide at event
  // time and need to see their own charges inside one tick.
  const canAfford = React.useCallback(
    (cost: number = BUILD_COST) => state.balance >= cost,
    [state.balance],
  );

  // Both of these answer their caller immediately, so the decision is taken
  // against the ref and the ref is advanced in the same breath. Reading the
  // answer out of a setState updater instead — which is what these used to do
  // — only works while one charge happens per tick: React runs the updater
  // when it renders, not when you call it, so the second and third charge of
  // the same tick returned a stale false and a real render was refused as
  // "not enough credits". A multi-product build charges three times in one
  // tick, which is how that surfaced.
  const charge = React.useCallback(
    (
      buildId: string,
      cost: number = BUILD_COST,
      reason: ChargeReason = "build",
    ) => {
      const result = chargeState(stateRef.current, buildId, cost, reason);
      if (result.ok) {
        stateRef.current = result.state;
        setState(result.state);
      }
      return result.ok;
    },
    [],
  );

  const refund = React.useCallback((buildId: string) => {
    const result = refundState(stateRef.current, buildId);
    if (result.ok) {
      stateRef.current = result.state;
      setState(result.state);
    }
    return result.ok;
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
