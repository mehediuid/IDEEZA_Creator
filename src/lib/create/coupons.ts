// Plan coupons (owner 2026-11-05: "প্ল্যান পারচেজ করার সময় কুপন কোডের ব্যবস্থা
// করতে হবে" — a way to use a coupon code when buying a plan). User Panel V2 ›
// ✅ Pricing › Upgrade Package flow: "Have a Coupon?" → the code and Apply →
// "Sorry, this voucher is not valid." or "Coupon Applied −$2".
//
// The prototype has no backend, so the codes that work live here, in one list,
// each with plain rules:
// - `kind` and `value`: percent off (30 = 30%), or dollars off (5 = $5).
// - `plans`: the paid plans it works on, or "all".
// - `ends`: the last day it works, "YYYY-MM-DD"; it works to the end of that day (UTC).
//
// How a code is used (decisions D1–D9, docs/guides/features/ai-create-flow.md):
// - It comes off what is left to pay today, after the unused time of the plan
//   being replaced; a dollar amount is capped there, so nothing goes below $0.
// - It is for today's payment only: renewals are at the full price.
// - Each code once per account. The uses are read from the account's plan
//   orders (`couponsUsed`), never kept in a second store beside them.
// - One discount per order: with the welcome offer, the bigger one wins
//   (`pickDiscount`; a tie keeps the offer).
//
// Pure, relative imports only.

import type { PlanTier } from "./plans";

export type PaidTier = Exclude<PlanTier, "free">;

export type Coupon = {
  /** Capitals, no spaces: what a maker types. */
  code: string;
  kind: "percent" | "amount";
  /** Percent (30 = 30% off) or dollars (5 = $5 off). */
  value: number;
  plans: "all" | readonly PaidTier[];
  /** The last day it works, "YYYY-MM-DD" (UTC). */
  ends: string;
};

/** The codes that work. Add, change or end one here. */
export const COUPONS: readonly Coupon[] = [
  // The code the Figma shows.
  { code: "IDEEZA30", kind: "percent", value: 30, plans: "all", ends: "2027-12-31" },
  { code: "BUILDER5", kind: "amount", value: 5, plans: ["builder"], ends: "2027-06-30" },
  // Bigger than the welcome offer's 50%: shows a coupon winning.
  { code: "MAKER60", kind: "percent", value: 60, plans: ["tinkerer", "builder"], ends: "2027-12-31" },
  // Already over: shows the "ended" message.
  { code: "LAUNCH25", kind: "percent", value: 25, plans: "all", ends: "2026-10-31" },
];

/** What an order keeps of the coupon it used. */
export type AppliedCoupon = {
  code: string;
  /** Dollars it took off. */
  amount: number;
  /** "30% off", "$5 off": the rule as it was when it was used. */
  rule: string;
};

const cents = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

const PLAN_NAMES: Record<PaidTier, string> = { tinkerer: "Tinkerer", builder: "Builder", disruptor: "Disruptor" };

/** " ideeza 30 " → "IDEEZA30". */
export function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** The last moment a code works: the end of its last day, UTC. */
export function couponEndsAt(c: Coupon): number {
  const [y, m, d] = c.ends.split("-").map(Number);
  return Date.UTC(y, m - 1, d + 1) - 1;
}

/** "30% off" · "$5 off". */
export function couponRule(c: Coupon): string {
  return c.kind === "percent" ? `${c.value}% off` : `${money(c.value)} off`;
}

/** "Builder" · "Tinkerer and Builder" · "every paid plan". */
export function couponPlans(c: Coupon): string {
  if (c.plans === "all") return "every paid plan";
  const names = c.plans.map((t) => PLAN_NAMES[t]);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** What a coupon takes off an amount due: a share of it, or its dollars capped at it. */
export function couponSaving(c: Coupon, due: number): number {
  if (due <= 0) return 0;
  return c.kind === "percent" ? cents((due * c.value) / 100) : cents(Math.min(c.value, due));
}

/** The codes an account has used, read from its plan orders. */
export function couponsUsed(orders: readonly { coupon?: { code: string } }[]): Set<string> {
  return new Set(orders.flatMap((o) => (o.coupon?.code ? [normalizeCode(o.coupon.code)] : [])));
}

export type CouponCheck =
  | { ok: true; coupon: Coupon; saving: number; applied: AppliedCoupon }
  | { ok: false; reason: "empty" | "unknown" | "ended" | "plan" | "used" | "nothing"; message: string };

const endedOn = (c: Coupon) =>
  new Date(couponEndsAt(c)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Whether a typed code works for this plan now, and what it takes off `due`. */
export function checkCoupon(
  raw: string,
  ctx: { tier: PlanTier; due: number; now: number; used: ReadonlySet<string> },
  list: readonly Coupon[] = COUPONS,
): CouponCheck {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, reason: "empty", message: "Type a coupon code first." };
  const c = list.find((x) => normalizeCode(x.code) === code);
  if (!c) return { ok: false, reason: "unknown", message: "Sorry, this coupon is not valid. Check the spelling and try again." };
  if (ctx.now > couponEndsAt(c)) return { ok: false, reason: "ended", message: `Sorry, this coupon ended on ${endedOn(c)}.` };
  if (ctx.tier === "free" || (c.plans !== "all" && !c.plans.includes(ctx.tier)))
    return { ok: false, reason: "plan", message: `Sorry, this coupon is for ${couponPlans(c)} only.` };
  if (ctx.used.has(code)) return { ok: false, reason: "used", message: "You've already used this coupon. Each one works once." };
  const saving = couponSaving(c, ctx.due);
  if (saving <= 0) return { ok: false, reason: "nothing", message: "There's nothing left to pay today, so this coupon isn't needed." };
  return { ok: true, coupon: c, saving, applied: { code, amount: saving, rule: couponRule(c) } };
}

/** One discount per order: the bigger of the welcome offer and the coupon (a tie keeps the offer). */
export function pickDiscount(offer: number | null, coupon: number | null): "offer" | "coupon" | null {
  const o = offer ?? 0;
  const c = coupon ?? 0;
  if (o <= 0 && c <= 0) return null;
  return c > o ? "coupon" : "offer";
}
