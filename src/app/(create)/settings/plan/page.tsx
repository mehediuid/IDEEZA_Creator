// /settings/plan — Plan & pricing: Credits (default) and Billing history
// (?tab=billing). `useSearchParams` inside needs a Suspense boundary so the
// route shell pre-renders before the query is known.

import * as React from "react";
import { PlanPricingPage } from "@/components/credits/plan-pricing-page";

export default function PlanPricingRoute() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-md text-text-tertiary">Loading plan and pricing…</div>
      }
    >
      <PlanPricingPage />
    </React.Suspense>
  );
}
