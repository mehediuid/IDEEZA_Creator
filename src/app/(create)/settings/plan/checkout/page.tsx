// /settings/plan/checkout — Payment details: a plan upgrade
// (?plan=builder&cycle=monthly) or credits (?pack=pro, ?credits=80).
// `useSearchParams` inside needs a Suspense boundary.

import type { Metadata } from "next";
import * as React from "react";
import { CheckoutFallback, CheckoutPage } from "@/components/credits/checkout-page";

export const metadata: Metadata = { title: "Payment details · IDEEZA" };

export default function CheckoutRoute() {
  return (
    <React.Suspense fallback={<CheckoutFallback />}>
      <CheckoutPage />
    </React.Suspense>
  );
}
