"use client";

// Settings › Plan & pricing (User Panel V2, "✅ Pricing" page), on the page
// frame under its header, with four tabs: Available plan, Credits, Billing
// history (every payment, each with its invoice) and Payment method. Your
// plan sits over Billing history and Payment method, as the design puts it.
//
// The tab is in the URL (?tab=credits, ?tab=billing, ?tab=payment), so a link
// lands on it and a refresh keeps it.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
    <PricingFrame crumbs={[{ label: "Settings" }, { label: "Plan & pricing" }]} title="Plan & pricing">
      <PricingTabs label="Plan and pricing sections" tabs={TABS} active={tab} onSelect={select} />
      <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-16 flex flex-col gap-[32px]">
        {(tab === "billing" || tab === "payment") && <PlanBanner onSeePlans={() => select("plans")} />}
        {tab === "plans" ? <PlansPanel /> : tab === "credits" ? <CreditsPanel /> : tab === "billing" ? <BillingHistory /> : <PaymentMethodPanel />}
      </section>
    </PricingFrame>
  );
}
