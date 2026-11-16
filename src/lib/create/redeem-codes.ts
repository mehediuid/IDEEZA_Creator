// Redeem a code for AI credits (owner, 2026-11-16: "AI credit-er khane code redeem korar jayga lagbe, jekhane code
// dile credit pabe" — a place on the credits page where a code gives credits). Figma has no design for it.
//
// The prototype has no backend, so the codes that work live here, in one list, each with plain rules:
// - `credits`: how many it adds. They count as bought credits do: valid VALIDITY_MONTHS from the day redeemed.
// - `ends`: the last day it can be redeemed, "YYYY-MM-DD"; it works to the end of that day (UTC).
// Each code once per account. Whether it was used is read from the credit ledger (its `redeem:<CODE>` line), never
// kept in a second store beside it. A plan coupon (coupons.ts) typed here says where it goes instead.
//
// Pure, relative imports only.

import { COUPONS, normalizeCode, type Coupon } from "./coupons";

export type RedeemCode = {
  /** Capitals, no spaces: what a maker types. */
  code: string;
  /** Credits it adds. */
  credits: number;
  /** The last day it can be redeemed, "YYYY-MM-DD" (UTC). */
  ends: string;
};

/** The codes that work. Add, change or end one here. */
export const REDEEM_CODES: readonly RedeemCode[] = [
  { code: "IDEEZA100", credits: 100, ends: "2027-12-31" },
  { code: "WELCOME50", credits: 50, ends: "2027-12-31" },
  { code: "EVENT250", credits: 250, ends: "2027-06-30" },
  // Already over: shows the "ended" message.
  { code: "BETA20", credits: 20, ends: "2026-10-31" },
];

const PREFIX = "redeem:";

/** The ledger's order id for a redeemed code: the same code adds once. */
export const redeemOrderId = (code: string) => `${PREFIX}${normalizeCode(code)}`;

/** The last moment a code can be redeemed: the end of its last day, UTC. */
export function redeemEndsAt(c: RedeemCode): number {
  const [y, m, d] = c.ends.split("-").map(Number);
  return Date.UTC(y, m - 1, d + 1) - 1;
}

/** The codes an account has redeemed, read from its credit ledger. */
export function codesRedeemed(ledger: readonly { reason: string; orderId?: string }[]): Set<string> {
  return new Set(
    ledger.flatMap((e) => (e.reason === "redeem" && e.orderId?.startsWith(PREFIX) ? [e.orderId.slice(PREFIX.length)] : [])),
  );
}

export type RedeemCheck =
  | { ok: true; code: string; credits: number }
  | { ok: false; reason: "empty" | "unknown" | "coupon" | "ended" | "used"; message: string };

const endedOn = (c: RedeemCode) =>
  new Date(redeemEndsAt(c)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Whether a typed code can be redeemed now, and for how many credits. */
export function checkRedeemCode(
  raw: string,
  ctx: { now: number; used: ReadonlySet<string> },
  list: readonly RedeemCode[] = REDEEM_CODES,
  coupons: readonly Coupon[] = COUPONS,
): RedeemCheck {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, reason: "empty", message: "Type a code first." };
  const c = list.find((x) => normalizeCode(x.code) === code);
  if (!c) {
    if (coupons.some((x) => normalizeCode(x.code) === code))
      return { ok: false, reason: "coupon", message: `${code} is a plan coupon. Use it when you buy a plan.` };
    return { ok: false, reason: "unknown", message: "Sorry, this code is not valid. Check the spelling and try again." };
  }
  if (ctx.now > redeemEndsAt(c)) return { ok: false, reason: "ended", message: `Sorry, this code ended on ${endedOn(c)}.` };
  if (ctx.used.has(code)) return { ok: false, reason: "used", message: "You've already redeemed this code. Each one works once." };
  return { ok: true, code, credits: c.credits };
}
