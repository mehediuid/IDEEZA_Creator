// /settings/plan/checkout — Payment details: a plan upgrade
// (?plan=builder&cycle=monthly) or credits (?pack=pro, ?credits=80).
// `useSearchParams` inside needs a Suspense boundary.

import type { Metadata } from "next";
import * as React from "react";
import { CheckoutPage } from "@/components/credits/checkout-page";
import { PricingFrame } from "@/components/credits/pricing-frame";
import { PLAN_PRICING_HREF } from "@/lib/create/credit-pricing";

export const metadata: Metadata = { title: "Payment details · IDEEZA" };

export default function CheckoutRoute() {
  return (
    <React.Suspense
      fallback={
        <PricingFrame crumbs={[{ label: "Plan & pricing", href: PLAN_PRICING_HREF }, { label: "Payment details" }]} title="Payment details">
          <p className="text-md leading-md text-text-tertiary">Loading payment details…</p>
        </PricingFrame>
      }
    >
      <CheckoutPage />
    </React.Suspense>
  );
}
