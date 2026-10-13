// Billing history and invoices (User Panel V2 › Billing History 41549:164343,
// Invoice 41549:165299), derived from what was paid — the credits ledger's
// purchases and the subscription's orders — never stored beside them.
//
// One invoice per payment: its number, its lines (a plan period, or a credit
// pack), what was taken off (the plan's credit discount, the unused time of
// the plan an upgrade replaced), the total and how it was paid. A renewal is
// an invoice too, marked not charged: payments aren't on, so nothing moved.
//
// Pure, relative imports only: the ledger and order shapes are restated.

import { addMonths, type BillingCycle } from "../create/credit-pricing";
import { cycleMonths, planOf, type PlanTier } from "../create/plans";

/** A credits ledger line, as far as an invoice reads it. */
export type PaidLine = {
  id: string;
  reason: string;
  delta: number;
  ts: number;
  orderId?: string;
  bonus?: number;
  pack?: string;
  price?: number;
  listPrice?: number;
  paidWith?: string;
  txHash?: string;
  payer?: string;
};

/** A subscription order, as far as an invoice reads it. */
export type PaidOrder = {
  orderId: string;
  ts: number;
  tier: PlanTier;
  cycle: BillingCycle;
  amount: number;
  paidWith: string;
  kind: "start" | "renewal";
  price?: number;
  credit?: number;
  creditFrom?: PlanTier;
  txHash?: string;
  payer?: string;
};

export type InvoiceLine = { description: string; detail?: string; qty: number; unit: number; total: number };

export type Invoice = {
  /** The order id: the invoice's address. */
  id: string;
  number: string;
  ts: number;
  kind: "credits" | "plan" | "renewal";
  /** One line for the table: "Builder plan · monthly", "Pro pack · 550 credits". */
  item: string;
  lines: InvoiceLine[];
  /** Taken off the lines, as positive dollars. */
  adjustments: { label: string; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  /** What moved: `total`, or 0 for a renewal that wasn't charged. */
  paid: number;
  paidWith: string;
  status: "Paid" | "Not charged";
  txHash: string | null;
  payer: string | null;
  /** A plan invoice: the period it pays for. */
  period: { from: number; to: number } | null;
};

const cents = (n: number) => Math.round(n * 100) / 100;
const count = (n: number) => n.toLocaleString("en-US");

/** "INV-2026-7CZDDUY1": the payment's year and the end of its order id. */
export function invoiceNumber(orderId: string, ts: number): string {
  const tail = orderId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase();
  return `INV-${new Date(ts).getUTCFullYear()}-${tail}`;
}

function creditInvoice(e: PaidLine): Invoice {
  const id = e.orderId ?? e.id;
  const price = e.price ?? 0;
  const list = Math.max(price, e.listPrice ?? price);
  const bonus = e.bonus ?? 0;
  const base = e.delta - bonus;
  const description = e.pack ? `${e.pack} pack` : "Custom AI credits";
  const detail = bonus > 0 ? `${count(base)} AI credits + ${count(bonus)} bonus` : `${count(base)} AI credits`;
  const off = cents(list - price);
  return {
    id,
    number: invoiceNumber(id, e.ts),
    ts: e.ts,
    kind: "credits",
    item: `${description} · ${count(e.delta)} credits`,
    lines: [{ description, detail, qty: 1, unit: list, total: list }],
    adjustments: off > 0 ? [{ label: "Plan discount", amount: off }] : [],
    subtotal: list,
    tax: 0,
    total: price,
    paid: price,
    paidWith: e.paidWith ?? "—",
    status: "Paid",
    txHash: e.txHash ?? null,
    payer: e.payer ?? null,
    period: null,
  };
}

function planInvoice(o: PaidOrder): Invoice {
  const plan = planOf(o.tier);
  const renewal = o.kind === "renewal";
  const price = o.price ?? cents(o.amount + (o.credit ?? 0));
  const credit = o.credit ?? 0;
  const cycle = o.cycle === "yearly" ? "annual" : "monthly";
  const to = addMonths(o.ts, cycleMonths(o.cycle));
  return {
    id: o.orderId,
    number: invoiceNumber(o.orderId, o.ts),
    ts: o.ts,
    kind: renewal ? "renewal" : "plan",
    item: `${plan.name} plan · ${cycle}${renewal ? " renewal" : ""}`,
    lines: [
      {
        description: `${plan.name} plan`,
        detail: `${o.cycle === "yearly" ? "Billed yearly" : "Billed monthly"} · ${count(plan.credits)} AI credits a month`,
        qty: 1,
        unit: price,
        total: price,
      },
    ],
    adjustments: credit > 0 ? [{ label: `Unused time on ${o.creditFrom ? planOf(o.creditFrom).name : "your last plan"}`, amount: credit }] : [],
    subtotal: price,
    tax: 0,
    total: cents(price - credit),
    paid: renewal ? 0 : o.amount,
    paidWith: o.paidWith,
    status: renewal ? "Not charged" : "Paid",
    txHash: o.txHash ?? null,
    payer: o.payer ?? null,
    period: { from: o.ts, to },
  };
}

/** Every payment as an invoice, newest first. */
export function invoicesOf(ledger: readonly PaidLine[], orders: readonly PaidOrder[]): Invoice[] {
  return [...ledger.filter((e) => e.reason === "purchase").map(creditInvoice), ...orders.map(planInvoice)].sort((a, b) => b.ts - a.ts);
}

/** The years with a payment, newest first. */
export function invoiceYears(list: readonly Invoice[]): number[] {
  return [...new Set(list.map((i) => new Date(i.ts).getUTCFullYear()))].sort((a, b) => b - a);
}

/** The invoices a search and a year leave: the search matches the invoice number or the order id. */
export function filterInvoices(list: readonly Invoice[], query: string, year: number | null): Invoice[] {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  return list.filter(
    (i) =>
      (year === null || new Date(i.ts).getUTCFullYear() === year) &&
      (q === "" || i.number.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)),
  );
}
