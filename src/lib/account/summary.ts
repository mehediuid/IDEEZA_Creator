// What the account popover says about the maker, derived from the credits
// ledger (lib/create/credits.tsx) — never stored beside it.
//
// Balance: `total` is every credit the account was given (the starting seed
// and each top-up), `remaining` is what is left of it. A refund only gives a
// charge back, so it is in `remaining` but not in `total`.
//
// Level: XP is earned by making — each concept render and each product build
// that was charged and not refunded. The levels and their thresholds are
// LEVELS; the popover shows "xp / cap" where cap is the last XP of the
// current level, as the design draws it ("270 / 499 XP").
//
// Pure, no imports: the ledger shape is restated as `LedgerLine`.

export type LedgerLine = { delta: number; reason: string; buildId?: string };

export type CreditTotals = { total: number; remaining: number };

export function creditTotals(ledger: LedgerLine[]): CreditTotals {
  let total = 0;
  let remaining = 0;
  for (const e of ledger) {
    remaining += e.delta;
    if (e.reason === "seed" || e.reason === "topup") total += e.delta;
  }
  return { total, remaining: Math.max(0, remaining) };
}

/** XP per charge that stuck, by what was charged. */
export const XP_PER = { concept: 10, build: 50 } as const;

export const LEVELS = [
  { name: "Explorer", from: 0 },
  { name: "Maker", from: 500 },
  { name: "Inventor", from: 1500 },
  { name: "Pioneer", from: 4000 },
] as const;

export function xpOf(ledger: LedgerLine[]): number {
  // A refund cancels the latest charge on its id, so XP follows the charges
  // that are still open — a failed build that was refunded earns nothing.
  const open = new Map<string, Array<keyof typeof XP_PER>>();
  for (const e of ledger) {
    if (!e.buildId) continue;
    const stack = open.get(e.buildId) ?? [];
    if (e.reason === "build" || e.reason === "concept") stack.push(e.reason);
    else if (e.reason === "refund") stack.pop();
    open.set(e.buildId, stack);
  }
  let xp = 0;
  for (const stack of open.values()) for (const r of stack) xp += XP_PER[r];
  return xp;
}

export type Level = {
  name: string;
  xp: number;
  /** The last XP of this level; null at the top level. */
  cap: number | null;
  /** How far through this level, 0–1 (1 at the top level). */
  progress: number;
};

export function levelOf(xp: number): Level {
  const safe = Math.max(0, Math.trunc(xp));
  let i = 0;
  while (i + 1 < LEVELS.length && safe >= LEVELS[i + 1].from) i += 1;
  const here = LEVELS[i];
  const next = LEVELS[i + 1];
  if (!next) return { name: here.name, xp: safe, cap: null, progress: 1 };
  return {
    name: here.name,
    xp: safe,
    cap: next.from - 1,
    progress: (safe - here.from) / (next.from - here.from),
  };
}
