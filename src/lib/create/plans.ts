// IDEEZA plans and the account's subscription (User Panel V2, "✅ Pricing":
// plan cards 41551:109184, compare table 41551:109392, checkout and
// downgrade flows). Owner decisions 2026-10-13: the Monthly cards are the
// prices (annual is 20% off), the second plan is "Tinkerer" (Explorer stays
// the XP level's name), and no plan ever stands between a project and its
// mint, listing or sale — plans set amounts, never gates.
//
// The subscription's rules:
// - Upgrading (a bigger plan, or monthly → yearly) starts now. It is paid
//   now, less the unused share of what the current period cost.
// - Switching to a smaller plan, yearly → monthly, or cancelling takes effect
//   when the period ends. Nothing is charged and nothing is deleted.
// - At the end of a period a plan renews (auto-renew on) or the scheduled
//   change starts. Payments aren't on, so a renewal is recorded as not
//   charged (testnet demo) rather than pretending money moved.
// - Every plan, Free included, adds its AI credits at the start of each
//   monthly period, counted from the day the plan started; they last until
//   the period ends. `grantDue` names the one grant missing now.
//
// Pure, relative imports only.

import { addMonths, type BillingCycle } from "./credit-pricing";

export type PlanTier = "free" | "tinkerer" | "builder" | "disruptor";

export type Plan = {
  tier: PlanTier;
  name: string;
  tagline: string;
  /** US dollars a month, billed monthly. */
  monthly: number;
  credits: number;
  queue: string;
  projects: number;
  exports: number;
  contributors: number;
  popular?: boolean;
};

export const PLANS: readonly Plan[] = [
  { tier: "free", name: "Free", tagline: "Free forever", monthly: 0, credits: 10, queue: "Basic queue", projects: 1, exports: 2, contributors: 0 },
  { tier: "tinkerer", name: "Tinkerer", tagline: "Explore IDEEZA", monthly: 8, credits: 50, queue: "Standard queue, peak waits possible", projects: 5, exports: 5, contributors: 1 },
  { tier: "builder", name: "Builder", tagline: "For building and selling", monthly: 10, credits: 300, queue: "Priority queue", projects: 20, exports: 50, contributors: 20, popular: true },
  { tier: "disruptor", name: "Disruptor", tagline: "For a hardware business", monthly: 20, credits: 1200, queue: "Fast-track queue, shortest waits", projects: 200, exports: 300, contributors: 200 },
];

/** Annual billing takes this share off. */
export const YEARLY_OFF = 0.2;

export function planOf(tier: PlanTier): Plan {
  return PLANS.find((p) => p.tier === tier) as Plan;
}

const rank = (tier: PlanTier) => PLANS.findIndex((p) => p.tier === tier);
const cents = (n: number) => Math.round(n * 100) / 100;

/** Per month, and what one billing period charges. */
export function priceOf(tier: PlanTier, cycle: BillingCycle): { perMonth: number; period: number } {
  const monthly = planOf(tier).monthly;
  if (cycle === "monthly") return { perMonth: monthly, period: monthly };
  const perMonth = cents(monthly * (1 - YEARLY_OFF));
  return { perMonth, period: cents(perMonth * 12) };
}

export const cycleMonths = (cycle: BillingCycle) => (cycle === "yearly" ? 12 : 1);

// ── the subscription ────────────────────────────────────────────────────

export type PlanOrder = {
  orderId: string;
  ts: number;
  tier: PlanTier;
  cycle: BillingCycle;
  /** Dollars: paid now (a start), or what the period costs (a renewal). */
  amount: number;
  /** "IDZ · demo wallet"; a renewal: "Not charged (testnet demo)". */
  paidWith: string;
  kind: "start" | "renewal";
};

export type Subscription = {
  /** Changes whenever a plan starts: the key monthly credit grants hang on. */
  id: string;
  tier: PlanTier;
  cycle: BillingCycle;
  /** When this plan started: monthly credit periods count from here. */
  startedAt: number;
  /** When the paid period ends; null on Free. */
  renewsAt: number | null;
  /** Off once cancelled: the plan ends at `renewsAt`. */
  autoRenew: boolean;
  /** A change waiting for the period's end: a smaller plan, a cycle, or Free (a cancel). */
  pending: { tier: PlanTier; cycle: BillingCycle } | null;
  orders: PlanOrder[];
};

export function freeSubscription(now: number, id = `sub_${now.toString(36)}`): Subscription {
  return { id, tier: "free", cycle: "monthly", startedAt: now, renewsAt: null, autoRenew: true, pending: null, orders: [] };
}

/** How a plan and cycle stand to the current subscription — what its button says. */
export type Relation = "current" | "upgrade" | "downgrade" | "scheduled";

export function relationOf(sub: Subscription, tier: PlanTier, cycle: BillingCycle): Relation {
  if (sub.pending && sub.pending.tier === tier && (tier === "free" || sub.pending.cycle === cycle)) return "scheduled";
  if (sub.tier === tier && (tier === "free" || sub.cycle === cycle)) return "current";
  if (rank(tier) > rank(sub.tier)) return "upgrade";
  if (rank(tier) < rank(sub.tier)) return "downgrade";
  // Same plan, the other cycle: yearly is a commitment up, monthly one down.
  return cycle === "yearly" ? "upgrade" : "downgrade";
}

/** What an upgrade costs now: the new period, less the unused share of the current one. */
export function quoteUpgrade(sub: Subscription, tier: PlanTier, cycle: BillingCycle, now: number) {
  const price = priceOf(tier, cycle).period;
  let unused = 0;
  if (sub.tier !== "free" && sub.renewsAt !== null && sub.renewsAt > now) {
    const paid = priceOf(sub.tier, sub.cycle).period;
    const span = sub.renewsAt - sub.startedAt;
    unused = span > 0 ? cents((paid * (sub.renewsAt - now)) / span) : 0;
  }
  const due = cents(Math.max(0, price - unused));
  return { price, unused, due, renewsAt: addMonths(now, cycleMonths(cycle)) };
}

/** An upgrade, paid: the new plan starts now. */
export function startPlan(
  sub: Subscription,
  tier: PlanTier,
  cycle: BillingCycle,
  now: number,
  pay: { orderId: string; amount: number; paidWith: string },
): Subscription {
  if (sub.orders.some((o) => o.orderId === pay.orderId)) return sub;
  return {
    id: `sub_${pay.orderId}`,
    tier,
    cycle,
    startedAt: now,
    renewsAt: tier === "free" ? null : addMonths(now, cycleMonths(cycle)),
    autoRenew: true,
    pending: null,
    orders: [...sub.orders, { orderId: pay.orderId, ts: now, tier, cycle, amount: pay.amount, paidWith: pay.paidWith, kind: "start" }],
  };
}

/** A smaller plan or the monthly cycle, from the end of the period. */
export function scheduleSwitch(sub: Subscription, tier: PlanTier, cycle: BillingCycle): Subscription {
  if (sub.renewsAt === null) return sub;
  return { ...sub, autoRenew: true, pending: { tier, cycle: tier === "free" ? "monthly" : cycle } };
}

/** Cancel: Free from the end of the period. */
export function cancelPlan(sub: Subscription): Subscription {
  if (sub.renewsAt === null) return sub;
  return { ...sub, autoRenew: false, pending: { tier: "free", cycle: "monthly" } };
}

/** Keep the plan after all: the scheduled change or cancel is dropped. */
export function keepPlan(sub: Subscription): Subscription {
  return { ...sub, autoRenew: true, pending: null };
}

/** Every period end up to `now`: a renewal, or the scheduled change starting. */
export function advance(sub: Subscription, now: number): Subscription {
  let s = sub;
  for (let guard = 0; s.renewsAt !== null && s.renewsAt <= now && guard < 240; guard++) {
    const at = s.renewsAt;
    const next = s.pending ?? (s.autoRenew ? { tier: s.tier, cycle: s.cycle } : { tier: "free" as const, cycle: "monthly" as const });
    const fresh = next.tier !== s.tier || next.cycle !== s.cycle;
    const orderId = `renew_${s.id}_${at.toString(36)}`;
    const orders =
      next.tier === "free"
        ? s.orders
        : [
            ...s.orders,
            { orderId, ts: at, tier: next.tier, cycle: next.cycle, amount: priceOf(next.tier, next.cycle).period, paidWith: "Not charged (testnet demo)", kind: "renewal" as const },
          ];
    s = {
      id: fresh ? `sub_${orderId}` : s.id,
      tier: next.tier,
      cycle: next.cycle,
      startedAt: fresh ? at : s.startedAt,
      renewsAt: next.tier === "free" ? null : addMonths(at, cycleMonths(next.cycle)),
      autoRenew: true,
      pending: null,
      orders,
    };
  }
  return s;
}

/** The monthly credit period `now` falls in, counted from the plan's start. */
export function creditPeriod(sub: Subscription, now: number): { index: number; start: number; end: number } {
  let index = 0;
  while (addMonths(sub.startedAt, index + 1) <= now && index < 10_000) index++;
  return { index, start: addMonths(sub.startedAt, index), end: addMonths(sub.startedAt, index + 1) };
}

export type Grant = { orderId: string; credits: number; plan: string; ts: number; expiresAt: number };

/** The credit grant this period is owed and doesn't have yet; null when it has it. */
export function grantDue(sub: Subscription, granted: ReadonlySet<string>, now: number): Grant | null {
  const period = creditPeriod(sub, now);
  const orderId = `grant_${sub.id}_${period.index}`;
  if (granted.has(orderId)) return null;
  const plan = planOf(sub.tier);
  return { orderId, credits: plan.credits, plan: plan.name, ts: now, expiresAt: period.end };
}
