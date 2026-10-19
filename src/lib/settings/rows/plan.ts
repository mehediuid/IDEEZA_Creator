import type { SettingsRowEntry } from "./types";

export const planRows: SettingsRowEntry[] = [
  { id: "plans", label: "Available plan", href: "/settings/plan", keywords: ["upgrade", "downgrade", "subscription", "tinkerer", "builder", "disruptor"] },
  { id: "credits", label: "Credits", href: "/settings/plan?tab=credits", keywords: ["buy credits", "top up", "credit history"] },
  { id: "credit-alerts", label: "Credit alerts and limits", href: "/settings/plan?tab=credits#credit-alerts", keywords: ["low credits", "spending limit", "auto top-up", "expiry"] },
  { id: "billing", label: "Billing history", href: "/settings/plan?tab=billing", keywords: ["invoice", "receipt", "payments"] },
  { id: "billing-details", label: "Billing details", href: "/settings/plan?tab=billing#billing-details", keywords: ["company", "vat", "tax id", "invoice address"] },
  { id: "payment", label: "Payment method", href: "/settings/plan?tab=payment", keywords: ["pay with", "token", "usdt", "idz", "card"] },
];
