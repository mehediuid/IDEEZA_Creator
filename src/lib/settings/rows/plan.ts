import type { SettingsRowEntry } from "./types";

// Plan & billing is one page of sections; each row is a section's card,
// opened as /settings/plan#<id>. Plan cards and the comparison are on
// Pricing, reached from Your plan's "Change plan".
export const planRows: SettingsRowEntry[] = [
  { id: "your-plan", label: "Your plan", keywords: ["plan", "subscription", "upgrade", "downgrade", "change plan", "cancel plan", "renew", "auto-renew", "pricing", "compare plans"] },
  { id: "credits", label: "Credits", keywords: ["balance", "credit history", "expiry", "spent", "spending", "usage", "by project"] },
  { id: "buy-credits", label: "Buy credits", keywords: ["top up", "pack", "starter", "pro", "power", "custom amount", "discount"] },
  { id: "credit-alerts", label: "Credit alerts and limits", keywords: ["low credits", "running low", "spending limit", "monthly limit", "auto top-up", "expiry reminder", "ask before"] },
  { id: "pay-with", label: "Pay with", keywords: ["payment method", "token", "usdt", "idz", "card", "paypal", "wallet"] },
  { id: "billing-details", label: "Billing details", keywords: ["company", "vat", "tax id", "invoice address", "gst", "ein"] },
  { id: "invoices", label: "Invoices", keywords: ["invoice", "receipt", "billing history", "payments", "pdf"] },
];
