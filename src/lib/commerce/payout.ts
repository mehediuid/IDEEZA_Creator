// "Request payout" (Build and Earn P1-4), a demo action gated at L4 (identity
// verified). Every sale already pays the seller's payout wallet in the demo
// (`Sale.payout`, the price less IDEEZA's fee); a payout request asks for what
// a project has earned and not yet requested, per chain and token, and stores
// the request under `ideeza:commerce:payouts`. Nothing is sent anywhere.
//
// A project with a sale can't be deleted, so a request never outlives its project.
//
// Pure apart from the guarded localStorage read and write; relative imports only.

import type { Sale } from "../market/types";
import { addAmounts, compareAmounts, formatAmount, subAmounts } from "../wallet/money";
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

/** What earlier requests for the project already asked for. */
export function requestedOf(requests: readonly PayoutRequest[], projectId: string): PayoutLine[] {
  return sumLines(requests.filter((r) => r.projectId === projectId).flatMap((r) => r.lines));
}

/** Earned less requested, per chain and token; only what's left over. */
export function availableOf(earned: readonly PayoutLine[], requested: readonly PayoutLine[]): PayoutLine[] {
  const asked = new Map(requested.map((l) => [keyOf(l), l.amount]));
  return earned
    .map((l) => ({ ...l, amount: subAmounts(l.amount, asked.get(keyOf(l)) ?? "0") }))
    .filter((l) => compareAmounts(l.amount, "0") > 0);
}

/** "0.975 ETH · 9.75 USDC" */
export function payoutLinesText(lines: readonly PayoutLine[]): string {
  return lines.map((l) => formatAmount(l.amount, l.token)).join(" · ");
}

export function payoutRequestOf(projectId: string, lines: readonly PayoutLine[], at: number, id: string): PayoutRequest {
  return { id, projectId, at, lines: lines.map((l) => ({ ...l })), demo: true };
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

/** Appends one request to what's stored now. `false`: the browser refused it. */
export function appendPayoutRequest(req: PayoutRequest): boolean {
  if (typeof window === "undefined") return false;
  try {
    const next = [...parsePayouts(readPayoutsRaw()), req];
    window.localStorage.setItem(PAYOUTS_KEY, JSON.stringify({ v: 1, requests: next }));
    return true;
  } catch {
    return false;
  }
}
