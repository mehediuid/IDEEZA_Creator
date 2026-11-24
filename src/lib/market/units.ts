// How many units a Physical NFT copy lets its holder make, and how many are made (owner, 2026-11-19: "after
// buying one Physical NFT I may be able to manufacture 50. If I make 10 of the 50 and then sell it, how many can
// the buyer make? — keep that logic clear"; plan 6rPKBgwzQ6r6woYmjfE6Td, D10 + D11).
//
// - Each copy carries its own allowance, by its use: Personal use allows 1 unit, Business use 50. It is IDEEZA's
//   own rule, never the creator's (owner, 2026-11-24: "how many units a copy can make, the creator can't set —
//   that is IDEEZA's own logic"); the creator sets only how many copies are sold.
// - Each copy counts its own units: they never move to another copy and never split, since a copy is one token.
// - A manufacturing order takes units from one copy, no more than it has left (the flow comes later; the log
//   below is what an order writes).
// - Units made stay made, the holder's. Selling the copy hands the buyer the units left; the seller keeps what
//   they made (and, for Business use, may still sell those units).
// - A copy is known by a key that doesn't change when it is sold again: its project, its listing row and its
//   number.
//
// Pure. Relative imports only (node:test loads the compiled module).

import type { DemoBuyerId } from "../wallet/types";

export type UnitsUse = "Personal use" | "Business use";

/** IDEEZA's allowance per copy, by use. No listing changes it. */
export const IDEEZA_UNITS: Record<UnitsUse, number> = { "Personal use": 1, "Business use": 50 };

export const UNITS_KEY = "ideeza:market:units";

/** One manufacturing order: units taken from one copy, by its holder at the time. */
export type UnitsEntry = { id: string; copyKey: string; holder: DemoBuyerId; units: number; at: number };

export type CopyUnits = {
  allowance: number;
  /** Made with this copy so far, by anyone who held it. */
  made: number;
  /** Made by the holder now (what stays theirs if they sell). */
  madeByHolder: number;
  left: number;
};

/** A copy's allowance: IDEEZA's number for its use; 0 for no use (a Virtual copy makes nothing). */
export function unitsAllowanceOf(use: UnitsUse | null): number {
  return use ? IDEEZA_UNITS[use] : 0;
}

/** A copy's units: its allowance, what is made with it, what is left. */
export function copyUnitsOf(copyKey: string, allowance: number, holder: DemoBuyerId, log: readonly UnitsEntry[]): CopyUnits {
  const mine = log.filter((e) => e.copyKey === copyKey);
  const made = Math.min(allowance, mine.reduce((n, e) => n + e.units, 0));
  const madeByHolder = mine.filter((e) => e.holder === holder).reduce((n, e) => n + e.units, 0);
  return { allowance, made, madeByHolder: Math.min(madeByHolder, made), left: Math.max(0, allowance - made) };
}

/** What a sale of the copy hands over and what stays: the buyer gets the units left; the seller keeps what they made. */
export function unitsOnResale(u: CopyUnits): { buyerGets: number; sellerKeeps: number } {
  return { buyerGets: u.left, sellerKeeps: u.madeByHolder };
}

/** "10 of 50 made · 40 left" · "0 of 1 made · 1 left" · "50 of 50 made · none left". */
export function unitsLineOf(u: CopyUnits): string {
  const unit = u.allowance === 1 ? "unit" : "units";
  return `${u.made} of ${u.allowance} ${unit} made · ${u.left === 0 ? "none left" : `${u.left} left`}`;
}

/** The stored log; a malformed entry is dropped, never the log. */
export function normalizeUnits(raw: unknown): UnitsEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    if (typeof r !== "object" || r === null) return [];
    const { id, copyKey, holder, units, at } = r as Record<string, unknown>;
    if (typeof id !== "string" || typeof copyKey !== "string" || typeof holder !== "string") return [];
    if (typeof units !== "number" || !Number.isInteger(units) || units < 1 || typeof at !== "number") return [];
    return [{ id, copyKey, holder: holder as DemoBuyerId, units, at }];
  });
}

/** A copy's key for one of this browser's own listings: its project, its track and its number. */
export const ownCopyKeyOf = (projectId: string, trackId: string, serial: number) => `${projectId}:${trackId}:#${serial}`;
/** A copy's key for another creator's sample: its feed id, its kind and use, its number. */
export const sampleCopyKeyOf = (feedId: string, kind: string, use: string, serial: number) => `${feedId}:${kind}:${use}:#${serial}`;

/** A Physical copy's allowance on its Use row (owner, 2026-11-24: "how many can a Personal or Business copy
 *  make? say it where I pick"): "Makes up to 1 unit" · "Makes up to 50 units". */
export function unitsUpToOf(n: number): string {
  return `Makes up to ${n} ${n === 1 ? "unit" : "units"}`;
}

/** What a Physical listing says before anyone buys, so the buyer knows what a copy lets them make. */
export function listingUnitsLine(): string {
  const p = IDEEZA_UNITS["Personal use"];
  const b = IDEEZA_UNITS["Business use"];
  return `Each copy lets you make up to ${p} ${p === 1 ? "unit" : "units"} for Personal use or ${b} for Business use. If you sell the copy, the units left go with it.`;
}
