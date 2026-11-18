// The phone's own readings of the web's money records (mobile Figma "AI
// Credits", "Billing", "Get Paid › Withdraw history"): this month's plan
// credits, a credit lot's state, a checkout's summary lines, and the
// withdrawal history's totals and filters. The records and their rules stay
// the web's (create/credits, create/plans, account/payout); these only read them.
//
// Pure, relative imports only.

import { creditPeriod, priceOf, type Subscription } from "../create/plans";
import type { Lot } from "../create/credit-lots";
import type { BillingCycle } from "../create/credit-pricing";
import { addAmounts } from "../wallet/money";
import type { Amount } from "../wallet/types";
import type { Withdrawal, WithdrawalStatus } from "./payout";

const cents = (n: number) => Math.round(n * 100) / 100;

/** A ledger line as far as this reads it. */
export type GrantLine = { id: string; reason: string; orderId?: string };

/** This monthly period's plan credits: what the plan added, what is spent of them and what is left.
 *  Null until the period's grant is in the ledger. */
export function allowanceOf(
  ledger: readonly GrantLine[],
  lots: readonly Lot[],
  sub: Pick<Subscription, "id" | "startedAt">,
  now: number,
): { allowance: number; used: number; remaining: number; endsAt: number } | null {
  const period = creditPeriod(sub as Subscription, now);
  const line = ledger.find((e) => e.reason === "grant" && e.orderId === `grant_${sub.id}_${period.index}`);
  const lot = line ? lots.find((l) => l.id === line.id) : undefined;
  if (!lot) return null;
  return { allowance: lot.amount, used: lot.amount - lot.remaining, remaining: lot.remaining, endsAt: period.end };
}

export type LotState = "active" | "used" | "expired";

/** A lot is active while it has credits and time, used once it is spent, expired once its date passed. */
export function lotStateOf(lot: Pick<Lot, "remaining" | "expiresAt">, now: number): LotState {
  if (lot.expiresAt !== null && lot.expiresAt <= now) return "expired";
  return lot.remaining > 0 ? "active" : "used";
}

/** A plan checkout's summary: the period at the monthly price, the annual saving off it, and the period's price. */
export function planSummaryOf(monthly: number, tier: Parameters<typeof priceOf>[0], cycle: BillingCycle): { subtotal: number; annualOff: number; price: number } {
  const price = priceOf(tier, cycle).period;
  const subtotal = cents(monthly * (cycle === "yearly" ? 12 : 1));
  return { subtotal, annualOff: cents(subtotal - price), price };
}

// ── withdrawal history ─────────────────────────────────────────────────

export type WithdrawalTotals = Record<WithdrawalStatus, Amount>;

/** Dollars withdrawn, by status. */
export function withdrawalTotalsOf(list: readonly Pick<Withdrawal, "amount" | "status">[]): WithdrawalTotals {
  const sum = (s: WithdrawalStatus) => {
    const xs = list.filter((w) => w.status === s).map((w) => w.amount);
    return xs.length ? addAmounts(...xs) : "0";
  };
  return { complete: sum("complete"), "in-progress": sum("in-progress"), pending: sum("pending") };
}

export type DateRange = "all" | "7d" | "30d" | "year";

export const DATE_RANGES: readonly { value: DateRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "year", label: "This year" },
];

const DAY = 24 * 60 * 60 * 1000;

function inRange(at: number, range: DateRange, now: number): boolean {
  if (range === "7d") return at >= now - 7 * DAY;
  if (range === "30d") return at >= now - 30 * DAY;
  if (range === "year") return new Date(at).getFullYear() === new Date(now).getFullYear();
  return true;
}

/** Newest first: the search matches the reference, where it went (name or address) and the amount. */
export function filterWithdrawals<W extends Pick<Withdrawal, "id" | "amount" | "status" | "at" | "to">>(
  list: readonly W[],
  f: { query: string; status: WithdrawalStatus | "all"; range: DateRange; now: number },
): W[] {
  const q = f.query.trim().toLowerCase();
  return list
    .filter(
      (w) =>
        (f.status === "all" || w.status === f.status) &&
        inRange(w.at, f.range, f.now) &&
        (q === "" ||
          w.id.toLowerCase().includes(q) ||
          w.to.label.toLowerCase().includes(q) ||
          (w.to.address ?? "").toLowerCase().includes(q) ||
          w.amount.includes(q)),
    )
    .sort((a, b) => b.at - a.at);
}

/** "January 2026", or "2026" for a whole year. */
export function periodLabel(year: number, month: number | null): string {
  if (month === null) return String(year);
  return `${new Date(2000, month - 1, 1).toLocaleDateString("en-GB", { month: "long" })} ${year}`;
}
