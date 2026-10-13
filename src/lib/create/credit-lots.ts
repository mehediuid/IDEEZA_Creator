// Credits as lots: each credit that came in — the starting balance, a top-up,
// a purchase — is a lot with its own expiry, and spending takes from the lot
// that expires first ("Credit History", Figma 41549:172078: per purchase, the
// credits left and the expiry date). Derived from the ledger by replaying it,
// never stored beside it, so it can't drift from the balance.
//
// - The starting balance never expires. A top-up or a purchase expires
//   VALIDITY_MONTHS after it came in (its `expiresAt`, or that rule for a
//   ledger written before purchases had one); a plan's monthly grant at the
//   end of its period (`expiresAt`).
// - A charge (a build, a concept render) takes from the earliest-expiring lot
//   still live when it was charged. A refund puts the credits back where its
//   charge took them from.
// - An `expiry` entry is the ledger saying a lot ran out of time; it empties
//   that lot. `expiredLines` writes them, so the balance follows.
//
// Pure: the ledger shape is restated as `LotLine`.

import { VALIDITY_MONTHS, addMonths } from "./credit-pricing";

export type LotLine = {
  id: string;
  delta: number;
  reason: string;
  buildId?: string;
  ts: number;
  expiresAt?: number;
  /** An `expiry` line: the lot it empties. */
  lotId?: string;
  bonus?: number;
};

export type Lot = {
  /** The ledger line it came from. */
  id: string;
  reason: string;
  ts: number;
  /** null: never expires (the starting balance). */
  expiresAt: number | null;
  /** Everything it brought in, bonus included. */
  amount: number;
  bonus: number;
  remaining: number;
};

const INCOMING = new Set(["seed", "topup", "purchase", "grant"]);
const SPENDING = new Set(["build", "concept"]);

export function expiryOf(line: LotLine): number | null {
  if (line.reason === "seed") return null;
  return line.expiresAt ?? addMonths(line.ts, VALIDITY_MONTHS);
}

/** Lots in the order spending takes them: earliest expiry first, never-expiring last. */
function spendOrder(lots: Lot[], at: number): Lot[] {
  return lots
    .filter((l) => l.remaining > 0 && (l.expiresAt === null || l.expiresAt > at))
    .sort((a, b) => (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity) || a.ts - b.ts);
}

export function lotsOf(ledger: LotLine[]): Lot[] {
  const lots: Lot[] = [];
  const byId = new Map<string, Lot>();
  // Per charged id, what each charge took and from where, newest last — a
  // refund gives back the latest one, as refundState pairs it.
  const taken = new Map<string, Array<Array<[Lot, number]>>>();

  for (const line of ledger) {
    if (INCOMING.has(line.reason) && line.delta > 0) {
      const lot: Lot = {
        id: line.id,
        reason: line.reason,
        ts: line.ts,
        expiresAt: expiryOf(line),
        amount: line.delta,
        bonus: Math.max(0, line.bonus ?? 0),
        remaining: line.delta,
      };
      lots.push(lot);
      byId.set(lot.id, lot);
    } else if (SPENDING.has(line.reason) && line.delta < 0) {
      let need = -line.delta;
      const parts: Array<[Lot, number]> = [];
      for (const lot of spendOrder(lots, line.ts)) {
        if (need <= 0) break;
        const n = Math.min(lot.remaining, need);
        lot.remaining -= n;
        need -= n;
        parts.push([lot, n]);
      }
      if (line.buildId) {
        const stack = taken.get(line.buildId) ?? [];
        stack.push(parts);
        taken.set(line.buildId, stack);
      }
    } else if (line.reason === "refund" && line.buildId) {
      const parts = taken.get(line.buildId)?.pop() ?? [];
      for (const [lot, n] of parts) lot.remaining += n;
    } else if (line.reason === "expiry" && line.lotId) {
      const lot = byId.get(line.lotId);
      if (lot) lot.remaining = Math.max(0, lot.remaining + line.delta);
    }
  }
  return lots;
}

/** The `expiry` lines due at `now`: one per lot past its date with credits left. */
export function expiredLines(ledger: LotLine[], now: number): Array<{ lotId: string; delta: number }> {
  return lotsOf(ledger)
    .filter((l) => l.expiresAt !== null && l.expiresAt <= now && l.remaining > 0)
    .map((l) => ({ lotId: l.id, delta: -l.remaining }));
}
