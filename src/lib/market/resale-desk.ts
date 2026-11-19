// Earn for a project the buyer bought copies of (owner, 2026-11-19: "like the project's Earn, somewhere I see it
// all"): what its tiles, figures and activity say, from the purchases (purchases.ts), the holder's listings
// (resales.ts) and the units made (units.ts). The same shape as the project's own Earn: an Overview (what the copies
// earned, what is for sale, what to do next, what happened) and Sell (a board of the copies, one item panel).
//
// Pure. Relative imports only (node:test loads the compiled module).

import type { Token } from "../brief/types";
import { addAmounts, formatAmount } from "../wallet/money";
import type { Amount, DemoBuyerId } from "../wallet/types";
import { KIND_NAME, type PurchaseCopy, type PurchaseLine, type PurchaseUse, type PurchasedProject, type SoldCopy } from "./purchases";
import type { Resale } from "./resales";
import type { EditionKind } from "./types";
import { copyUnitsOf, type CopyUnits, type UnitsEntry } from "./units";

export type ResaleTile = {
  /** "copy:<key>" for a copy held, "sold:<listing id>" for one sold on. */
  key: string;
  kind: EditionKind;
  state: "held" | "listed" | "sold";
  /** "#8 of 50". */
  number: string;
  use: PurchaseUse;
  product: string | null;
  /** The asking price, or what it sold for; null while it has none. */
  price: string | null;
  units: CopyUnits | null;
  line: PurchaseLine | null;
  copy: PurchaseCopy | null;
  sold: SoldCopy | null;
};

const numberOf = (serial: number | null, of: number | null) => (serial === null ? "—" : of !== null ? `#${serial} of ${of}` : `#${serial}`);

export const tileKeyOfCopy = (copyKey: string) => `copy:${copyKey}`;

/** The board: every copy held, by kind and line, then every copy sold on, newest first. */
export function resaleTilesOf(p: PurchasedProject, buyerId: DemoBuyerId, log: readonly UnitsEntry[]): ResaleTile[] {
  const held: ResaleTile[] = p.lines.flatMap((l) =>
    l.kind === "main" || l.use === null
      ? []
      : l.copies.map((c) => ({
          key: tileKeyOfCopy(c.key),
          kind: l.kind as EditionKind,
          state: c.listing ? ("listed" as const) : ("held" as const),
          number: numberOf(c.serial, c.of),
          use: l.use as PurchaseUse,
          product: l.product,
          price: c.listing ? formatAmount(c.listing.price, c.listing.token) : null,
          units: l.unitsPerCopy !== null ? copyUnitsOf(c.key, l.unitsPerCopy, buyerId, log) : null,
          line: l,
          copy: c,
          sold: null,
        })),
  );
  const sold: ResaleTile[] = p.sold.map((s) => ({
    key: `sold:${s.id}`,
    kind: s.kind,
    state: "sold",
    number: numberOf(s.serial, s.of),
    use: s.use,
    product: s.product,
    price: formatAmount(s.price, s.token),
    units: null,
    line: null,
    copy: null,
    sold: s,
  }));
  return [...held, ...sold];
}

/** Sums per token, in first-seen order: "0.0525 ETH · 5 USDC"; null for none. */
export function perTokenText(items: readonly { amount: Amount; token: Token }[]): string | null {
  const sums = new Map<Token, Amount>();
  for (const x of items) sums.set(x.token, addAmounts(sums.get(x.token) ?? "0", x.amount));
  return sums.size ? [...sums].map(([t, a]) => formatAmount(a, t)).join(" · ") : null;
}

export type EarnFacts = {
  /** What selling copies on paid the buyer, after royalties and fees; null before the first sale. */
  earned: string | null;
  sold: number;
  forSale: number;
  /** The asking prices of what is for sale, summed per token. */
  asking: string | null;
  held: number;
  /** Units made with the Physical copies held, of their allowance; null with none held. */
  units: { made: number; allowance: number } | null;
  /** The whole project is the buyer's: it sells from its own Earn. */
  ownsProject: boolean;
};

export function earnFactsOf(p: PurchasedProject, buyerId: DemoBuyerId, log: readonly UnitsEntry[]): EarnFacts {
  const tiles = resaleTilesOf(p, buyerId, log);
  const held = tiles.filter((t) => t.state !== "sold");
  const listed = held.filter((t) => t.state === "listed");
  const physical = held.filter((t) => t.units !== null);
  return {
    earned: perTokenText(p.sold.map((s) => ({ amount: s.payout, token: s.token }))),
    sold: p.sold.length,
    forSale: listed.length,
    asking: perTokenText(listed.map((t) => ({ amount: (t.copy?.listing?.price ?? "0") as Amount, token: (t.copy?.listing?.token ?? "ETH") as Token }))),
    held: held.length,
    units: physical.length
      ? { made: physical.reduce((n, t) => n + (t.units?.made ?? 0), 0), allowance: physical.reduce((n, t) => n + (t.units?.allowance ?? 0), 0) }
      : null,
    ownsProject: p.lines.some((l) => l.kind === "main" && (l.sharePct ?? 0) >= 100),
  };
}

/** The one thing to do next, said once with its one button. */
export type EarnNext = { line: string; action: { label: string; to: "sell" | "buy" | "project" } | null };

export function earnNextOf(f: EarnFacts, p: Pick<PurchasedProject, "buyable">): EarnNext {
  if (f.held > 0 && f.forSale === 0)
    return { line: "Put a copy up for sale: you set the price, and it stays yours until someone buys it.", action: { label: "Sell a copy", to: "sell" } };
  if (f.forSale > 0)
    return {
      line: `${f.forSale === 1 ? "1 copy is" : `${f.forSale} copies are`} for sale on Explore marketplace. Change a price or take one off sale on Sell.`,
      action: { label: "Manage what's for sale", to: "sell" },
    };
  if (f.ownsProject) return { line: "The whole project is yours: it sells from its own Earn.", action: { label: "Open its Earn", to: "project" } };
  return f.sold > 0
    ? { line: "You sold every copy you had.", action: p.buyable.length ? { label: "Buy another copy", to: "buy" } : null }
    : { line: "Nothing to sell yet.", action: p.buyable.length ? { label: "Buy a copy", to: "buy" } : null };
}

export type EarnEvent = {
  id: string;
  at: number;
  kind: "bought" | "listed" | "off" | "sold" | "units";
  text: string;
  /** "+0.0525 ETH" earned, "−0.05 ETH" paid; null when no money moved. */
  amount: string | null;
};

/** What happened with the buyer's copies of this project, newest first. */
export function earnEventsOf(p: PurchasedProject, buyerId: DemoBuyerId, resales: readonly Resale[], log: readonly UnitsEntry[]): EarnEvent[] {
  const out: EarnEvent[] = [];
  const nameOf = (kind: EditionKind, use: PurchaseUse | null) => [KIND_NAME[kind], use].filter(Boolean).join(" · ");
  const keys = new Map<string, string>();
  for (const l of p.lines) {
    if (l.kind === "main") continue;
    for (const c of l.copies) {
      const n = numberOf(c.serial, c.of);
      keys.set(c.key, n);
      out.push({
        id: `bought:${c.id}`,
        at: c.at,
        kind: "bought",
        text: `Bought ${n} · ${nameOf(l.kind, l.use)} from ${c.from ?? p.creator}`,
        amount: `−${formatAmount(c.price, c.token)}`,
      });
    }
  }
  for (const s of p.sold) {
    keys.set(s.copyKey, numberOf(s.serial, s.of));
    if (s.bought)
      out.push({
        id: `bought-sold:${s.id}`,
        at: s.bought.at,
        kind: "bought",
        text: `Bought ${numberOf(s.serial, s.of)} · ${nameOf(s.kind, s.use)} from ${s.bought.from}`,
        amount: `−${formatAmount(s.bought.price, s.bought.token)}`,
      });
    out.push({
      id: `sold:${s.id}`,
      at: s.at,
      kind: "sold",
      text: `Sold ${numberOf(s.serial, s.of)} · ${nameOf(s.kind, s.use)} to ${s.to} for ${formatAmount(s.price, s.token)}`,
      amount: `+${formatAmount(s.payout, s.token)}`,
    });
  }
  for (const r of resales) {
    if (r.sellerId !== buyerId || r.projectId !== p.id) continue;
    const n = numberOf(r.serial, r.of);
    out.push({ id: `listed:${r.id}`, at: r.listedAt, kind: "listed", text: `Put ${n} up for sale${r.status === "listed" ? ` at ${formatAmount(r.price, r.token)}` : ""}`, amount: null });
    if (r.status === "cancelled" && r.cancelledAt !== null) out.push({ id: `off:${r.id}`, at: r.cancelledAt, kind: "off", text: `Took ${n} off sale`, amount: null });
  }
  for (const e of log) {
    const n = keys.get(e.copyKey);
    if (!n || e.holder !== buyerId) continue;
    out.push({ id: `units:${e.id}`, at: e.at, kind: "units", text: `Made ${e.units} ${e.units === 1 ? "unit" : "units"} with ${n}`, amount: null });
  }
  return out.sort((a, b) => b.at - a.at);
}
