"use client";

// Settings › Plan & pricing (User Panel V2, "✅ Pricing" page), on the white
// sheet with the breadcrumb and four tabs: Available plan, Credits, Billing
// history (every payment, each with its invoice) and Payment method. Your
// plan sits over Billing history and Payment method, as the design puts it.
// Billing history ends with the Billing details card (#billing-details) the
// invoices print; Credits ends with Credit alerts and limits (#credit-alerts).
//
// The tab is in the URL (?tab=credits, ?tab=billing, ?tab=payment), so a link
// lands on it and a refresh keeps it.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BillingDetailsCard } from "./billing-details";
import { BillingHistory } from "./billing-history";
import { CreditsPanel } from "./credits-panel";
import { PaymentMethodPanel } from "./payment-method-panel";
import { PlanBanner } from "./plan-banner";
import { PlansPanel } from "./plans-panel";
import { PricingFrame, PricingTabs, type PricingTab } from "./pricing-frame";

type Tab = "plans" | "credits" | "billing" | "payment";
const TABS: readonly PricingTab<Tab>[] = [
  { id: "plans", label: "Available plan" },
  { id: "credits", label: "Credits" },
  { id: "billing", label: "Billing history" },
  { id: "payment", label: "Payment method" },
];
const isTab = (v: string | null): v is Exclude<Tab, "plans"> => v === "credits" || v === "billing" || v === "payment";

export function PlanPricingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const asked = params.get("tab");
  const tab: Tab = isTab(asked) ? asked : "plans";
  const select = (id: Tab) => router.replace(id === "plans" ? pathname : `${pathname}?tab=${id}`, { scroll: false });

  return (
    <PricingFrame crumbs={[{ label: "Settings", href: "/settings" }, { label: "Plan & pricing" }]}>
      <h1 className="sr-only">Plan &amp; pricing</h1>
      <PricingTabs label="Plan and pricing sections" tabs={TABS} active={tab} onSelect={select} />
      <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-[32px]">
        {(tab === "billing" || tab === "payment") && <PlanBanner onSeePlans={() => select("plans")} />}
        {tab === "plans" ? <PlansPanel /> : tab === "credits" ? <CreditsPanel /> : tab === "billing" ? <BillingHistory /> : <PaymentMethodPanel />}
        {tab === "billing" && <BillingDetailsCard />}
      </section>
    </PricingFrame>
  );
}
