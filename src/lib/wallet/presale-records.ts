// The demo presale's purchases and claims, read from the wallet activity
// (spec 2026-10-19-balance-buy-idz-design.md). A purchase is a confirmed
// `buyIdz` line carrying `presale`; a claim is a confirmed `claimIdz` line
// naming it. Nothing here is stored on its own: `balancesOf` credits a
// claimed purchase's IDZ from these same lines, so the balance, the holdings
// and the purchase table can't disagree.
//
// Pure, relative imports only (balances.ts reads it).

import type { Network } from "../brief/types";
import { addAmounts } from "./money";
import type { Amount, DemoWallet, IdentityId, PresaleBuy, WalletActivity } from "./types";

export type PurchaseStatus = "locked" | "claimable" | "claimed";

export const PURCHASE_STATUSES: readonly { value: PurchaseStatus; label: string }[] = [
  { value: "locked", label: "Locked" },
  { value: "claimable", label: "Ready to claim" },
  { value: "claimed", label: "Claimed" },
];

export type Purchase = {
  id: string;
  at: number;
  identity: IdentityId;
  network: Network;
  txHash: string | null;
  buy: PresaleBuy;
  /** The first claim of it; null until it is claimed. */
  claim: { id: string; at: number; txHash: string | null } | null;
};

function isBuy(a: WalletActivity): a is WalletActivity & { presale: PresaleBuy } {
  return a.purpose === "buyIdz" && !!a.presale;
}

/** Each purchase's first claim by the purchase's own identity: a second one (another tab) is
 *  ignored, and so is another identity's. Keyed by purchase id and identity. */
function claimsOf(w: DemoWallet | undefined): Map<string, WalletActivity> {
  const first = new Map<string, WalletActivity>();
  for (const a of w?.activity ?? []) {
    if (a.purpose !== "claimIdz" || !a.claims) continue;
    const key = `${a.claims}|${a.identity}`;
    const seen = first.get(key);
    if (!seen || a.at < seen.at) first.set(key, a);
  }
  return first;
}

function purchasesIn(w: DemoWallet | undefined, id: IdentityId | null): Purchase[] {
  const claims = claimsOf(w);
  const out: Purchase[] = [];
  for (const a of w?.activity ?? []) {
    if (!isBuy(a) || (id !== null && a.identity !== id)) continue;
    const c = claims.get(`${a.id}|${a.identity}`);
    const claim = c ? { id: c.id, at: c.at, txHash: c.txHash ?? null } : null;
    out.push({ id: a.id, at: a.at, identity: a.identity, network: a.network, txHash: a.txHash ?? null, buy: a.presale, claim });
  }
  return out.sort((x, y) => y.at - x.at);
}

/** Every presale purchase of `id`, newest first, each with its claim. */
export function purchasesOf(w: DemoWallet | undefined, id: IdentityId): Purchase[] {
  return purchasesIn(w, id);
}

export function purchaseStatusOf(p: Purchase, now: number): PurchaseStatus {
  if (p.claim) return "claimed";
  return now >= p.buy.unlocksAt ? "claimable" : "locked";
}

/** The IDZ of every claimed purchase of `id` — what `balancesOf` adds. */
export function claimedIdzOf(w: DemoWallet | undefined, id: IdentityId): Amount {
  return addAmounts(...purchasesIn(w, id).filter((p) => p.claim).map((p) => p.buy.idz));
}

/** "Total USD raised": the dollar worth of every demo purchase in this wallet, any account. */
export function totalRaisedOf(w: DemoWallet | undefined): Amount {
  return addAmounts(...purchasesIn(w, null).map((p) => p.buy.usd));
}

/** `month` is 0–11 and `year` four digits, both in local time — as the dates are written. */
export type PurchaseFilter = {
  network: Network | "all";
  status: PurchaseStatus | "all";
  month: number | "all";
  year: number | "all";
};

export function filterPurchases(rows: readonly Purchase[], f: PurchaseFilter, now: number): Purchase[] {
  return rows.filter((p) => {
    const d = new Date(p.at);
    return (
      (f.network === "all" || p.network === f.network) &&
      (f.status === "all" || purchaseStatusOf(p, now) === f.status) &&
      (f.month === "all" || d.getMonth() === f.month) &&
      (f.year === "all" || d.getFullYear() === f.year)
    );
  });
}

/** The Year filter's choices: every year with a purchase, newest first; this year when there are none. */
export function purchaseYearsOf(rows: readonly Purchase[], now: number): number[] {
  const years = [...new Set(rows.map((p) => new Date(p.at).getFullYear()))].sort((a, b) => b - a);
  return years.length ? years : [new Date(now).getFullYear()];
}
