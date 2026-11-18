// Upgrade nudges (owner 2026-11-05/08, plan https://claude.ai/artifact/2AKnqEgnh1CG5nvuuLNShY,
// "সব সুপারিশ ঠিক"): where a Free or Tinkerer maker hears about a bigger plan,
// and the numbers each nudge says. Every number is the maker's own — their
// ledger, their projects — never an invented figure.
//
// The rules the plan settled:
// - The fix comes first, the plan beside it; nothing is ever blocked for a plan
//   except opening a project past the plan's allowance (decision 2).
// - Which plan: Builder from Free or Tinkerer, Disruptor from Builder, nothing
//   on Disruptor (decision 7). 720p video names Disruptor.
// - Paid makers hear only of the next plan, and only at a limit.
//
// Pure, relative imports only.

import { discountFor, type BillingCycle } from "./credit-pricing";
import { PLANS, planOf, priceOf, type Plan, type PlanTier, type Subscription } from "./plans";
import { DEMO_PROJECT_PREFIX } from "../demo/demo-projects";

/** The plan a nudge names; null on the top plan. */
export function pitchPlan(tier: PlanTier): Plan | null {
  if (tier === "disruptor") return null;
  return planOf(tier === "builder" ? "disruptor" : "builder");
}

/** What a pitched plan gives, in the maker's terms: "300 credits every month", "packs 15% off", "your builds go first". */
export function pitchPerks(plan: Plan): string[] {
  const off = Math.round(discountFor(plan.tier, "monthly") * 100);
  return [
    `${plan.credits.toLocaleString("en-US")} credits every month`,
    ...(off > 0 ? [`packs ${off}% off`] : []),
    plan.tier === "disruptor" ? "720p video" : plan.tier === "builder" ? "your builds go first" : null,
  ].filter((x): x is string => x !== null);
}

/** The cycle a nudge's checkout opens on: monthly from Free, else the cycle they pay by. */
export function pitchCycle(sub: Pick<Subscription, "tier" | "cycle">): BillingCycle {
  return sub.tier === "free" ? "monthly" : sub.cycle;
}

/** A ledger line, as far as a nudge reads it. */
export type LedgerLine = { reason: string; delta: number; ts: number; price?: number };

const sameMonth = (a: number, b: number) => {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth();
};
const cents = (n: number) => Math.round(n * 100) / 100;

/** Dollars spent buying credits in the calendar month `now` falls in, and how many purchases. */
export function creditSpendThisMonth(ledger: readonly LedgerLine[], now: number): { spent: number; purchases: number } {
  let spent = 0;
  let purchases = 0;
  for (const e of ledger) {
    if (e.reason !== "purchase" || !sameMonth(e.ts, now)) continue;
    spent += e.price ?? 0;
    purchases += 1;
  }
  return { spent: cents(spent), purchases };
}

/**
 * D2 — a second credit purchase in a month: say what was spent and what the
 * plan costs, but only when it is true that the plan is the better buy (the
 * month's credit spend has reached the plan's monthly price). Free and
 * Tinkerer only.
 */
export function savingsNudge(
  ledger: readonly LedgerLine[],
  sub: Pick<Subscription, "tier">,
  now: number,
): { spent: number; plan: Plan; monthly: number } | null {
  if (sub.tier !== "free" && sub.tier !== "tinkerer") return null;
  const plan = pitchPlan(sub.tier);
  if (!plan) return null;
  const { spent, purchases } = creditSpendThisMonth(ledger, now);
  const monthly = priceOf(plan.tier, "monthly").perMonth;
  if (purchases < 2 || spent < monthly) return null;
  return { spent, plan, monthly };
}

const DAY = 24 * 60 * 60 * 1000;

/** E1 — what the maker used in the last 30 days: credits spent (less refunds) and projects held. */
export function usageOf(ledger: readonly LedgerLine[], projects: number, now: number): { credits: number; projects: number } {
  let credits = 0;
  for (const e of ledger) {
    if (e.ts < now - 30 * DAY || e.ts > now) continue;
    if (e.reason === "build" || e.reason === "concept") credits += -e.delta;
    else if (e.reason === "refund") credits -= e.delta;
  }
  return { credits: Math.max(0, credits), projects: Math.max(0, projects) };
}

/** E1 — the smallest plan whose monthly credits and projects cover that use; the top plan when none does. */
export function fitsYou(usage: { credits: number; projects: number }): PlanTier {
  const fit = PLANS.find((p) => p.credits >= usage.credits && p.projects >= usage.projects);
  return (fit ?? PLANS[PLANS.length - 1]).tier;
}

/** C5 — whether one more project fits the plan. */
/** Whether a project uses one of the plan's slots. The demo projects every account starts
 *  with (lib/demo, prototype only) don't: a new Free account has four of them and three slots. */
export function takesPlanSlot(projectId: string): boolean {
  return !projectId.startsWith(DEMO_PROJECT_PREFIX);
}

export function projectRoom(tier: PlanTier, held: number): { allowed: number; held: number; full: boolean } {
  const allowed = planOf(tier).projects;
  return { allowed, held, full: held >= allowed };
}

/** F2 — the code offered once the welcome offer has ended unused (decision 6). */
export const RETURN_COUPON = "MAKER20";
