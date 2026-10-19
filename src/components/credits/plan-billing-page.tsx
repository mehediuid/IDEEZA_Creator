"use client";

// Settings › Plan & billing (Settings v2, V6): one page in the settings
// frame, its sections in the order people reach for them — Your plan,
// Credits, Buy credits, Credit alerts and limits, Pay with, Billing details,
// Invoices. Each section is a card whose id is its address
// (/settings/plan#invoices). The plan cards, the comparison and the FAQs are
// on Pricing (/settings/plan/pricing), from Your plan's "Change plan".
//
// Plan & pricing had tabs (?tab=credits|billing|payment). Those links are
// still in the bell and in older pages, so a ?tab= lands on the section that
// replaced the tab, and the address is rewritten to its #section.

import * as React from "react";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { sectionOfTab } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { BillingDetailsCard } from "./billing-details";
import { InvoicesCard } from "./billing-history";
import { BuyCreditsCard } from "./buy-credits-card";
import { CreditAlertsCard } from "./credit-alerts";
import { CreditsCard } from "./credits-summary";
import { PayWithCard } from "./pay-with";
import { YourPlanCard } from "./your-plan";

export function PlanBillingPage() {
  const { hydrated: planReady } = useCreatePlan();
  const { hydrated: creditsReady } = useCredits();
  const ready = planReady && creditsReady;

  // Once the plan and credits are read (the sections above the target have
  // their height), land on the section: an older ?tab= becomes its #section,
  // and the frame's arrival outline is asked again for the settled layout.
  React.useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    const tab = url.searchParams.get("tab");
    if (tab !== null) {
      const id = url.hash.slice(1) || sectionOfTab(tab);
      url.searchParams.delete("tab");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${id ? `#${id}` : ""}`);
    }
    if (window.location.hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, [ready]);

  return (
    <SettingsFrame
      page="plan"
      description="Your plan, your AI credits and what you've paid. Payments in this demo come from the Demo wallet on testnet; no real money moves."
    >
      <YourPlanCard />
      <CreditsCard />
      <BuyCreditsCard />
      <CreditAlertsCard />
      <PayWithCard />
      <BillingDetailsCard />
      <InvoicesCard />
    </SettingsFrame>
  );
}
