// /settings/plan — Plan & pricing: Credits (default) and Billing history
// (?tab=billing). `useSearchParams` inside needs a Suspense boundary so the
// route shell pre-renders before the query is known.

import * as React from "react";
import { PlanPricingPage } from "@/components/credits/plan-pricing-page";
import { PricingFrame } from "@/components/credits/pricing-frame";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Plan & pricing · IDEEZA" };

export default function PlanPricingRoute() {
  return (
    <React.Suspense
      fallback={
        <PricingFrame crumbs={[{ label: "Settings" }, { label: "Plan & pricing" }]} title="Plan & pricing">
          <p className="text-md leading-md text-text-tertiary">Loading plan and pricing…</p>
        </PricingFrame>
      }
    >
      <PlanPricingPage />
    </React.Suspense>
  );
}
