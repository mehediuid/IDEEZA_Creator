"use client";

// Settings › Plan & pricing (User Panel V2, "✅ Pricing" page). Your plan
// sits above the tabs on every one of them (plan-banner, with its details),
// then: Plans (the design's "Available Plan"), Credits, Billing history —
// every payment, for a plan or for credits, each with its invoice — and
// Payment method (the Demo wallet and the token a checkout opens on).
//
// The tab is in the URL (?tab=credits, ?tab=billing, ?tab=payment), so a link
// lands on it and a refresh keeps it.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TabStrip, type TabDef } from "@/components/projects/details/tab-strip";
import { BillingHistory } from "./billing-history";
import { CreditsPanel } from "./credits-panel";
import { PaymentMethodPanel } from "./payment-method-panel";
import { PlanBanner } from "./plan-banner";
import { PlansPanel } from "./plans-panel";

type Tab = "plans" | "credits" | "billing" | "payment";
const TABS: readonly TabDef<Tab>[] = [
  { id: "plans", label: "Plans" },
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
    <div className="h-full overflow-y-auto bg-bg-page">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-[24px] px-[32px] py-[28px] max-md:px-[16px] max-md:py-[20px]">
        <header className="flex flex-col gap-[4px]">
          <nav aria-label="Breadcrumb" className="text-sm leading-sm text-text-tertiary">
            Settings <span aria-hidden>›</span> <span className="text-text-secondary">Plan &amp; pricing</span>
          </nav>
          <h1 className="text-3xl font-semibold leading-3xl text-text-primary">Plan &amp; pricing</h1>
        </header>

        <PlanBanner onSeePlans={() => select("plans")} />

        <TabStrip label="Plan and pricing sections" groups={[TABS]} active={tab} onSelect={select} />

        <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "plans" ? (
            <PlansPanel />
          ) : tab === "credits" ? (
            <CreditsPanel />
          ) : tab === "billing" ? (
            <BillingHistory />
          ) : (
            <PaymentMethodPanel />
          )}
        </section>
      </div>
    </div>
  );
}
