import type { SettingsRowEntry } from "./types";

// Plan & pricing keeps its own tabs (?tab=…), so every row names its tab; the
// hash lands on the card or row (credits/credit-alerts.tsx, billing-details.tsx).
const CREDITS = "/settings/plan?tab=credits";
const BILLING = "/settings/plan?tab=billing";

export const planRows: SettingsRowEntry[] = [
  { id: "plans", label: "Available plan", href: "/settings/plan", keywords: ["upgrade", "downgrade", "subscription", "tinkerer", "builder", "disruptor"] },
  { id: "credits", label: "Credits", href: CREDITS, keywords: ["buy credits", "top up", "credit history"] },
  { id: "credit-alerts", label: "Credit alerts and limits", href: `${CREDITS}#credit-alerts`, keywords: ["low credits", "spending limit", "auto top-up", "expiry"] },
  { id: "credit-low-at", label: "Running low at", help: "When the account menu warns you about your balance", href: `${CREDITS}#credit-low-at`, keywords: ["low credits", "warning", "balance"] },
  { id: "credit-expiry", label: "Remind me before credits expire", help: "Days before bought or plan credits run out", href: `${CREDITS}#credit-expiry`, keywords: ["expiry", "expire", "reminder"] },
  { id: "credit-monthly-limit", label: "Monthly spending limit", help: "Credits AI work can spend in a calendar month", href: `${CREDITS}#credit-monthly-limit`, keywords: ["cap", "budget", "spending limit", "pause builds"] },
  { id: "credit-confirm-above", label: "Ask before a purchase over", help: "One more confirm above an amount", href: `${CREDITS}#credit-confirm-above`, keywords: ["confirm", "purchase", "checkout"] },
  { id: "credit-auto-top-up", label: "Auto top-up", help: "Off unless you turn it on", href: `${CREDITS}#credit-auto-top-up`, keywords: ["automatic", "refill", "top up"] },
  { id: "billing", label: "Billing history", href: BILLING, keywords: ["invoice", "receipt", "payments"] },
  { id: "billing-details", label: "Billing details", help: "Name or company, tax ID, address and email on invoices", href: `${BILLING}#billing-details`, keywords: ["company", "vat", "gst", "ein", "tax id", "invoice address", "billing email"] },
  { id: "payment", label: "Payment method", help: "The token you pay with", href: "/settings/plan?tab=payment", keywords: ["pay with", "token", "usdt", "idz", "card"] },
];
