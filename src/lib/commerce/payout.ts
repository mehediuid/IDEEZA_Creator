// What a project's sales paid its seller, per chain and token (Build and Earn
// P1-4): the Earn overview's "earned" fact. Every sale pays the seller's
// payout wallet in the demo (`Sale.payout`, the price less IDEEZA's fee).
//
// Earnings are withdrawn from one account balance in Settings › Get Paid
// (Settings spec D3, lib/account/payout.ts). The per-project "Request payout"
// that came before it stored its requests under `ideeza:commerce:payouts`;
// nothing writes that key now, and Get Paid reads each request there as a
// pending withdrawal, so none is lost.
//
// Pure apart from the guarded localStorage read; relative imports only.

import type { Sale } from "../market/types";
import { addAmounts, compareAmounts, formatAmount } from "../wallet/money";
import type { Amount } from "../wallet/types";

export const PAYOUTS_KEY = "ideeza:commerce:payouts";

export type PayoutLine = { network: Sale["network"]; token: Sale["token"]; amount: Amount };
export type PayoutRequest = { id: string; projectId: string; at: number; lines: PayoutLine[]; demo: true };

type Earning = Pick<Sale, "projectId" | "network" | "token" | "payout">;

const keyOf = (l: Pick<PayoutLine, "network" | "token">) => `${l.network}:${l.token}`;

/** Lines summed per chain and token, in first-seen order, zero lines dropped. */
function sumLines(lines: readonly PayoutLine[]): PayoutLine[] {
  const out = new Map<string, PayoutLine>();
  for (const l of lines) {
    const k = keyOf(l);
    const prev = out.get(k);
    out.set(k, prev ? { ...prev, amount: addAmounts(prev.amount, l.amount) } : { ...l });
  }
  return [...out.values()].filter((l) => compareAmounts(l.amount, "0") > 0);
}

/** What the project's sales (Main and editions) paid its seller, per chain and token. */
export function earnedOf(sales: readonly Earning[], projectId: string): PayoutLine[] {
  return sumLines(
    sales.filter((s) => s.projectId === projectId).map((s) => ({ network: s.network, token: s.token, amount: s.payout })),
  );
}

/** "0.975 ETH · 9.75 USDC" */
export function payoutLinesText(lines: readonly PayoutLine[]): string {
  return lines.map((l) => formatAmount(l.amount, l.token)).join(" · ");
}

function isDict(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeLine(raw: unknown): PayoutLine | null {
  if (!isDict(raw) || typeof raw.network !== "string" || typeof raw.token !== "string" || typeof raw.amount !== "string") return null;
  return { network: raw.network as PayoutLine["network"], token: raw.token as PayoutLine["token"], amount: raw.amount };
}

/** The stored list; a malformed row is dropped, never the whole list. */
export function normalizePayouts(raw: unknown): PayoutRequest[] {
  if (!isDict(raw) || !Array.isArray(raw.requests)) return [];
  return raw.requests.flatMap((r): PayoutRequest[] => {
    if (!isDict(r) || r.demo !== true || typeof r.id !== "string" || typeof r.projectId !== "string") return [];
    if (typeof r.at !== "number" || !Number.isFinite(r.at) || !Array.isArray(r.lines)) return [];
    const lines = r.lines.map(normalizeLine).filter((l): l is PayoutLine => l !== null);
    return lines.length ? [{ id: r.id, projectId: r.projectId, at: r.at, lines, demo: true }] : [];
  });
}

export function parsePayouts(raw: string | null): PayoutRequest[] {
  if (!raw) return [];
  try {
    return normalizePayouts(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function readPayoutsRaw(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(PAYOUTS_KEY);
  } catch {
    return null;
  }
}
