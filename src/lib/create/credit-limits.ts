// Credit alerts and limits (Settings › Plan & billing, spec §5.11):
// the rules behind the five preferences in `ideeza:settings` › credits.
//
// - Spent this month: every build and concept charge made in the calendar
//   month (local time), less what refunds put back. A refund cancels the
//   charge it pairs with (the latest open one on its id, as refundState and
//   lotsOf pair them), so it lands in the month the charge was made.
// - The monthly limit: a charge that would take this month's spending past it
//   is refused; a build whose turn comes is asked the limit first (buying
//   credits can't start a build the limit holds), then the balance.
// - Running low: the balance at or under your number.
// - The next lot to expire, and whether it falls inside your reminder days.
// - Ask before a purchase over $X: one extra confirm, strictly above it.
// - Auto top-up: when a build pauses for credits, buy the chosen pack once
//   for that pause, and only when the build would then start.
//
// Pure, relative imports only.

import { lotsOf, type LotLine } from "./credit-lots";

/** A ledger line, as far as spending reads it. */
export type SpendLine = { id: string; delta: number; reason: string; buildId?: string; ts: number };

const DAY = 24 * 60 * 60 * 1000;

/** The card that holds these settings: a paused build and a refused render link here. */
export const CREDIT_ALERTS_HREF = "/settings/plan#credit-alerts";

/** The one sentence for what the limit stops. */
export const CAP_REASON = "You reached your monthly limit";

/** The calendar month `now` falls in: local midnight on the 1st, and on the next 1st. */
export function monthBounds(now: number): { start: number; end: number } {
  const d = new Date(now);
  return {
    start: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
  };
}

/** Credits spent in the calendar month of `now`, refunds put back. */
export function monthSpent(ledger: readonly SpendLine[], now: number): number {
  const { start, end } = monthBounds(now);
  // Per charged id, its charges still standing, newest last.
  const open = new Map<string, Array<{ ts: number; amount: number }>>();
  const loose: Array<{ ts: number; amount: number }> = [];
  for (const e of ledger) {
    if ((e.reason === "build" || e.reason === "concept") && e.delta < 0) {
      const charge = { ts: e.ts, amount: -e.delta };
      if (e.buildId) open.set(e.buildId, [...(open.get(e.buildId) ?? []), charge]);
      else loose.push(charge);
    } else if (e.reason === "refund" && e.buildId) {
      open.get(e.buildId)?.pop();
    }
  }
  let spent = 0;
  for (const c of [...loose, ...[...open.values()].flat()]) if (c.ts >= start && c.ts < end) spent += c.amount;
  return spent;
}

/** What the monthly limit leaves this month; null when there is no limit. */
export function capLeft(ledger: readonly SpendLine[], cap: number | null, now: number): number | null {
  if (cap === null) return null;
  return Math.max(0, cap - monthSpent(ledger, now));
}

/** Whether spending `cost` now keeps this month within the limit (reaching it exactly is allowed). */
export function withinCap(ledger: readonly SpendLine[], cap: number | null, cost: number, now: number): boolean {
  const left = capLeft(ledger, cap, now);
  return left === null || cost <= left;
}

/** Why a build whose turn came can or can't be charged. */
export type BuildGate = "go" | "cap" | "credits";

export function buildGate(i: {
  balance: number;
  cost: number;
  ledger: readonly SpendLine[];
  cap: number | null;
  now: number;
}): BuildGate {
  if (!withinCap(i.ledger, i.cap, i.cost, i.now)) return "cap";
  if (i.balance < i.cost) return "credits";
  return "go";
}

/** "Running low": the balance is at or under your number. */
export function runningLow(balance: number, lowAt: number): boolean {
  return balance <= lowAt;
}

const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/** Why the "Running low" mark sits where it does: how many one-product
 *  builds (`buildCost` each) it still covers when the warning comes. */
export function lowMarkWhy(lowAt: number, buildCost: number): string {
  if (lowAt <= 0) return "At 0 it warns only once you have none left.";
  const builds = Math.floor(lowAt / buildCost);
  if (builds === 0) return `That's less than one build (${buildCost} credits), so a build may have to wait before you're warned.`;
  const count = builds < WORDS.length ? WORDS[builds] : String(builds);
  return `At ${lowAt} you can still run ${count} ${builds === 1 ? "build" : "builds"} of one product (${buildCost} credits each), so you're warned before a build has to wait.`;
}

/** The live lot that expires first and still has credits in it. */
export function nextExpiring(ledger: LotLine[], now: number): { credits: number; expiresAt: number } | null {
  let next: { credits: number; expiresAt: number } | null = null;
  for (const lot of lotsOf(ledger)) {
    if (lot.expiresAt === null || lot.expiresAt <= now || lot.remaining <= 0) continue;
    if (!next || lot.expiresAt < next.expiresAt) next = { credits: lot.remaining, expiresAt: lot.expiresAt };
  }
  return next;
}

/** The next lot to expire, when it runs out within `days`. */
export function expiringWithin(ledger: LotLine[], days: number, now: number): { credits: number; expiresAt: number } | null {
  const next = nextExpiring(ledger, now);
  return next && next.expiresAt - now <= days * DAY ? next : null;
}

/** "Ask before a purchase over $X": strictly above it; never when unset. */
export function needsConfirm(amountUsd: number, confirmAbove: number | null): boolean {
  return confirmAbove !== null && amountUsd > confirmAbove;
}

/** One pause of one build: the build and when it was parked. */
export const pauseKey = (buildId: string, blockedAt: number) => `${buildId}@${blockedAt}`;

export type AutoTopUpDecision =
  | { buy: true; key: string }
  | { buy: false; why: "off" | "no-pause" | "tried" | "cap" | "too-small" | "covered" };

export function autoTopUpDecision(i: {
  on: boolean;
  /** What the chosen pack adds, bonus included. */
  packCredits: number;
  /** The build parked for credits, if any. */
  pause: { buildId: string; blockedAt: number; cost: number } | null;
  balance: number;
  ledger: readonly SpendLine[];
  cap: number | null;
  now: number;
  /** Pauses already tried, as pauseKey. */
  tried: readonly string[];
}): AutoTopUpDecision {
  if (!i.on) return { buy: false, why: "off" };
  if (!i.pause) return { buy: false, why: "no-pause" };
  const key = pauseKey(i.pause.buildId, i.pause.blockedAt);
  if (i.tried.includes(key)) return { buy: false, why: "tried" };
  if (!withinCap(i.ledger, i.cap, i.pause.cost, i.now)) return { buy: false, why: "cap" };
  if (i.balance >= i.pause.cost) return { buy: false, why: "covered" };
  if (i.balance + i.packCredits < i.pause.cost) return { buy: false, why: "too-small" };
  return { buy: true, key };
}

/** How many tried pauses are remembered. */
export const TRIED_MAX = 50;

/** `tried` with `key` added last, unique, the oldest dropped past TRIED_MAX. */
export function rememberTried(tried: readonly string[], key: string): string[] {
  return [...tried.filter((k) => k !== key), key].slice(-TRIED_MAX);
}

// ─────────────────────────────── the card's form ───────────────────────────

export type LimitsForm = { lowAt: string; remindDays: string; cap: string; confirmAbove: string };
export type LimitsValue = { lowAt: number; expiryReminderDays: number; monthlyCap: number | null; confirmAbove: number | null };

const digits = (t: string) => t.trim().replace(/,/g, "");

/** A whole number in [min, max], or null. */
function whole(t: string, min: number, max: number): number | null {
  const s = digits(t);
  if (!/^\d+$/.test(s)) return null;
  const v = Number(s);
  return v >= min && v <= max ? v : null;
}

/** The typed form → the values to save, or what is wrong with each field. */
export function readLimitsForm(f: LimitsForm): { ok: true; value: LimitsValue } | { ok: false; errors: Partial<Record<keyof LimitsForm, string>> } {
  const errors: Partial<Record<keyof LimitsForm, string>> = {};
  const lowAt = whole(f.lowAt, 0, 100_000);
  if (lowAt === null) errors.lowAt = "Enter a whole number of credits, 0 or more";
  const days = whole(f.remindDays, 1, 365);
  if (days === null) errors.remindDays = "Enter a number of days from 1 to 365";
  let cap: number | null = null;
  if (digits(f.cap) !== "") {
    cap = whole(f.cap, 1, 1_000_000);
    if (cap === null) errors.cap = "Enter a whole number of credits, or leave it empty for no limit";
  }
  let above: number | null = null;
  const dollars = digits(f.confirmAbove).replace(/^\$/, "");
  if (dollars !== "") {
    const v = /^\d+(\.\d{1,2})?$/.test(dollars) ? Number(dollars) : NaN;
    if (v > 0 && v <= 100_000) above = v;
    else errors.confirmAbove = "Enter an amount in dollars, like 10, or leave it empty";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { lowAt: lowAt as number, expiryReminderDays: days as number, monthlyCap: cap, confirmAbove: above } };
}
