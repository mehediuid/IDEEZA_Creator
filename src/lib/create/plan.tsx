"use client";

// CreatePlanProvider — the account's plan: its subscription (lib/create/
// plans.ts), persisted to localStorage, carried past each period's end on load
// and once a minute (a renewal, or a scheduled switch or cancel starting).
//
// It replaced the daily prompt quota ("5 prompts a day", Free/Plus/Pro): that
// meter never stopped a generation, and credits are the one meter now.
//
// <PlanCredits /> sits inside the credits provider and writes each monthly
// period's plan credits into the ledger, once per period (`grantDue`).

import * as React from "react";
import { discountFor, type BillingCycle } from "./credit-pricing";
import { useCredits } from "./credits";
import {
  advance,
  cancelPlan,
  freeSubscription,
  grantDue,
  keepPlan,
  planOf,
  scheduleSwitch,
  startPlan,
  type Plan,
  type PlanPayment,
  type PlanTier,
  type Subscription,
} from "./plans";

const STORAGE_KEY = "ideeza:account:plan";
/** The retired daily-quota record, cleared on load. */
const LEGACY_KEY = "ideeza:create:plan";

function loadStored(now: number): Subscription {
  try {
    window.localStorage.removeItem(LEGACY_KEY);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Subscription;
      if (parsed && typeof parsed.tier === "string" && Array.isArray(parsed.orders)) return parsed;
    }
  } catch {}
  return freeSubscription(now);
}

type Ctx = {
  hydrated: boolean;
  sub: Subscription;
  plan: Plan;
  /** A paid start: the plan begins now (an upgrade). */
  start: (tier: PlanTier, cycle: BillingCycle, pay: PlanPayment) => void;
  /** A smaller plan or the monthly cycle, from the period's end. */
  schedule: (tier: PlanTier, cycle: BillingCycle) => void;
  cancel: () => void;
  keep: () => void;
};

const CreatePlanContext = React.createContext<Ctx | null>(null);

export function CreatePlanProvider({ children }: { children: React.ReactNode }) {
  const [sub, setSub] = React.useState<Subscription>(() => freeSubscription(0, "sub_ssr"));
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const now = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of localStorage after mount
    setSub(advance(loadStored(now), now));
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
    } catch {}
  }, [sub, hydrated]);

  // A period that ends while the page is open.
  React.useEffect(() => {
    if (!hydrated) return;
    const id = window.setInterval(() => setSub((s) => advance(s, Date.now())), 60_000);
    return () => window.clearInterval(id);
  }, [hydrated]);

  const start = React.useCallback<Ctx["start"]>(
    (tier, cycle, pay) =>
      setSub((s) => {
        const now = Date.now();
        return startPlan(advance(s, now), tier, cycle, now, pay);
      }),
    [],
  );
  const schedule = React.useCallback<Ctx["schedule"]>((tier, cycle) => setSub((s) => scheduleSwitch(s, tier, cycle)), []);
  const cancel = React.useCallback(() => setSub((s) => cancelPlan(s)), []);
  const keep = React.useCallback(() => setSub((s) => keepPlan(s)), []);

  const value = React.useMemo<Ctx>(
    () => ({ hydrated, sub, plan: planOf(sub.tier), start, schedule, cancel, keep }),
    [hydrated, sub, start, schedule, cancel, keep],
  );
  return <CreatePlanContext.Provider value={value}>{children}</CreatePlanContext.Provider>;
}

export function useCreatePlan(): Ctx {
  const ctx = React.useContext(CreatePlanContext);
  if (!ctx) throw new Error("useCreatePlan must be used inside <CreatePlanProvider>");
  return ctx;
}

/** The share the current plan takes off credits (0 on Free and Tinkerer). */
export function useCreditDiscount(): number {
  const { sub } = useCreatePlan();
  return discountFor(sub.tier, sub.cycle);
}

/** Writes the plan's credits for the current monthly period, once. Renders nothing. */
export function PlanCredits() {
  const { hydrated: planReady, sub } = useCreatePlan();
  const { hydrated: creditsReady, ledger, grant } = useCredits();
  const granted = React.useMemo(
    () => new Set(ledger.filter((e) => e.reason === "grant" && e.orderId).map((e) => e.orderId as string)),
    [ledger],
  );
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (!planReady || !creditsReady) return;
    const due = grantDue(sub, granted, Date.now());
    if (due) grant(due);
  }, [planReady, creditsReady, sub, granted, grant, tick]);

  return null;
}
