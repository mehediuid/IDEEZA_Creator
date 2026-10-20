import type { SettingsRowEntry } from "./types";

export const planRows: SettingsRowEntry[] = [
  { id: "plans", label: "Your plan", href: "/settings/plan", keywords: ["plan", "subscription", "upgrade", "downgrade", "cancel plan", "renew", "auto-renew"] },
  { id: "credits", label: "Credits", href: "/settings/plan?tab=credits", keywords: ["buy credits", "top up", "credit history", "balance"] },
  { id: "credit-alerts", label: "Credit alerts and limits", href: "/settings/plan?tab=credits#credit-alerts", keywords: ["low credits", "running low", "spending limit", "monthly limit", "auto top-up", "expiry"] },
  { id: "billing", label: "Invoices", href: "/settings/plan?tab=billing", keywords: ["invoice", "receipt", "billing history", "payments"] },
  { id: "billing-details", label: "Billing details", href: "/settings/plan?tab=billing#billing-details", keywords: ["company", "vat", "tax id", "invoice address", "gst", "ein"] },
  { id: "payment", label: "Pay with", href: "/settings/plan?tab=payment", keywords: ["payment method", "token", "usdt", "idz", "card", "bkash"] },
];
