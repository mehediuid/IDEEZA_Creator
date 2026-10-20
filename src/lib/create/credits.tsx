"use client";

// CreditsProvider — the user's local credits ledger. A full-product
// build (3D + PCB + firmware) costs BUILD_COST credits, and every
// concept render — the first draft, a refine and a regenerate alike —
// costs CONCEPT_COST. Charging refines alone would have left the
// loophole open: regenerate runs the same model for the same money, so
// anyone avoiding the charge would just press that instead. There is no
// backend yet, so this is a local balance. Credits come in as lots — the
// starting balance, purchases (Buy credits, paid from the Demo wallet on
// testnet) and the free top-ups of earlier builds — and a purchase expires
// after VALIDITY_MONTHS (credit-lots.ts).
//
// Charging and refunding are keyed by buildId and idempotent: a given
// build can only be charged once, and only a charged build can be
// refunded, only once. That lets callers (the build orchestrator) call
// charge/refund freely on retries/re-renders without double-counting.
//
// Persists to localStorage; follows the hydrate/persist pattern of
// plan.tsx exactly (hydrate once, persist post-hydration).

import * as React from "react";
import { expiredLines } from "./credit-lots";
import { withinCap } from "./credit-limits";
import { readSettings } from "../settings/prefs";
import { VALIDITY_MONTHS, addMonths } from "./credit-pricing";

/** What building ONE product costs. A build covers every product in the
 *  project, each with its own five deliverables, so the price is per product —
 *  see `buildCost`. */
export const BUILD_COST = 4;
/** What one concept render costs — first draft, refine or regenerate. */
export const CONCEPT_COST = 1;

/** What a build of `products` products costs. The gate and the canvas quote
 *  this and the worker charges it: they used to quote BUILD_COST × products
 *  while the worker charged a flat BUILD_COST, so a two-product build said
 *  8 credits and took 4. */
export function buildCost(products: number): number {
  return BUILD_COST * Math.max(1, Math.trunc(products));
}

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
  /** `topup`: the free demo top-ups of earlier builds, kept readable.
   *  `purchase`: credits bought. `grant`: the plan's monthly credits.
   *  `expiry`: a lot ran out of time. */
  reason: ChargeReason | "seed" | "refund" | "topup" | "purchase" | "grant" | "expiry";
  /** What was charged: a build id, or a concept turn id. The field keeps
   *  its name because ledgers are already stored under it. */
  buildId?: string;
  /** A purchase's order: one payment. The same order adds once. */
  orderId?: string;
  ts: number;
  /** A purchase: when its credits expire (VALIDITY_MONTHS after it). */
  expiresAt?: number;
  /** A purchase: the bonus credits inside `delta`, the pack, the dollar price
   *  paid and how ("IDZ · demo wallet"), the price before the plan's discount,
   *  and the wallet's transaction and paying address. */
  bonus?: number;
  pack?: string;
  price?: number;
  paidWith?: string;
  listPrice?: number;
  txHash?: string;
  payer?: string;
  /** An expiry: the lot (ledger line id) it empties. */
  lotId?: string;
};

export type CreditsState = {
  balance: number;
  ledger: CreditEntry[];
};

const STORAGE_KEY = "ideeza:create:credits";
const SEED_BALANCE = 8;

// Safe placeholder for the pre-hydration render only — never shown,
// since readers render a hidden shell until `hydrated` is true.
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
// that mutates a CreditsState — chargeState/refundState/purchaseState all
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
// the balance can't cover the cost (`why: "balance"`) or, given `limit`,
// when the charge would take this calendar month past the monthly
// spending limit (`why: "cap"`, credit-limits.ts).
export function chargeState(
  state: CreditsState,
  buildId: string,
  cost: number = BUILD_COST,
  reason: ChargeReason = "build",
  limit?: { cap: number | null; now: number },
): { state: CreditsState; ok: boolean; why?: "balance" | "cap" } {
  if (openCharges(state.ledger, buildId) > 0) return { state, ok: true };
  if (limit && !withinCap(state.ledger, limit.cap, cost, limit.now)) return { state, ok: false, why: "cap" };
  if (state.balance < cost) return { state, ok: false, why: "balance" };
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

export type CreditOrder = {
  orderId: string;
  base: number;
  bonus: number;
  /** "Pro" — a pack's name; absent for a custom amount. */
  pack?: string;
  /** Dollars paid, after any plan discount. */
  price: number;
  /** "IDZ · demo wallet" */
  paidWith: string;
  ts?: number;
  /** Dollars before the plan's discount. */
  listPrice?: number;
  txHash?: string;
  payer?: string;
};

// Credits bought: base plus bonus, expiring VALIDITY_MONTHS later. Idempotent
// per `orderId`: an order already in the ledger returns the state unchanged,
// so a double click or a replayed confirm adds once.
export function purchaseState(state: CreditsState, order: CreditOrder): CreditsState {
  const base = Math.trunc(order.base);
  const bonus = Math.max(0, Math.trunc(order.bonus));
  if (base <= 0) return state;
  if (state.ledger.some((e) => e.orderId === order.orderId)) return state;
  const ts = order.ts ?? Date.now();
  return applyEntry(state, {
    id: makeId(),
    delta: base + bonus,
    reason: "purchase",
    orderId: order.orderId,
    ts,
    expiresAt: addMonths(ts, VALIDITY_MONTHS),
    bonus,
    ...(order.pack ? { pack: order.pack } : {}),
    price: order.price,
    paidWith: order.paidWith,
    ...(order.listPrice !== undefined && order.listPrice !== order.price ? { listPrice: order.listPrice } : {}),
    ...(order.txHash ? { txHash: order.txHash } : {}),
    ...(order.payer ? { payer: order.payer } : {}),
  });
}

// A plan's credits for one monthly period, expiring when the period ends.
// Idempotent per grant id (lib/create/plans.ts `grantDue`).
export function grantState(
  state: CreditsState,
  grant: { orderId: string; credits: number; plan: string; ts: number; expiresAt: number },
): CreditsState {
  if (grant.credits <= 0 || state.ledger.some((e) => e.orderId === grant.orderId)) return state;
  return applyEntry(state, {
    id: makeId(),
    delta: grant.credits,
    reason: "grant",
    orderId: grant.orderId,
    ts: grant.ts,
    expiresAt: grant.expiresAt,
    pack: grant.plan,
  });
}

// The lots past their expiry at `now` lose what they had left: one `expiry`
// line each, so the balance and the ledger stay one story.
export function expireState(state: CreditsState, now: number): CreditsState {
  let next = state;
  for (const d of expiredLines(state.ledger, now)) {
    next = applyEntry(next, { id: makeId(), delta: d.delta, reason: "expiry", lotId: d.lotId, ts: now });
  }
  return next;
}

// One-line description of a ledger entry for display. `subject`
// names what was charged — the build's title — because the id alone
// ("build_t4p17pf3_…") tells the reader nothing.
export function describeEntry(entry: CreditEntry, subject?: string): string {
  const sign = entry.delta >= 0 ? "+" : "−"; // U+2212 minus sign
  const amount = Math.abs(entry.delta);
  const about = subject ? ` · ${subject}` : "";
  switch (entry.reason) {
    case "seed":
      return `${sign}${amount} Starting balance`;
    case "topup":
      return `${sign}${amount} Top up`;
    case "purchase":
      return `${sign}${amount} ${entry.pack ? `${entry.pack} pack` : "Credits bought"}`;
    case "grant":
      return `${sign}${amount} ${entry.pack ?? "Plan"} plan credits`;
    case "expiry":
      return `${sign}${amount} Expired`;
    case "build":
      return `${sign}${amount} Build${about}`;
    case "concept":
      return `${sign}${amount} Concept render`;
    case "refund":
      return `${sign}${amount} Refund${about}`;
    default:
      // A reason this build doesn't know (a ledger written by newer code)
      // still reads as an amount rather than a blank row.
      return `${sign}${amount} Credits`;
  }
}

// ───────────────────────────── provider ─────────────────────────────

type Ctx = {
  hydrated: boolean;
  balance: number;
  ledger: CreditEntry[];
  canAfford: (cost?: number) => boolean;
  /** False when the balance can't cover it or it would cross the monthly spending limit. */
  charge: (buildId: string, cost?: number, reason?: ChargeReason) => boolean;
  /** Whether spending `cost` now would take this month past the monthly spending limit. */
  overCap: (cost: number) => boolean;
  refund: (buildId: string) => boolean;
  /** Adds a paid order's credits once per `orderId`; false when it already did. */
  purchase: (order: CreditOrder) => boolean;
  /** Adds a plan's monthly credits once per grant id. */
  grant: (g: Parameters<typeof grantState>[1]) => boolean;
};

const CreditsContext = React.createContext<Ctx | null>(null);

export function CreditsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<CreditsState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = React.useState(false);
  // The latest state, for writes decided at event time. Every write sets it
  // before its setState — there is no effect copying `state` into it, since
  // that ran after children's effects and put back a stale state over a
  // write a child had just made.
  const stateRef = React.useRef(state);

  // Hydrate once, letting any lot past its date expire first. The ref is set
  // here, not left to the effect that follows `state`: children's effects run
  // before this provider's, so the first write after hydration (PlanCredits'
  // monthly grant) read the empty pre-hydration ref and replaced the whole
  // ledger with its one line.
  React.useEffect(() => {
    const loaded = expireState(loadStored(), Date.now());
    stateRef.current = loaded;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of localStorage after mount
    setState(loaded);
    setHydrated(true);
  }, []);

  // Another tab wrote the ledger (a purchase there, a build charged there):
  // adopt it, so this tab's next write doesn't put back a stale balance.
  // Writing the same value back raises no event, so the tabs don't echo.
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      const next = expireState(loadStored(), Date.now());
      stateRef.current = next;
      setState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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
      // A lot that ran out of time since the page loaded can't pay for it,
      // and no charge takes this month past the monthly spending limit.
      const now = Date.now();
      const result = chargeState(expireState(stateRef.current, now), buildId, cost, reason, {
        cap: readSettings().credits.monthlyCap,
        now,
      });
      if (result.state !== stateRef.current) {
        stateRef.current = result.state;
        setState(result.state);
      }
      return result.ok;
    },
    [],
  );

  const overCap = React.useCallback(
    (cost: number) => !withinCap(stateRef.current.ledger, readSettings().credits.monthlyCap, cost, Date.now()),
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

  // Through the ref like charge and refund: an addition that only queued a
  // setState updater was lost when a build charged in the same tick, since
  // the charge wrote its state from the ref the addition never advanced.
  const purchase = React.useCallback((order: CreditOrder) => {
    const next = purchaseState(stateRef.current, order);
    if (next === stateRef.current) return false;
    stateRef.current = next;
    setState(next);
    return true;
  }, []);

  const grant = React.useCallback((g: Parameters<typeof grantState>[1]) => {
    const next = grantState(stateRef.current, g);
    if (next === stateRef.current) return false;
    stateRef.current = next;
    setState(next);
    return true;
  }, []);

  const value: Ctx = {
    hydrated,
    balance: state.balance,
    ledger: state.ledger,
    canAfford,
    charge,
    overCap,
    refund,
    purchase,
    grant,
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

